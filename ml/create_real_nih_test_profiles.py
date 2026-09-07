from __future__ import annotations
from pathlib import Path
import csv, gzip

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data" / "authoritative_dmd"
OUT_DIR = ROOT / "ml" / "test_profiles"
OUT_DIR.mkdir(parents=True, exist_ok=True)
SERIES = DATA_DIR / "GSE38417_series_matrix.txt.gz"

def parse_series_matrix(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"{path} was not found. Run V20.1.2 training first.")
    sample_titles = []
    table_lines = []
    in_table = False
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\r\n")
            if line.startswith("!Sample_title"):
                sample_titles = next(csv.reader([line], delimiter="\t", quotechar='"'))[1:]
            elif line.startswith("!series_matrix_table_begin"):
                in_table = True
            elif line.startswith("!series_matrix_table_end"):
                break
            elif in_table and line:
                table_lines.append(line)
    if not table_lines:
        raise RuntimeError("No expression table found in GSE38417 series matrix.")
    reader = csv.reader(table_lines, delimiter="\t", quotechar='"')
    header = next(reader)
    sample_ids = header[1:]
    if len(sample_titles) != len(sample_ids):
        sample_titles = sample_ids
    probes = []
    cols = [[] for _ in sample_ids]
    for row in reader:
        if len(row) < len(sample_ids) + 1:
            continue
        probes.append(row[0])
        for i, v in enumerate(row[1:1+len(sample_ids)]):
            cols[i].append(v)
    return probes, sample_ids, sample_titles, cols

def find_sample(sample_ids, target):
    for i, sid in enumerate(sample_ids):
        if sid == target:
            return i
    raise RuntimeError(f"Sample {target} not found in GSE38417.")

def write_profile(probes, values, out: Path):
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["probe_id", "expression"])
        for p, v in zip(probes, values):
            w.writerow([p, v])

def main():
    probes, sample_ids, sample_titles, cols = parse_series_matrix(SERIES)
    targets = [
        ("GSM941830", "CONTROL", "GSE38417_CONTROL_GSM941830.csv"),
        ("GSM941836", "DMD", "GSE38417_DMD_GSM941836.csv"),
    ]
    created = []
    for gsm, label, filename in targets:
        idx = find_sample(sample_ids, gsm)
        out = OUT_DIR / filename
        write_profile(probes, cols[idx], out)
        created.append((label, gsm, sample_titles[idx], out, len(probes)))

    with (OUT_DIR / "README_TEST_PROFILES.txt").open("w", encoding="utf-8") as f:
        f.write("DMD-AI real NIH/NCBI GEO test profiles\n\n")
        f.write("These files were extracted from the official GSE38417 series matrix already downloaded during V20.1.2.\n")
        f.write("They are for end-to-end research software testing only.\n")
        f.write("GSE38417 was already used as external validation, so this is NOT a new independent validation cohort.\n\n")
        for label, gsm, title, out, n in created:
            f.write(f"{label}: {gsm} | {title} | {n} probes | {out.name}\n")

    print("\n============================================================")
    print("  DMD-AI REAL NIH/NCBI TEST PROFILES CREATED")
    print("============================================================")
    for label, gsm, title, out, n in created:
        print(f"{label}: {gsm}")
        print(f"  GEO title: {title}")
        print(f"  probes: {n}")
        print(f"  file: {out}")
    print("\nUse these files in Clinical Portal -> ML Model.")
    print("IMPORTANT: This verifies the end-to-end inference path,")
    print("not a new independent validation cohort.")

if __name__ == "__main__":
    main()
