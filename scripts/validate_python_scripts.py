# scripts/validate_python_scripts.py
# ═══════════════════════════════════════════════════════════════
# VALIDATION PAR COMPILATION PY_COMPILE DE TOUS LES SCRIPTS PYTHON
# ═══════════════════════════════════════════════════════════════

import os
import sys
import io
import py_compile
from pathlib import Path

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_ROOT = Path(__file__).parent.parent.resolve()
_SCRIPTS_DIR = _ROOT / "scripts"

def validate_all_python_scripts():
    print("\n" + "═" * 60)
    print("  🐍 VÉRIFICATION DE COMPILATION DES SCRIPTS PYTHON")
    print("═" * 60)

    py_files = list(_SCRIPTS_DIR.glob("*.py"))
    if not py_files:
        print("  ⚠️ Aucun script Python trouvé dans scripts/")
        return 0

    errors = 0
    for py_file in py_files:
        try:
            py_compile.compile(str(py_file), doraise=True)
            print(f"  ✅ Compilation OK : scripts/{py_file.name}")
        except py_compile.PyCompileError as err:
            print(f"  ❌ Erreur dans scripts/{py_file.name}: {err}")
            errors += 1

    print("-" * 60)
    if errors == 0:
        print(f"  🏆 TOUS LES {len(py_files)} SCRIPTS PYTHON COMPILENT SANS ERREUR !")
    else:
        print(f"  ⚠️ {errors} fichier(s) Python contiennennent des erreurs de syntaxe.")

    print("═" * 60 + "\n")
    return 1 if errors > 0 else 0

if __name__ == "__main__":
    sys.exit(validate_all_python_scripts())
