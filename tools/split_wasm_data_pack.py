#!/usr/bin/env python3
import argparse
import math
import os
from pathlib import Path


def split_file(src: Path, chunk_bytes: int, delete_original: bool) -> list[Path]:
    if chunk_bytes <= 0:
        raise ValueError("chunk_bytes must be > 0")

    size = src.stat().st_size
    if size == 0:
        return []

    parts = int(math.ceil(size / float(chunk_bytes)))
    out_paths: list[Path] = []

    with src.open("rb") as f:
        for i in range(parts):
            out_path = src.with_name(src.name + f".part{i}")
            with out_path.open("wb") as out:
                remaining = chunk_bytes
                while remaining > 0:
                    buf = f.read(min(1024 * 1024, remaining))
                    if not buf:
                        break
                    out.write(buf)
                    remaining -= len(buf)
            out_paths.append(out_path)

    if delete_original:
        src.unlink()

    return out_paths


def main() -> int:
    ap = argparse.ArgumentParser(description="Split an Emscripten .data pack into .partN chunks.")
    ap.add_argument("--input", required=True, help="Path to .data file to split")
    ap.add_argument("--chunk-mb", type=int, default=50, help="Chunk size in MB (default: 50)")
    ap.add_argument("--delete-original", action="store_true", help="Delete original .data after splitting")
    args = ap.parse_args()

    src = Path(args.input)
    if not src.exists():
        raise SystemExit(f"input not found: {src}")

    chunk_bytes = int(args.chunk_mb) * 1024 * 1024
    out = split_file(src, chunk_bytes, args.delete_original)
    for p in out:
        print(str(p))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

