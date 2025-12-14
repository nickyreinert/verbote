#!/usr/bin/env python3
"""Recursively convert TXT files from a source folder (default `.raw`) to
UTF-8 text files written under a destination folder (default `results/txt`),
preserving the original relative directory structure.

Usage:
  python3 scripts/convert_raw_txt.py --source .raw --dest results/txt [--dry-run]

The script tries to detect encoding using `chardet` or `charset_normalizer` when
available; otherwise it falls back to a sequence of common encodings and finally
to UTF-8 with replacement of invalid bytes.
"""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
from typing import Optional


def detect_encoding_with_libraries(raw: bytes) -> Optional[str]:
    try:
        import chardet

        res = chardet.detect(raw)
        enc = res.get("encoding")
        if enc:
            return enc
    except Exception:
        pass

    try:
        from charset_normalizer import from_bytes

        results = from_bytes(raw)
        if results:
            best = results.best()
            if best and best.encoding:
                return best.encoding
    except Exception:
        pass

    return None


def decode_bytes(raw: bytes) -> tuple[str, str]:
    # Try library detectors first
    enc = detect_encoding_with_libraries(raw)
    tried = []
    if enc:
        tried.append(enc)
        try:
            text = raw.decode(enc)
            return text, enc
        except Exception:
            pass

    # Try common encodings
    fallbacks = ["utf-8", "utf-8-sig", "cp1252", "iso-8859-1", "latin-1"]
    for e in fallbacks:
        if e in tried:
            continue
        try:
            text = raw.decode(e)
            return text, e
        except Exception:
            continue

    # As a last resort, decode with utf-8 and replace errors
    text = raw.decode("utf-8", errors="replace")
    return text, "utf-8-replace"


def process_file(src: Path, dst: Path, dry_run: bool = False, overwrite: bool = False) -> None:
    logging.debug("Processing %s -> %s", src, dst)
    if dst.exists() and not overwrite:
        logging.info("Skipping existing file %s (use --overwrite to force)", dst)
        return

    raw = src.read_bytes()
    text, encoding = decode_bytes(raw)

    # Normalize line endings and strip a leading BOM if present
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if text.startswith("\ufeff"):
        text = text.lstrip("\ufeff")

    if dry_run:
        logging.info("[DRY-RUN] %s  detected-encoding=%s  size=%d bytes", src, encoding, src.stat().st_size)
        return

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(text, encoding="utf-8")
    logging.info("Wrote %s (converted from %s)", dst, encoding)


def find_txt_files(root: Path):
    for p in root.rglob("*.txt"):
        yield p


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert TXT files under a source folder to UTF-8 into a destination folder while preserving structure.")
    parser.add_argument("--source", "-s", default=".raw", help="Source folder to scan for .txt files")
    parser.add_argument("--dest", "-d", default="programs/txt", help="Destination root folder")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without writing files")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite destination files if they exist")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(levelname)s: %(message)s")

    src_root = Path(args.source)
    dst_root = Path(args.dest)

    if not src_root.exists():
        logging.error("Source folder %s does not exist", src_root)
        raise SystemExit(1)

    files = list(find_txt_files(src_root))
    logging.info("Found %d .txt files under %s", len(files), src_root)

    for f in files:
        rel = f.relative_to(src_root)
        out_path = dst_root.joinpath(rel)
        process_file(f, out_path, dry_run=args.dry_run, overwrite=args.overwrite)


if __name__ == "__main__":
    main()
