#!/usr/bin/env python3
"""
repl_sandbox.py — Archi Cam AI REPL Execution Engine (Python Sandbox)

Permet à l'agent IA d'exécuter des calculs financiers, géométriques et des métrés DQE
dans un bac à sable Python sécurisé.

Environnement pré-chargé :
  - pd (Pandas), np (NumPy), json, os, sys, math
  - query_sql(sql_str) : Connexion psycopg2 / SQLite à PostgreSQL
  - query_neo4j(cypher_str) : Connexion Bolt à Neo4j
  - load_csv(filename) : Helper pour lire un CSV du dossier data/
"""

import os
import sys
import json
import argparse
import io
import contextlib
import traceback
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Imports optionnels sécurisés
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False

try:
    import psycopg2
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False

# ─── Config & Connections ─────────────────────────────────────────────────────

NEO4J_URI      = os.getenv("NEO4J_URI",      "bolt://127.0.0.1:7687")
NEO4J_USER     = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

PG_HOST     = os.getenv("DB_HOST",     "127.0.0.1")
PG_PORT     = os.getenv("DB_PORT",     "5433")
PG_NAME     = os.getenv("DB_NAME",     "archi_cam_db")
PG_USER     = os.getenv("DB_USER",     "postgres")
PG_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

DATA_DIR = BASE_DIR / "data"

def get_neo4j_driver():
    if not NEO4J_AVAILABLE:
        raise RuntimeError("Driver neo4j non disponible")
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def query_neo4j(cypher: str, params: dict = None):
    driver = get_neo4j_driver()
    with driver.session() as session:
        res = session.run(cypher, params or {})
        records = [dict(rec) for rec in res]
    driver.close()
    return records

def query_sql(sql: str, params: tuple = None):
    if not POSTGRES_AVAILABLE:
        return []
    try:
        conn_str = f"host={PG_HOST} port={PG_PORT} dbname={PG_NAME} user={PG_USER} password={PG_PASSWORD}"
        conn = psycopg2.connect(conn_str)
        if PANDAS_AVAILABLE:
            df = pd.read_sql_query(sql, conn, params=params)
            conn.close()
            return df
        else:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                cols = [d[0] for d in cur.description] if cur.description else []
                rows = cur.fetchall()
            conn.close()
            return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        return [{"error": str(e)}]

def load_csv(filename: str):
    if not PANDAS_AVAILABLE:
        raise RuntimeError("Pandas non disponible")
    filepath = DATA_DIR / filename
    if not filepath.exists() and not filename.endswith(".csv"):
        filepath = DATA_DIR / f"{filename}.csv"
    if not filepath.exists():
        raise FileNotFoundError(f"Fichier CSV introuvable : {filename}")
    return pd.read_csv(filepath)

# ─── Sandbox Security ─────────────────────────────────────────────────────────

FORBIDDEN_KEYWORDS = [
    "import subprocess", "import shutil", "os.system", "os.popen",
    "os.remove", "os.rmdir", "shutil.rmtree", "__import__('os').system",
    "eval(", "exec("
]

def check_script_safety(script_code: str) -> tuple[bool, str]:
    for kw in FORBIDDEN_KEYWORDS:
        if kw in script_code:
            return False, f"Instruction interdite détectée par la Sandbox REPL : '{kw}'"
    return True, ""

def execute_in_sandbox(script_code: str) -> dict:
    is_safe, error_msg = check_script_safety(script_code)
    if not is_safe:
        return {"status": "BLOCKED", "output": "", "error": error_msg, "result": None}

    sandbox_globals = {
        "__builtins__": __builtins__,
        "os": os, "sys": sys, "json": json,
        "query_neo4j": query_neo4j,
        "query_sql": query_sql,
        "load_csv": load_csv,
    }
    if PANDAS_AVAILABLE: sandbox_globals["pd"] = pd
    if NUMPY_AVAILABLE:  sandbox_globals["np"] = np

    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    result_var = None

    try:
        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            exec(script_code, sandbox_globals)
            if "result" in sandbox_globals:
                result_var = sandbox_globals["result"]
            elif "output" in sandbox_globals:
                result_var = sandbox_globals["output"]

        output_text = stdout_capture.getvalue()
        stderr_text = stderr_capture.getvalue()

        serializable_result = None
        if result_var is not None:
            if PANDAS_AVAILABLE and isinstance(result_var, pd.DataFrame):
                serializable_result = result_var.head(50).to_dict(orient="records")
            else:
                try:
                    json.dumps(result_var)
                    serializable_result = result_var
                except TypeError:
                    serializable_result = str(result_var)

        return {
            "status": "SUCCESS",
            "output": output_text.strip(),
            "stderr": stderr_text.strip(),
            "result": serializable_result,
            "error": None,
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "output": stdout_capture.getvalue().strip(),
            "stderr": stderr_capture.getvalue().strip(),
            "error": f"{type(e).__name__}: {str(e)}",
            "traceback": traceback.format_exc(),
            "result": None,
        }

def main():
    parser = argparse.ArgumentParser(description="Archi Cam AI REPL Sandbox")
    parser.add_argument("--script", help="Script Python à exécuter")
    parser.add_argument("--input",  help="Fichier JSON d'entrée")
    parser.add_argument("--output", help="Fichier JSON de sortie")
    args = parser.parse_args()

    script_code = ""
    if args.script:
        script_code = args.script
    elif args.input:
        with open(args.input, encoding="utf-8") as f:
            data = json.load(f) if args.input.endswith(".json") else {"script": f.read()}
            script_code = data.get("script", "")

    if not script_code.strip():
        print(json.dumps({"status": "ERROR", "error": "Aucun script fourni à la Sandbox REPL"}))
        sys.exit(1)

    result = execute_in_sandbox(script_code)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
