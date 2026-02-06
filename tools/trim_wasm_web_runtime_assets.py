#!/usr/bin/env python3
"""
Trim staged WASM runtime assets down to what the web frontend needs.

This is intended to be run against `build/wasm/bin` after staging so static hosts
don't need to serve a full `Data/` tree (which is already packed into hwengine.data).

Conventions (current repo):
- Web frontend expects a sibling `Data/` folder for UI assets (`web-frontend/assets.js`)
- Some optional Qt6 skins are loaded from `frontend-qt6/res/` via raw relative paths
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
from pathlib import Path


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _parse_qt_res_allowlist(assets_js: Path) -> set[str]:
    """
    Parse `raw:../frontend-qt6/res/<file>` entries from assets.js.
    Returns a set of file names (not paths).
    """
    text = _read_text(assets_js)
    allow = set()
    for m in re.finditer(r"raw:\.\./frontend-qt6/res/([^'\"\n\r]+)", text):
        allow.add(m.group(1).strip())
    return allow


def _should_keep_data_file(rel_posix: str) -> bool:
    # Minimal assets required by the web UI today.
    keep_exact = {
        "Data/misc/hedgewars.png",
        "Data/Graphics/Clouds.png",
        "Data/Graphics/Hedgehog.png",
        "Data/Graphics/botlevels.png",
        "Data/Graphics/star.png",
        # Optional UI audio (loaded by web-frontend/main.js, but non-fatal if missing).
        "Data/Sounds/roperelease.ogg",
        "Data/Sounds/steps.ogg",
        "Data/Music/main_theme.ogg",
    }

    if rel_posix in keep_exact:
        return True

    # Keep the entire name dictionary folder (tiny; used by name generator).
    if rel_posix.startswith("Data/Names/"):
        return True

    # Assets preloaded / used by weapon UI.
    if rel_posix.startswith("Data/Graphics/AmmoMenu/"):
        return True

    # Team editor icon pickers.
    if rel_posix.startswith("Data/Graphics/Hats/"):
        return True
    if rel_posix.startswith("Data/Graphics/Flags/"):
        return True
    if rel_posix.startswith("Data/Graphics/Graves/"):
        return True

    # Fort previews use `Forts/<name>-icon.png`.
    if rel_posix.startswith("Data/Forts/") and rel_posix.endswith("-icon.png"):
        return True

    return False


def _posix_rel(root: Path, p: Path) -> str:
    return p.relative_to(root).as_posix()


def _prune_tree(root: Path, keep_file_pred) -> tuple[int, int]:
    """
    Delete everything under `root` except files where keep_file_pred(rel_posix) is True.
    Returns (bytes_kept, bytes_deleted).
    """
    kept = 0
    deleted = 0

    if not root.exists():
        return (0, 0)

    for path in sorted(root.rglob("*"), reverse=True):
        if path.is_dir():
            # Remove empty directories.
            try:
                next(path.iterdir())
            except StopIteration:
                path.rmdir()
            continue

        rel = _posix_rel(root.parent, path)
        try:
            size = path.stat().st_size
        except OSError:
            size = 0

        if keep_file_pred(rel):
            kept += size
            continue

        try:
            path.unlink()
            deleted += size
        except OSError:
            # Best-effort; leave the file if it can't be removed.
            kept += size

    return kept, deleted


def _prune_frontend_qt6_res(res_dir: Path, allow_files: set[str]) -> tuple[int, int]:
    kept = 0
    deleted = 0

    if not res_dir.exists():
        return (0, 0)

    for p in sorted(res_dir.rglob("*"), reverse=True):
        if p.is_dir():
            try:
                next(p.iterdir())
            except StopIteration:
                p.rmdir()
            continue

        try:
            size = p.stat().st_size
        except OSError:
            size = 0

        if p.name in allow_files:
            kept += size
            continue

        try:
            p.unlink()
            deleted += size
        except OSError:
            kept += size

    return kept, deleted


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bin-dir", required=True, help="Path to build/wasm/bin")
    ap.add_argument("--repo-root", required=True, help="Repo root (for reading web-frontend/assets.js)")
    ap.add_argument("--dry-run", action="store_true", help="Don't delete, just report")
    args = ap.parse_args()

    bin_dir = Path(args.bin_dir).resolve()
    repo_root = Path(args.repo_root).resolve()

    data_dir = bin_dir / "Data"
    qt_res_dir = bin_dir / "frontend-qt6" / "res"
    assets_js = repo_root / "web-frontend" / "assets.js"

    if not assets_js.exists():
        raise SystemExit(f"Missing: {assets_js}")

    allow_qt = _parse_qt_res_allowlist(assets_js)
    if not allow_qt:
        raise SystemExit(f"No qt res allowlist entries parsed from: {assets_js}")

    if args.dry_run:
        print(f"[dry-run] Would prune {data_dir}")
        print(f"[dry-run] Would prune {qt_res_dir} to {len(allow_qt)} files")
        return 0

    kept_d, del_d = _prune_tree(data_dir, _should_keep_data_file)
    kept_q, del_q = _prune_frontend_qt6_res(qt_res_dir, allow_qt)

    print(f"Trimmed Data/: kept {kept_d} bytes, deleted {del_d} bytes")
    print(f"Trimmed frontend-qt6/res: kept {kept_q} bytes, deleted {del_q} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
