import subprocess, sys

scripts = [
    "scripts/master_plan_processor.py",
    "scripts/advanced_text_cleaner.py",
    "scripts/cache_manager.py",
    "scripts/multi_floor_processor.py",
    "scripts/export_formats.py",
]

results = {}
for s in scripts:
    r = subprocess.run([sys.executable, "-m", "py_compile", s], capture_output=True, text=True)
    results[s] = ("OK" if r.returncode == 0 else "FAIL: " + r.stderr.strip())

for k, v in results.items():
    print(f"  {v:60s} {k}")

all_ok = all("OK" in v for v in results.values())
print("\nRESULT:", "ALL_PY_COMPILE_OK" if all_ok else "SOME_FAILED")
