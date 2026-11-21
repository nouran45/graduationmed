"""
Freeze the raw security events of a batch to datasets/raw/<batch>/events.jsonl (+ sha256).

    python -m security_pipeline.export_events --batch pilot

Run it WHILE the staging server of that batch is still running (it asks the server to dump
its own security_events collection; this works for both --db embedded and --db mongo).
Datasets are built from this frozen file, never from the live database.
"""
import argparse

import httpx

from . import common as C


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True)
    ap.add_argument("--base-url", default="http://127.0.0.1:8000")
    a = ap.parse_args()
    token = (C.batch_dir(a.batch) / ".staging_token").read_text().strip()
    r = httpx.get(f"{a.base_url}/__staging/export", params={"tok": token}, timeout=600).json()
    if "error" in r:
        raise SystemExit(r["error"])
    print(f"exported {r['events']} events -> {r['path']}")
    print(f"sha256 {r['sha256']}")
    print(f"sink: written={r['sink']['written']} dropped={r['sink']['dropped']} spilled={r['sink']['spilled']} "
          f"(dropped/spilled must be 0)")


if __name__ == "__main__":
    main()
