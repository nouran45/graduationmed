"""
Scenario runner.

    python -m security_pipeline.runner.orchestrator --batch pilot --plan pilot --time-scale 0.25
    python -m security_pipeline.runner.orchestrator --batch main  --plan full  --time-scale 1.0 --workers 24 --spread 2400
    python -m security_pipeline.runner.orchestrator --batch faults --plan faults        (server started with --fault ...)

Every instance of a scenario is one independent "run" with its own accounts and its own source IP.
Ground truth goes to datasets/raw/<batch>/ground_truth.jsonl and runs.jsonl.
"""
from __future__ import annotations

import argparse
import json
import random
import threading
import time
import traceback
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import httpx

from .. import common as C
from .scenarios_attack import ATTACKS
from .scenarios_normal import BENIGN_SCENARIOS, NORMAL
from .sim import GroundTruth, IPPool, Sim

SCENARIOS = {**NORMAL, **BENIGN_SCENARIOS, **ATTACKS}

PLANS = {
    # ~1,000 events: validates logging, labelling and the dataset builder
    "pilot": {"N-BROWSE": 8, "N-RX": 4, "N-NEW": 2, "N-PHARM": 3, "N-INV": 3, "N-OWNER": 1, "N-ADMIN": 1,
              "B-TYPO": 3, "B-BURST": 1, "B-RETRY": 2, "B-403": 2, "B-HEAVY": 2,
              "AUTH-1": 2, "AUTH-2": 1, "AUTH-3": 1, "AUTH-4": 1, "UA-1": 2, "UA-2": 2, "UA-3": 1, "UA-4": 1,
              "API-1": 1, "API-2": 1, "API-3": 1, "CS-1": 1},
    # calibrated from the pilot (events/run measured): ~12.7k normal, ~1.8k benign, ~2.6-2.9k events per attack class
    "full": {"N-BROWSE": 370, "N-RX": 190, "N-NEW": 80, "N-PHARM": 110, "N-INV": 110, "N-OWNER": 30, "N-ADMIN": 20,
             "B-TYPO": 45, "B-BURST": 8, "B-RETRY": 40, "B-403": 40, "B-HEAVY": 10,
             "AUTH-1": 30, "AUTH-2": 8, "AUTH-3": 24, "AUTH-4": 24, "UA-1": 25, "UA-2": 25, "UA-3": 22, "UA-4": 8,
             "API-1": 10, "API-2": 20, "API-3": 24, "CS-1": 12},
    # separate EVALUATION set: attacks that SUCCEED because a staging fault disabled one check
    "faults": {"N-BROWSE": 30, "N-RX": 20, "N-PHARM": 15, "N-INV": 10, "UA-1": 30, "UA-2": 25, "UA-3": 15, "CS-1": 15},
}


class Pools:
    """Thread-safe allocation of accounts (each run gets its own) and source IPs."""

    def __init__(self, pop):
        self.pop, self._i, self._lock, self.ips = pop, Counter(), threading.Lock(), IPPool()
        self.wrapped = Counter()

    def take(self, key, pool):
        with self._lock:
            i = self._i[key]
            self._i[key] += 1
        if i >= len(pool):
            self.wrapped[key] += 1
        return pool[i % len(pool)]


class Alloc:
    def __init__(self, pools: Pools, rng):
        self.p, self.rng, self.accounts = pools, rng, []

    def _rec(self, e):
        self.accounts.append(e.split("@")[0])
        return e

    def patient(self):
        return self._rec(self.p.take("patients", self.p.pop["patients"]))

    def attacker(self):
        return self._rec(self.p.take("attackers", self.p.pop["attackers"]))

    def victim(self):
        return self.rng.choice(self.p.pop["victims"])

    def staff(self, role):
        st = self.p.take(role, self.p.pop["staff"][role])
        self.accounts.append(st["email"].split("@")[0])
        return st

    def ghosts(self, n):
        return self.rng.sample(self.p.pop["ghosts"], n)

    def new_ip(self):
        return self.p.ips.next()


