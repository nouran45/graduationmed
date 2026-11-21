"""
List or delete the LOCAL staging databases created by `staging_server --db mongo`.

    python -m security_pipeline.staging_db list
    python -m security_pipeline.staging_db drop --batch pilot1

Only databases named medicheck_staging_<batch> / medicheck_security_staging_<batch> can be touched,
and only on a local MongoDB. The frozen files in datasets/ are never touched by this tool.
"""
from __future__ import annotations

import argparse
from urllib.parse import urlsplit

import pymongo

PREFIXES = ("medicheck_staging_", "medicheck_security_staging_")
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=["list", "drop"])
    ap.add_argument("--batch")
    ap.add_argument("--mongo-uri", default="mongodb://localhost:27017")
    a = ap.parse_args()

    if (urlsplit(a.mongo_uri).hostname or "").lower() not in LOCAL_HOSTS:
        raise SystemExit("local MongoDB only")
    client = pymongo.MongoClient(a.mongo_uri, serverSelectionTimeoutMS=4000)

    if a.action == "list":
        found = [n for n in client.list_database_names() if n.startswith(PREFIXES)]
        if not found:
            print("no staging databases")
        for n in sorted(found):
            db = client[n]
            counts = {c: db[c].estimated_document_count() for c in sorted(db.list_collection_names())}
            size_mb = db.command("dbstats")["storageSize"] / 1e6
            print(f"{n}  ({size_mb:.1f} MB)  {counts}")
        return

    if not a.batch:
        raise SystemExit("drop needs --batch NAME")
    for n in (f"medicheck_staging_{a.batch}", f"medicheck_security_staging_{a.batch}"):
        client.drop_database(n)
        print("dropped", n)


if __name__ == "__main__":
    main()
