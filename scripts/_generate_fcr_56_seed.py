#!/usr/bin/env python3
"""Generate scripts/fcr_56_seed_ndc_payment_history.sql from ask_vs_received.csv.

- Reads ask_vs_received.csv at the repo root.
- Skips any row missing ask_price or received_price (per user spec).
- Normalizes the messy date formats (M/D/YYYY, D-Mon-YY, M/D/YY) into ISO.
- Emits batched JSONB calls to bulk_seed_ndc_payment_history(jsonb).
- Produces a single SQL file the user can run in the Supabase SQL editor.
"""

import csv
import json
import os
import re
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
CSV_PATH = os.path.join(ROOT, "ask_vs_received.csv")
OUT_PATH = os.path.join(ROOT, "scripts", "fcr_56_seed_ndc_payment_history.sql")

BATCH_SIZE = 400


MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}


def parse_date(raw):
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    # 27-Sep-21
    m = re.match(r"^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$", s)
    if m:
        d, mon, y = m.groups()
        mon_l = mon.lower()
        if mon_l not in MONTHS:
            return None
        year = int(y)
        if year < 100:
            year += 2000
        try:
            return datetime(year, MONTHS[mon_l], int(d)).strftime("%Y-%m-%d")
        except ValueError:
            return None
    # 9/28/2025 or 09/28/2025 or 1/31/24
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", s)
    if m:
        mo, d, y = m.groups()
        year = int(y)
        if year < 100:
            year += 2000
        try:
            return datetime(year, int(mo), int(d)).strftime("%Y-%m-%d")
        except ValueError:
            return None
    return None


def parse_decimal(raw):
    if raw is None:
        return None
    s = raw.strip().replace("$", "").replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_percentage(raw):
    if raw is None:
        return None
    s = raw.strip().replace("%", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def map_confidence(raw):
    s = (raw or "").strip().upper()
    return {"HIGH": 95.0, "MED": 75.0, "MEDIUM": 75.0, "LOW": 55.0}.get(s)


def main():
    rows_kept = []
    rows_skipped = 0

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ask = parse_decimal(row.get("ask_price"))
            received = parse_decimal(row.get("received_price"))
            ndc = (row.get("ndc") or "").strip()
            if ask is None or received is None or not ndc:
                rows_skipped += 1
                continue
            full_partial = (row.get("Full/partial") or "").strip().lower()
            rec = {
                "ndc": ndc,
                "productName": (row.get("product") or "").strip() or None,
                "manufacturer": (row.get("manufacturer") or "").strip() or None,
                "askPrice": ask,
                "receivedPrice": received,
                "pharmacyName": (row.get("Pharmacy Name") or "").strip() or None,
                "askDate": parse_date(row.get("Ask Date")),
                "receiveDate": parse_date(row.get("Receive Date")),
                "paymentMethod": (row.get("Method") or "").strip() or None,
                "isPartial": full_partial == "partial",
                "percentageReturned": parse_percentage(row.get("Percentage Returned")),
                "aiConfidence": map_confidence(row.get("Confidence")),
            }
            rec = {k: v for k, v in rec.items() if v is not None and v != ""}
            rows_kept.append(rec)

    batches = [rows_kept[i:i + BATCH_SIZE] for i in range(0, len(rows_kept), BATCH_SIZE)]

    out = []
    out.append("-- ============================================================")
    out.append("-- FCR 56 — Seed ndc_payment_history from ask_vs_received.csv")
    out.append("--")
    out.append(f"-- Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    out.append(f"-- Source rows:    {rows_kept[0].get('_n', '?') if rows_kept else 0}")
    out.append(f"-- Inserted rows:  {len(rows_kept)}")
    out.append(f"-- Skipped rows:   {rows_skipped}  (missing ask_price OR received_price)")
    out.append(f"-- Batch size:     {BATCH_SIZE}")
    out.append(f"-- Total batches:  {len(batches)}")
    out.append("--")
    out.append("-- Idempotency: this script appends history rows, so running it")
    out.append("-- twice will create duplicate observations. Run once at setup.")
    out.append("-- ============================================================")
    out.append("")
    out.append("BEGIN;")
    out.append("")

    for idx, batch in enumerate(batches, start=1):
        out.append(f"-- ── Batch {idx} / {len(batches)} ({len(batch)} rows) ──────────────────────")
        json_payload = json.dumps(batch, ensure_ascii=False)
        # Escape single quotes for SQL literal
        json_payload_sql = json_payload.replace("'", "''")
        out.append(
            "SELECT public.bulk_seed_ndc_payment_history(\n"
            f"  $seed${json_payload_sql}$seed$::jsonb\n"
            ");"
        )
        out.append("")

    out.append("COMMIT;")
    out.append("")
    out.append("-- Done. ndc_pricing intelligence aggregates have been recomputed")
    out.append("-- per-NDC inside bulk_seed_ndc_payment_history.")
    out.append("")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

    print(f"Wrote {OUT_PATH}")
    print(f"  inserted: {len(rows_kept)}")
    print(f"  skipped:  {rows_skipped}")
    print(f"  batches:  {len(batches)}")


if __name__ == "__main__":
    main()