def run_one(job, base_url, gt, pools, pop, scale):
    run_id, name, offset, seed = job
    time.sleep(offset)
    rng = random.Random(seed)
    cls = ("normal" if name.startswith("N-") else "benign_operational_anomaly" if name.startswith("B-") else C.FAMILY_CLASS[name])
    run = {"run_id": run_id, "scenario": name, "family": name, "label_class": cls, "time_scale": scale}
    al = Alloc(pools, rng)
    s = Sim(base_url, pools.ips.next(), run, gt, scale, rng)
    run["t_start"], err = time.time(), None
    try:
        SCENARIOS[name](s, pop, rng, al)
    except Exception:                                   # noqa: BLE001 - a broken run must not stop the batch
        err = traceback.format_exc(limit=3)
    run.update(t_end=time.time(), n_requests=s.n, violations=s.violations, accounts=al.accounts, ip=s.ip, error=err)
    gt.run(run)
    s.close()
    return run


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True)
    ap.add_argument("--plan", choices=sorted(PLANS), required=True)
    ap.add_argument("--base-url", default="http://127.0.0.1:8000")
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--time-scale", type=float, default=1.0, help="1.0 = real time (use for the FINAL dataset). <1 = faster, distorts timing features")
    ap.add_argument("--spread", type=float, default=120, help="seconds over which run start times are spread")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--fraction", type=float, default=1.0, help="run only this share of the plan (every scenario keeps at least 1 run)")
    a = ap.parse_args()

    bd = C.batch_dir(a.batch)
    pop = json.loads((bd / "population.json").read_text())
    health = httpx.get(f"{a.base_url}/__staging/health", timeout=10).json()
    if health["batch"] != a.batch:
        raise SystemExit(f"server is running batch {health['batch']!r}, not {a.batch!r}")
    if (a.plan == "faults") != bool(health["faults"]):
        raise SystemExit("the 'faults' plan needs a server started with --fault ..., and ONLY that plan may run against one")
    if (bd / "ground_truth.jsonl").exists():
        raise SystemExit(f"{bd}/ground_truth.jsonl already exists: use a NEW batch name (batches are never appended to)")

    rng = random.Random(a.seed)
    jobs = []
    for name, n in PLANS[a.plan].items():
        for k in range(max(1, round(n * a.fraction))):
            jobs.append((f"{a.batch}-{name}-{k:04d}", name, rng.uniform(0, a.spread), rng.randrange(2**31)))
    rng.shuffle(jobs)
    print(f"{len(jobs)} runs, {a.workers} workers, time-scale {a.time_scale}, spread {a.spread}s")

    gt, pools = GroundTruth(bd), Pools(pop)
    t0, done = time.time(), []
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = [ex.submit(run_one, j, a.base_url, gt, pools, pop, a.time_scale) for j in jobs]
        for i, f in enumerate(futs, 1):
            done.append(f.result())
            if i % 25 == 0 or i == len(futs):
                print(f"  {i}/{len(futs)} runs finished ({time.time() - t0:.0f}s)")
    gt.close()

    errs = [r for r in done if r["error"]]
    print(f"\nfinished in {time.time() - t0:.0f}s: {sum(r['n_requests'] for r in done)} requests, {len(errs)} runs with errors")
    for r in errs[:5]:
        print("  ERROR in", r["run_id"], "\n", r["error"])
    wrapped = {k: v for k, v in pools.wrapped.items() if k in ("patients", "attackers")}
    if wrapped:
        print("  WARNING: account pools were exhausted and reused:", wrapped, "(increase --patients/--attackers on the server)")
    succ = sum(r["violations"] for r in done)
    print(f"successful authorization violations: {succ}  ({'EXPECTED in the fault batch' if a.plan == 'faults' else 'MUST be 0 on a correct build'})")
    (bd / "run_meta.json").write_text(json.dumps({"plan": a.plan, "time_scale": a.time_scale, "seed": a.seed, "workers": a.workers,
                                                  "spread": a.spread, "runs": len(done), "faults": health["faults"]}, indent=1))
    return 1 if errs else 0


if __name__ == "__main__":
    raise SystemExit(main())
