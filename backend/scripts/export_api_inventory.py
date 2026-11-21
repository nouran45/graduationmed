"""
Phase 0 deliverable generator: an API inventory taken from the REAL route table.

    python -m scripts.export_api_inventory            # writes docs/phase0/generated/*
    python -m scripts.export_api_inventory --check    # exit 1 if any route is public that is not on the allow-list

Run it against the code you actually deploy and diff the result with
https://<your-space>.hf.space/openapi.json (set DOCS_ENABLED=true on STAGING)
to prove the deployed build matches this repository.
"""
import argparse
import json
import os
import sys

from fastapi.routing import APIRoute

# Public ON PURPOSE. Anything else that is public is a finding.
PUBLIC_ALLOW_LIST = {
    ("GET", "/"),
    ("POST", "/register"),
    ("POST", "/login"),
    ("GET", "/api/branches/public"),
    # teammate's product catalogue: patient-facing browsing, rate limited per IP
    ("GET", "/api/catalogue/products"),
    ("GET", "/api/catalogue/categories"),
    ("GET", "/api/catalogue/products/{listing_id}"),
    ("GET", "/api/catalogue/products/{listing_id}/offers"),
    ("GET", "/openapi.json"),
    ("GET", "/docs"),
}


def _walk(dependant):
    for d in dependant.dependencies:
        yield d.call
        yield from _walk(d)


def classify(route: APIRoute) -> str:
    calls = list(_walk(route.dependant))
    names = {getattr(c, "__qualname__", "") for c in calls}
    if any(n.startswith("require_admin") for n in names):
        return "admin"
    if any("branch_permission" in n for n in names):
        return "pharmacy staff (branch-verified)"
    if any(n.startswith(("get_current_user", "get_current_principal")) for n in names):
        return "authenticated"
    return "PUBLIC"


def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    from app import app  # imports the real application

    rows = []
    for r in app.routes:
        if isinstance(r, APIRoute):
            for m in sorted(r.methods - {"HEAD", "OPTIONS"}):
                rows.append((r.path, m, classify(r), r.name))
    rows.sort()

    unexpected = [(m, p) for p, m, a, _ in rows if a == "PUBLIC" and (m, p) not in PUBLIC_ALLOW_LIST]

    out = ["| Method | Path | Access | Handler |", "|---|---|---|---|"]
    out += [f"| {m} | `{p}` | {a} | `{n}` |" for p, m, a, n in rows]

    # repo-root docs/ (this file is backend/scripts/), independent of the working directory
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    outdir = os.path.join(repo_root, "docs", "phase0", "generated")
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, "endpoint_inventory.md"), "w", encoding="utf-8") as f:
        f.write("# Endpoint inventory (generated from the route table)\n\n" + "\n".join(out) + "\n")
    with open(os.path.join(outdir, "openapi.json"), "w", encoding="utf-8") as f:
        json.dump(app.openapi(), f, indent=2)

    print(f"{len(rows)} operations; public: {sum(1 for r in rows if r[2]=='PUBLIC')}")
    if unexpected:
        print("UNEXPECTED PUBLIC ROUTES:", unexpected)
        return 1 if args.check else 0
    print("No unexpected public routes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
