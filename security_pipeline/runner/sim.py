"""
Simulated client with its own source IP, think-time and ground-truth recording.

Every request the simulator sends is written to ground_truth.jsonl together with the
SERVER-GENERATED X-Request-ID, the scenario run and the intended label. That request id is
the only link between ground truth and the security events: no label ever reaches the server.
"""
from __future__ import annotations

import base64
import io
import json
import math
import random
import threading
import time

import httpx

from .. import common as C


class GroundTruth:
    def __init__(self, batch_dir):
        self._req = open(batch_dir / "ground_truth.jsonl", "a", encoding="utf-8")
        self._runs = open(batch_dir / "runs.jsonl", "a", encoding="utf-8")
        self._lock = threading.Lock()

    def request(self, rec: dict) -> None:
        with self._lock:
            self._req.write(json.dumps(rec, separators=(",", ":")) + "\n")
            self._req.flush()

    def run(self, rec: dict) -> None:
        with self._lock:
            self._runs.write(json.dumps(rec, separators=(",", ":")) + "\n")
            self._runs.flush()

    def close(self) -> None:
        self._req.close()
        self._runs.close()


class IPPool:
    """Unique loopback source address per simulated client (127.x.y.z). Never reused within a batch."""

    def __init__(self, start: int = 256):
        self._n = start
        self._lock = threading.Lock()

    def next(self) -> str:
        with self._lock:
            while True:
                self._n += 1
                n = self._n
                if (n & 255) not in (0, 255):
                    return f"127.{(n >> 16) & 255}.{(n >> 8) & 255}.{n & 255}"


class Sim:
    def __init__(self, base_url: str, ip: str, run: dict, gt: GroundTruth, scale: float, rng: random.Random):
        self.base_url, self.ip, self.run, self.gt, self.scale, self.rng = base_url, ip, run, gt, scale, rng
        self.http = httpx.Client(base_url=base_url, timeout=120,
                                 transport=httpx.HTTPTransport(local_address=ip, retries=0))
        self.n = 0
        self.violations = 0
        self.root = self                      # counters live on the run's first client

    def child(self, ip: str) -> "Sim":
        """Another network location (another IP) belonging to the SAME run (e.g. a stolen session)."""
        s = Sim(self.base_url, ip, self.run, self.gt, self.scale, self.rng)
        s.root = self.root
        return s

    # ---------------------------------------------------------------- timing
    def think(self, base: float) -> None:
        """Human-like pause: log-normal around `base` seconds, multiplied by --time-scale."""
        time.sleep(max(0.01, self.rng.lognormvariate(math.log(max(base, 0.01)), 0.5)) * self.scale)

    def pause(self, seconds: float) -> None:
        time.sleep(max(0.0, seconds) * self.scale)

    # ---------------------------------------------------------------- requests
    def call(self, method: str, path: str, *, token: str | None = None, label: str = "normal",
             probe: bool = False, headers: dict | None = None, **kw) -> httpx.Response:
        """
        label : class of THIS request (normal | benign_operational_anomaly | an attack class)
        probe : the request tries to cross an authorization boundary (a 2xx would be a successful violation)
        """
        h = dict(headers or {})
        if token:
            h["Authorization"] = f"Bearer {token}"
        t0 = time.time()
        r = self.http.request(method, path, headers=h, **kw)
        if label == "normal" and r.status_code >= 500:
            # The mock models are the only source of 5xx: a failed model call is an operational anomaly.
            label = "benign_operational_anomaly"
        succeeded = bool(probe and 200 <= r.status_code < 300)
        self.root.violations += succeeded
        self.root.n += 1
        self.gt.request({
            "run_id": self.run["run_id"], "scenario": self.run["scenario"], "family": self.run["family"],
            "step": self.root.n, "label": label, "probe": probe, "violation_succeeded": succeeded,
            "t_sent": round(t0, 3), "method": method, "path": path.split("?")[0], "status": r.status_code,
            "request_id": r.headers.get("X-Request-ID"), "ip": self.ip,
        })
        return r

    def get(self, path, token=None, **kw):
        return self.call("GET", path, token=token, **kw)

    def post(self, path, token=None, **kw):
        return self.call("POST", path, token=token, **kw)

    def patch(self, path, token=None, **kw):
        return self.call("PATCH", path, token=token, **kw)

    # ---------------------------------------------------------------- helpers
    def login(self, email: str, password: str | None = None, label: str = "normal") -> str | None:
        r = self.post("/login", json={"email": email, "password": password or C.PASSWORD}, label=label)
        return r.json().get("access_token") if r.status_code == 200 else None

    def logout(self, token: str, label: str = "normal") -> None:
        self.post("/logout", token, label=label)

    def close(self) -> None:
        self.http.close()


# ------------------------------------------------------------------ payload library
PNG = base64.b64decode(     # a valid 1x1 PNG (Pillow can open and verify it)
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")

DIABETES = {"age": 45, "bmi": 27.5, "hypertension": 0, "heart_disease": 0, "smoking_history": 1,
            "blood_glucose_level": 120, "HbA1c_level": 5.6, "gender": 1}
KIDNEY = {"sex": 1, "age": 52, "bp": 80, "sg": 1.02, "al": 1, "su": 0, "bgr": 120, "bu": 36, "sc": 1.2, "sod": 138,
          "pot": 4.4, "hemo": 13.5, "pcv": 42, "wc": 7800, "rc": 5.2, "htn": 0, "dm": 0, "ane": 0, "pe": 0}
HEART = {"age": 54, "trestbps": 130, "chol": 240, "thalach": 150, "oldpeak": 1.0, "fbs": 0, "sex": 1, "cp": 0,
         "restecg": 0, "exang": 0, "slope": 1}
ANEMIA = {"gender": 1, "hemoglobin": 13.0, "mch": 28.0, "mchc": 33.0, "mcv": 88.0}

PREDICTORS = [
    ("/predict-diabetes", DIABETES), ("/predict-kidney", KIDNEY), ("/predict-heart", HEART),
    ("/predict-anemia", ANEMIA), ("/predict", None), ("/predict-skin-defense", None), ("/predict-fracture", None),
]


def predict(s: Sim, token: str, rng: random.Random, label: str = "normal", which=None):
    path, body = which or rng.choice(PREDICTORS)
    if body is None:
        return s.post(path, token, files={"file": ("scan.png", PNG, "image/png")}, label=label)
    return s.post(path, token, json=body, label=label)


def bomb_png() -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.new("1", (7000, 7000)).save(buf, "PNG")          # 49 Mpx, compresses to a few KB
    return buf.getvalue()
