"""
One row per REQUEST (the `seq 0` record) for XGBoost.

Column groups
  f_*    known when the request ARRIVES: the request's route/role + the HISTORY of earlier requests
         (rolling windows per session, per source address and, for /login, per targeted account).
         Strictly past data: the request itself and anything after it never contribute.
  cur_*  known only AFTER the response (status, latency, authorization verdict, rule hits).
         Use f_* alone for a real-time (pre-response) detector, f_* + cur_* for post-response detection.
  label_class / label_binary / family / run_id / split / violation_succeeded / request_id / session_key / timestamp
         are labels and identifiers: NEVER features.
"""
from __future__ import annotations

import statistics
from collections import defaultdict, deque

from .. import common as C

GROUPS = ["auth", "inference", "history", "prescription", "pharmacy", "inventory", "admin", "security", "http"]
SENS = {"low": 0, "medium": 1, "high": 2}
FOREIGN = {"other_patient", "other_branch", "not_staff_of_branch", "not_staff_of_pharmacy",
           "no_membership", "insufficient_staff_role", "non_admin"}
RULES = ["AUTH-01", "HIST-01", "RX-01", "RX-02", "PHARM-01", "PHARM-02", "INV-01", "INV-02", "ADMIN-01"]


def _past(b, au):
    denied = [a for a in au if a.get("authorization_result") == "denied" or a["event_type"] == "auth.token.invalid"]
    return {
        "t": b["ts"], "status": b["status_code"], "ep": b["endpoint_template"], "sens": SENS[b["route_sensitivity"]],
        "denied": bool(denied), "target": next((a["target_ref"] for a in denied if a.get("target_ref")), None),
        "rl": any(a["event_type"] == "resource.rate_limited" for a in au),
        "login_fail": any(a["event_type"] == "auth.login.failure" for a in au),
        "login_attempt": any(a["event_type"].startswith("auth.login.") for a in au),
        "ip": b.get("ip_hash"), "subj": next((a["subject_id"] for a in au if a.get("subject_id")), None),
        "sess": b["session_key"],
    }


def _count(win, pred):
    return sum(1 for h in win if pred(h))


