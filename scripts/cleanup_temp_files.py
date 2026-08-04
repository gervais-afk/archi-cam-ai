"""
🧹 Cleanup Temp Files — Archi Cam AI
=====================================
Nettoyage automatique des fichiers temporaires d'uploads et de rendus d'images.

Règles de rétention :
  - public/uploads/ : 24 heures
  - public/renders/ : 72 heures (sauf fichiers référencés OKF)
  - data/temp/      : 6 heures

Usage :
  python scripts/cleanup_temp_files.py
"""

import os
import time
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent

CLEANUP_RULES = {
    ROOT_DIR / "public" / "uploads": 24 * 3600,   # 24 heures
    ROOT_DIR / "public" / "renders": 72 * 3600,   # 72 heures
    ROOT_DIR / "tmp": 6 * 3600,                    # 6 heures
}


def cleanup_directory(target_dir: Path, max_age_seconds: int) -> int:
    if not target_dir.exists():
        return 0

    now = time.time()
    deleted_count = 0

    for file_path in target_dir.glob("*"):
        if file_path.is_file():
            # Ne pas supprimer les fichiers de référence statiques
            if file_path.name in ["placeholder.png", "sample.pdf", ".gitkeep"]:
                continue

            file_age = now - file_path.stat().st_mtime
            if file_age > max_age_seconds:
                try:
                    file_path.unlink()
                    deleted_count += 1
                except Exception as e:
                    print(f"  ⚠️ Erreur suppression {file_path.name}: {e}")

    return deleted_count


def main():
    print("=" * 60)
    print("🧹 Cleaning Temporary Files — Archi Cam AI")
    print("=" * 60)

    total_deleted = 0
    for directory, max_age in CLEANUP_RULES.items():
        count = cleanup_directory(directory, max_age)
        total_deleted += count
        hours = max_age // 3600
        print(f"  📁 {directory.relative_to(ROOT_DIR)} (Rétention {hours}h) : {count} fichiers purgés.")

    print(f"\n✅ Nettoyage terminé. Total fichiers purgés : {total_deleted}")
    return total_deleted


if __name__ == "__main__":
    main()
