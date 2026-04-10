#!/usr/bin/env python3
"""
Fetch Sarah McIntyre's publications from the ORCID public API
and write a clean publications.json to the repo root.

No authentication required — this reads a public ORCID profile.
Run locally:  python .github/scripts/process_orcid.py
"""

import json
import sys
import urllib.request

ORCID_ID = "0000-0002-0544-6533"
API_URL = f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"
OUTPUT_FILE = "docs/publications.json"


def fetch_orcid():
    req = urllib.request.Request(
        API_URL,
        headers={"Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def extract_doi(external_ids):
    """Return DOI string or None from an external-ids block."""
    if not external_ids:
        return None
    for eid in external_ids.get("external-id", []):
        if eid.get("external-id-type") == "doi":
            val = eid.get("external-id-value", "").strip()
            if val:
                return val
    return None


def best_summary(work_summaries):
    """
    Pick the preferred work-summary from a group, falling back to the first.
    ORCID groups duplicate entries; each group represents one distinct work.
    Prefer display-index == "1" (ORCID-preferred) or Crossref-sourced entries.
    """
    for ws in work_summaries:
        source_name = (
            ws.get("source", {})
              .get("source-name", {})
              .get("value", "")
        )
        if ws.get("display-index") == "1" or source_name == "Crossref":
            return ws
    return work_summaries[0]


def parse_year(pub_date):
    if not pub_date:
        return None
    year_block = pub_date.get("year")
    if year_block:
        try:
            return int(year_block.get("value", 0))
        except (ValueError, TypeError):
            pass
    return None


def parse_pub(ws):
    """Extract a clean publication dict from a work-summary."""
    title_block = ws.get("title") or {}
    title_val = (title_block.get("title") or {}).get("value", "").strip()
    if not title_val:
        return None

    journal_block = ws.get("journal-title") or {}
    journal = (
        journal_block.get("value", "").strip()
        if isinstance(journal_block, dict)
        else ""
    )

    year = parse_year(ws.get("publication-date"))

    doi = extract_doi(ws.get("external-ids"))

    if doi:
        url = f"https://doi.org/{doi}"
    else:
        work_url = ws.get("url")
        if isinstance(work_url, dict):
            url = work_url.get("value", "").strip() or None
        elif work_url:
            url = str(work_url).strip() or None
        else:
            path = ws.get("path", "")
            url = f"https://orcid.org/{ORCID_ID}{path}" if path else None

    pub = {
        "title": title_val,
        "journal": journal,
        "year": year,
    }
    if doi:
        pub["doi"] = doi
    if url:
        pub["url"] = url

    return pub


def main():
    print(f"Fetching ORCID works for {ORCID_ID} ...")
    try:
        data = fetch_orcid()
    except Exception as exc:
        print(f"ERROR: Failed to fetch ORCID data: {exc}", file=sys.stderr)
        sys.exit(1)

    groups = data.get("group", [])
    print(f"Found {len(groups)} work group(s).")

    publications = []
    for group in groups:
        summaries = group.get("work-summary", [])
        if not summaries:
            continue
        ws = best_summary(summaries)
        pub = parse_pub(ws)
        if pub and pub.get("title"):
            publications.append(pub)

    # Sort descending by year; entries with unknown year sort to the bottom.
    publications.sort(key=lambda p: p.get("year") or 0, reverse=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
        json.dump(publications, fh, ensure_ascii=False, indent=2)

    print(f"Wrote {len(publications)} publication(s) to {OUTPUT_FILE}.")


if __name__ == "__main__":
    main()