def build_rows(events: list, splits: dict) -> list:
    audit, bases = defaultdict(list), []
    for e in events:
        if e["seq"] == 0 and e["source"] == "middleware":
            bases.append(e)
        else:
            audit[e["request_id"]].append(e)
    bases.sort(key=lambda e: (e["ts"], e["request_id"]))

    sess_hist, ip_hist, subj_hist = defaultdict(list), defaultdict(deque), defaultdict(deque)
    rows = []
    for b in bases:
        t, key, ip, au = b["ts"], b["session_key"], b.get("ip_hash"), audit.get(b["request_id"], [])
        subject = next((a["subject_id"] for a in au if a.get("subject_id")), None) if b["endpoint_template"] == "/login" else None

        S = sess_hist[key]
        I = ip_hist[ip]
        while I and t - I[0]["t"] > 300:
            I.popleft()
        J = subj_hist[subject] if subject else deque()
        while J and t - J[0]["t"] > 900:
            J.popleft()
        s60, s300 = [h for h in S if t - h["t"] <= 60], [h for h in S if t - h["t"] <= 300]
        seq_t = [h["t"] for h in S[-5:]] + [t]
        gaps = [y - x for x, y in zip(seq_t, seq_t[1:])]
        i60 = [h for h in I if t - h["t"] <= 60]

        grp = b["event_type"].split(".")[0]
        f = {"f_grp_" + g: int(grp == g) for g in GROUPS}
        f.update({
            "f_method_post": int(b["method"] != "GET"), "f_sens": SENS[b["route_sensitivity"]],
            "f_role_anon": int(b["actor_role"] == "anonymous"), "f_role_patient": int(b["actor_role"] == "patient"),
            "f_role_admin": int(b["actor_role"] == "admin"), "f_is_staff": int(bool(b.get("staff_role"))),
            # --- session history
            "f_req_idx": len(S), "f_sess_age_s": round(t - S[0]["t"], 3) if S else 0.0,
            "f_dt_prev": round(gaps[-1], 3) if S else 3600.0,
            "f_dt_mean5": round(statistics.fmean(gaps), 3) if S else 3600.0,
            "f_dt_std5": round(statistics.pstdev(gaps), 3) if len(gaps) > 1 else 0.0,
            "f_n_60s": len(s60), "f_n_300s": len(s300),
            "f_n401_300s": _count(s300, lambda h: h["status"] == 401), "f_n403_300s": _count(s300, lambda h: h["status"] == 403),
            "f_n404_300s": _count(s300, lambda h: h["status"] == 404), "f_n429_300s": _count(s300, lambda h: h["status"] == 429),
            "f_n5xx_300s": _count(s300, lambda h: h["status"] >= 500),
            "f_err_rate_300s": round(_count(s300, lambda h: h["status"] >= 400) / len(s300), 4) if s300 else 0.0,
            "f_distinct_ep_300s": len({h["ep"] for h in s300}), "f_high_sens_300s": _count(s300, lambda h: h["sens"] == 2),
            "f_denied_300s": _count(s300, lambda h: h["denied"]),
            "f_distinct_denied_targets_300s": len({h["target"] for h in s300 if h["denied"] and h["target"]}),
            "f_rate_limited_300s": _count(s300, lambda h: h["rl"]),
            "f_sess_n_ips": len({h["ip"] for h in S} | {ip}),
            # --- source-address history
            "f_ip_n_60s": len(i60), "f_ip_n_300s": len(I),
            "f_ip_n401_300s": _count(I, lambda h: h["status"] == 401), "f_ip_n429_300s": _count(I, lambda h: h["status"] == 429),
            "f_ip_login_fail_300s": _count(I, lambda h: h["login_fail"]),
            "f_ip_distinct_subjects_300s": len({h["subj"] for h in I if h["login_attempt"] and h["subj"]}),
            "f_ip_n_sessions_300s": len({h["sess"] for h in I}),
            # --- targeted account history (only for /login; the account is known on arrival)
            "f_subj_login_fail_300s": _count([h for h in J if t - h["t"] <= 300], lambda h: h["login_fail"]),
            "f_subj_login_fail_900s": _count(J, lambda h: h["login_fail"]),
        })
        # --- post-response facts
        f.update({
            "cur_status": b["status_code"], "cur_status_class": b["status_code"] // 100, "cur_latency_ms": b["latency_ms"],
            "cur_n_audit": len(au),
            "cur_denied": int(any(a.get("authorization_result") == "denied" or a["event_type"] == "auth.token.invalid" for a in au)),
            "cur_rate_limited": int(any(a["event_type"] == "resource.rate_limited" for a in au)),
            "cur_token_invalid": int(any(a["event_type"] == "auth.token.invalid" for a in au)),
            "cur_login_failure": int(any(a["event_type"] == "auth.login.failure" for a in au)),
            "cur_allowed_foreign": int(any(a.get("authorization_result") == "allowed" and a.get("target_relation") in FOREIGN for a in au)),
        })
        f.update({"cur_rule_" + r.replace("-", "_"): int(any(a.get("rule_id") == r and a.get("authorization_result") == "denied" for a in au)) for r in RULES})

        row = dict(f)
        row.update({
            "label_class": b["label_class"], "label_binary": int(b["label_class"] in C.ATTACK_CLASSES), "family": b["family"],
            "run_id": b["run_id"], "split": splits.get(b["run_id"]), "violation_succeeded": int(b["violation_succeeded"]),
            "request_id": b["request_id"], "session_key": key,
            "timestamp": b["timestamp"].strftime("%Y-%m-%dT%H:%M:%S.") + f"{b['timestamp'].microsecond // 1000:03d}Z",
        })
        rows.append(row)

        rec = _past(b, au)
        S.append(rec)
        I.append(rec)
        if subject:
            subj_hist[subject].append(rec)
    return rows
