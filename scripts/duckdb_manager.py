"""
📊 DuckDB Manager — Archi Cam AI
==================================
Journal analytique local de TOUS les événements du pipeline agentique.

DuckDB est une base OLAP embarquée (sans serveur) — parfaite pour :
  - Logger rendus, devis, erreurs, performances moteurs IA
  - Rechercher des projets similaires par ville/surface
  - Benchmarker les moteurs (Gemini, Replicate, OpenAI, OpenCV)
  - Alimenter le Dashboard avec des métriques temps réel

Usage :
  from scripts.duckdb_manager import DuckDBManager
  db = DuckDBManager()
  db.log_render({...})
  projets = db.get_similar_projects("Yaoundé", 80, 150)
"""

import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv(".env.local")

# Chemin de la base DuckDB (configurable via .env.local)
DUCKDB_PATH = os.environ.get(
    "DUCKDB_PATH",
    str(Path(__file__).parent.parent / "data" / "archi_cam_ai.duckdb")
)


def _get_db():
    """Retourne une connexion DuckDB, en créant le dossier si nécessaire."""
    try:
        import duckdb
        Path(DUCKDB_PATH).parent.mkdir(parents=True, exist_ok=True)
        return duckdb.connect(DUCKDB_PATH)
    except ImportError:
        raise ImportError(
            "DuckDB n'est pas installé. Exécutez : pip install duckdb"
        )


class DuckDBManager:
    """
    Gestionnaire central de la base analytique DuckDB pour Archi Cam AI.
    Thread-safe : chaque appel ouvre et ferme sa propre connexion.
    """

    def __init__(self):
        self._init_schema()

    def _init_schema(self):
        """Initialise toutes les tables si elles n'existent pas (idempotent)."""
        conn = _get_db()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id          VARCHAR PRIMARY KEY,
                    hash_plan   VARCHAR,
                    title       VARCHAR NOT NULL,
                    client      VARCHAR,
                    city        VARCHAR DEFAULT 'Yaoundé',
                    zone_pos    VARCHAR DEFAULT 'R2',
                    type_sol    VARCHAR DEFAULT 'Normal',
                    zone_climatique VARCHAR DEFAULT 'Tropicale',
                    total_m2    DOUBLE,
                    nb_rooms    INTEGER,
                    nb_floors   INTEGER DEFAULT 1,
                    okf_path    VARCHAR,
                    neo4j_node_id VARCHAR,
                    created_at  TIMESTAMP DEFAULT NOW()
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS renders (
                    id              VARCHAR PRIMARY KEY,
                    project_id      VARCHAR REFERENCES projects(id),
                    engine          VARCHAR NOT NULL,
                    engine_attempt  INTEGER DEFAULT 1,
                    duration_s      DOUBLE,
                    quality_score   DOUBLE,
                    image_path      VARCHAR,
                    prompt_used     VARCHAR,
                    error_message   VARCHAR,
                    is_fallback     BOOLEAN DEFAULT FALSE,
                    llm_mode        VARCHAR DEFAULT 'cloud',
                    created_at      TIMESTAMP DEFAULT NOW()
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS quotes (
                    id              VARCHAR PRIMARY KEY,
                    project_id      VARCHAR REFERENCES projects(id),
                    total_ht        DOUBLE,
                    tva             DOUBLE,
                    total_ttc       DOUBLE,
                    nb_rooms        INTEGER,
                    total_m2        DOUBLE,
                    city            VARCHAR,
                    type_sol        VARCHAR,
                    engine_source   VARCHAR DEFAULT 'crewai',
                    guardrail_passed BOOLEAN DEFAULT TRUE,
                    guardrail_warnings VARCHAR,
                    lines_json      VARCHAR,
                    created_at      TIMESTAMP DEFAULT NOW()
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS engine_metrics (
                    engine_name     VARCHAR PRIMARY KEY,
                    total_calls     INTEGER DEFAULT 0,
                    success_count   INTEGER DEFAULT 0,
                    error_count     INTEGER DEFAULT 0,
                    avg_duration_s  DOUBLE DEFAULT 0.0,
                    last_error      VARCHAR,
                    last_error_at   TIMESTAMP,
                    last_success_at TIMESTAMP,
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_usage (
                    user_id         VARCHAR NOT NULL,
                    usage_date      DATE DEFAULT TODAY(),
                    renders_count   INTEGER DEFAULT 0,
                    quote_count     INTEGER DEFAULT 0,
                    tokens_used     INTEGER DEFAULT 0,
                    PRIMARY KEY (user_id, usage_date)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS material_prices (
                    id              VARCHAR PRIMARY KEY,
                    material_code   VARCHAR NOT NULL,
                    material_label  VARCHAR NOT NULL,
                    price_fcfa      DOUBLE NOT NULL,
                    unit            VARCHAR DEFAULT 'Unité',
                    city            VARCHAR DEFAULT 'Yaoundé',
                    source          VARCHAR DEFAULT 'MINMAP',
                    reference_date  DATE DEFAULT TODAY(),
                    updated_at      TIMESTAMP DEFAULT NOW()
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_events (
                    id              VARCHAR PRIMARY KEY,
                    project_id      VARCHAR,
                    agent_name      VARCHAR NOT NULL,
                    event_type      VARCHAR NOT NULL,
                    step_index      INTEGER DEFAULT 0,
                    duration_ms     INTEGER,
                    llm_model       VARCHAR,
                    llm_mode        VARCHAR,
                    input_summary   VARCHAR,
                    output_summary  VARCHAR,
                    error_message   VARCHAR,
                    self_healing_attempt INTEGER DEFAULT 0,
                    created_at      TIMESTAMP DEFAULT NOW()
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS semantic_analyses (
                    id              VARCHAR PRIMARY KEY,
                    project_id      VARCHAR,
                    plan_hash       VARCHAR,
                    analyzer_used   VARCHAR NOT NULL,
                    rooms_json      VARCHAR,
                    furniture_json  VARCHAR,
                    plan_type       VARCHAR,
                    duration_ms     INTEGER,
                    shared_with     VARCHAR,
                    created_at      TIMESTAMP DEFAULT NOW()
                )
            """)

            # Initialiser les moteurs de rendu connus
            for engine in ["gemini", "replicate", "openai", "opencv_local"]:
                conn.execute("""
                    INSERT INTO engine_metrics (engine_name)
                    VALUES (?)
                    ON CONFLICT (engine_name) DO NOTHING
                """, [engine])

            conn.commit()
            print(f"[DuckDB] ✅ Schéma initialisé : {DUCKDB_PATH}")
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # PROJETS
    # ─────────────────────────────────────────────────────────────────────────

    def upsert_project(self, data: dict) -> str:
        """
        Crée ou met à jour un projet dans DuckDB.
        Retourne l'ID du projet.
        """
        conn = _get_db()
        try:
            project_id = data.get("id") or str(uuid.uuid4())
            conn.execute("""
                INSERT INTO projects (id, hash_plan, title, client, city, zone_pos,
                    type_sol, zone_climatique, total_m2, nb_rooms, nb_floors, okf_path, neo4j_node_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    total_m2 = COALESCE(EXCLUDED.total_m2, total_m2),
                    okf_path = COALESCE(EXCLUDED.okf_path, okf_path),
                    neo4j_node_id = COALESCE(EXCLUDED.neo4j_node_id, neo4j_node_id)
            """, [
                project_id,
                data.get("hash_plan"),
                data.get("title", "Projet Sans Titre"),
                data.get("client"),
                data.get("city", "Yaoundé"),
                data.get("zone_pos", "R2"),
                data.get("type_sol", "Normal"),
                data.get("zone_climatique", "Tropicale"),
                data.get("total_m2"),
                data.get("nb_rooms"),
                data.get("nb_floors", 1),
                data.get("okf_path"),
                data.get("neo4j_node_id"),
            ])
            conn.commit()
            return project_id
        finally:
            conn.close()

    def get_similar_projects(
        self,
        city: str,
        m2_min: float = 0,
        m2_max: float = 9999,
        type_sol: Optional[str] = None,
        limit: int = 5,
    ) -> list[dict]:
        """
        Recherche des projets historiques similaires pour enrichir un devis.
        """
        conn = _get_db()
        try:
            query = """
                SELECT p.id, p.title, p.city, p.total_m2, p.type_sol,
                       q.total_ttc, q.total_ht, q.created_at
                FROM projects p
                LEFT JOIN quotes q ON q.project_id = p.id
                WHERE p.city = ?
                  AND p.total_m2 BETWEEN ? AND ?
            """
            params = [city, m2_min, m2_max]
            if type_sol:
                query += " AND p.type_sol = ?"
                params.append(type_sol)
            query += " ORDER BY p.created_at DESC LIMIT ?"
            params.append(limit)

            result = conn.execute(query, params).fetchall()
            columns = ["id", "title", "city", "total_m2", "type_sol",
                       "total_ttc", "total_ht", "created_at"]
            return [dict(zip(columns, row)) for row in result]
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # RENDUS
    # ─────────────────────────────────────────────────────────────────────────

    def log_render(self, data: dict) -> str:
        """
        Enregistre un événement de rendu dans DuckDB.
        data doit contenir : project_id, engine, duration_s, image_path, ...
        """
        conn = _get_db()
        try:
            render_id = str(uuid.uuid4())
            engine = data.get("engine", "unknown")

            conn.execute("""
                INSERT INTO renders (id, project_id, engine, engine_attempt, duration_s,
                    quality_score, image_path, prompt_used, error_message, is_fallback, llm_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                render_id,
                data.get("project_id"),
                engine,
                data.get("engine_attempt", 1),
                data.get("duration_s"),
                data.get("quality_score"),
                data.get("image_path"),
                data.get("prompt_used", "")[:2000],  # Tronquer si trop long
                data.get("error_message"),
                data.get("is_fallback", False),
                data.get("llm_mode", "cloud"),
            ])

            # Mettre à jour les métriques du moteur
            is_success = data.get("error_message") is None
            self._update_engine_metrics(conn, engine, data.get("duration_s", 0), is_success,
                                        data.get("error_message"))
            conn.commit()
            print(f"[DuckDB] 📸 Rendu loggé: engine={engine}, succès={is_success}")
            return render_id
        finally:
            conn.close()

    def _update_engine_metrics(self, conn, engine_name: str, duration_s: float,
                               is_success: bool, error_msg: Optional[str]):
        """Met à jour les statistiques agrégées d'un moteur de rendu."""
        existing = conn.execute(
            "SELECT total_calls, avg_duration_s FROM engine_metrics WHERE engine_name = ?",
            [engine_name]
        ).fetchone()

        if existing:
            total = existing[0] + 1
            avg = (existing[1] * existing[0] + (duration_s or 0)) / total
            if is_success:
                conn.execute("""
                    UPDATE engine_metrics SET
                        total_calls = ?, success_count = success_count + 1,
                        avg_duration_s = ?, last_success_at = NOW(), updated_at = NOW()
                    WHERE engine_name = ?
                """, [total, avg, engine_name])
            else:
                conn.execute("""
                    UPDATE engine_metrics SET
                        total_calls = ?, error_count = error_count + 1,
                        avg_duration_s = ?, last_error = ?, last_error_at = NOW(), updated_at = NOW()
                    WHERE engine_name = ?
                """, [total, avg, error_msg, engine_name])
        else:
            conn.execute("""
                INSERT INTO engine_metrics (engine_name, total_calls, avg_duration_s)
                VALUES (?, 1, ?)
            """, [engine_name, duration_s or 0])

    # ─────────────────────────────────────────────────────────────────────────
    # DEVIS
    # ─────────────────────────────────────────────────────────────────────────

    def log_quote(self, data: dict) -> str:
        """
        Enregistre un résultat de devis dans DuckDB.
        data doit contenir : project_id, total_ht, tva, total_ttc, city, ...
        """
        conn = _get_db()
        try:
            quote_id = str(uuid.uuid4())
            conn.execute("""
                INSERT INTO quotes (id, project_id, total_ht, tva, total_ttc,
                    nb_rooms, total_m2, city, type_sol, engine_source,
                    guardrail_passed, guardrail_warnings, lines_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                quote_id,
                data.get("project_id"),
                data.get("total_ht"),
                data.get("tva"),
                data.get("total_ttc"),
                data.get("nb_rooms"),
                data.get("total_m2"),
                data.get("city", "Yaoundé"),
                data.get("type_sol", "Normal"),
                data.get("engine_source", "crewai"),
                data.get("guardrail_passed", True),
                data.get("guardrail_warnings"),
                json.dumps(data.get("lines", []), ensure_ascii=False)[:5000],
            ])
            conn.commit()
            print(f"[DuckDB] 💰 Devis loggé: TTC={data.get('total_ttc', 0):,.0f} FCFA")
            return quote_id
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # ANALYSES SÉMANTIQUES (Dédoublonnage LM Studio / Gemini)
    # ─────────────────────────────────────────────────────────────────────────

    def log_semantic_analysis(self, data: dict) -> str:
        """
        Enregistre une analyse sémantique (LM Studio ou Gemini) avec le hash du plan.
        Permet d'éviter de refaire l'analyse si le plan n'a pas changé.
        """
        conn = _get_db()
        try:
            analysis_id = str(uuid.uuid4())
            conn.execute("""
                INSERT INTO semantic_analyses (id, project_id, plan_hash, analyzer_used,
                    rooms_json, furniture_json, plan_type, duration_ms, shared_with)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                analysis_id,
                data.get("project_id"),
                data.get("plan_hash"),
                data.get("analyzer_used", "unknown"),
                json.dumps(data.get("rooms", []), ensure_ascii=False),
                json.dumps(data.get("furniture", []), ensure_ascii=False),
                data.get("plan_type"),
                data.get("duration_ms"),
                json.dumps(data.get("shared_with", []), ensure_ascii=False),
            ])
            conn.commit()
            return analysis_id
        finally:
            conn.close()

    def get_cached_analysis(self, plan_hash: str) -> Optional[dict]:
        """
        Récupère une analyse sémantique mise en cache par hash de plan.
        Évite de refaire l'analyse si le plan est identique (dédoublonnage LM/Gemini).
        """
        conn = _get_db()
        try:
            row = conn.execute("""
                SELECT id, analyzer_used, rooms_json, furniture_json, plan_type
                FROM semantic_analyses
                WHERE plan_hash = ?
                ORDER BY created_at DESC
                LIMIT 1
            """, [plan_hash]).fetchone()

            if not row:
                return None
            return {
                "id": row[0],
                "analyzer_used": row[1],
                "rooms": json.loads(row[2] or "[]"),
                "furniture": json.loads(row[3] or "[]"),
                "plan_type": row[4],
                "from_cache": True,
            }
        finally:
            conn.close()

    def log_user_usage(self, user_id: str, renders_inc: int = 1, quote_inc: int = 0):
        """Incrémente le compteur d'utilisation journalier d'un utilisateur dans DuckDB."""
        conn = _get_db()
        try:
            conn.execute("""
                INSERT INTO user_usage (user_id, usage_date, renders_count, quote_count)
                VALUES (?, TODAY(), ?, ?)
                ON CONFLICT (user_id, usage_date) DO UPDATE SET
                    renders_count = user_usage.renders_count + EXCLUDED.renders_count,
                    quote_count = user_usage.quote_count + EXCLUDED.quote_count
            """, [user_id, renders_inc, quote_inc])
            conn.commit()
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # ÉVÉNEMENTS AGENTS
    # ─────────────────────────────────────────────────────────────────────────

    def log_agent_event(self, data: dict) -> str:
        """
        Enregistre une étape de l'Orchestrateur (routing, self-healing, guardrail, etc.).
        """
        conn = _get_db()
        try:
            event_id = str(uuid.uuid4())
            conn.execute("""
                INSERT INTO agent_events (id, project_id, agent_name, event_type,
                    step_index, duration_ms, llm_model, llm_mode,
                    input_summary, output_summary, error_message, self_healing_attempt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                event_id,
                data.get("project_id"),
                data.get("agent_name", "orchestrator"),
                data.get("event_type", "step"),
                data.get("step_index", 0),
                data.get("duration_ms"),
                data.get("llm_model"),
                data.get("llm_mode", "auto"),
                str(data.get("input", ""))[:500],
                str(data.get("output", ""))[:500],
                data.get("error"),
                data.get("self_healing_attempt", 0),
            ])
            conn.commit()
            return event_id
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # PRIX MERCURIALE
    # ─────────────────────────────────────────────────────────────────────────

    def sync_material_prices(self, prices: list[dict]):
        """
        Synchronise les prix matériaux depuis Neo4j vers DuckDB (cache local).
        Permet des requêtes analytiques offline sans toucher Neo4j.
        """
        conn = _get_db()
        try:
            for price in prices:
                conn.execute("""
                    INSERT INTO material_prices (id, material_code, material_label,
                        price_fcfa, unit, city, source, reference_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (id) DO UPDATE SET
                        price_fcfa = EXCLUDED.price_fcfa,
                        updated_at = NOW()
                """, [
                    str(uuid.uuid4()),
                    price.get("code", ""),
                    price.get("label", ""),
                    price.get("price_fcfa", 0),
                    price.get("unit", "Unité"),
                    price.get("city", "Yaoundé"),
                    price.get("source", "MINMAP"),
                    price.get("date", datetime.now().strftime("%Y-%m-%d")),
                ])
            conn.commit()
            print(f"[DuckDB] 💹 {len(prices)} prix matériaux synchronisés.")
        finally:
            conn.close()

    def get_price_benchmark(self, material_code: str, city: str = "Yaoundé") -> Optional[dict]:
        """Récupère le prix benchmark d'un matériau pour une ville."""
        conn = _get_db()
        try:
            row = conn.execute("""
                SELECT material_label, price_fcfa, unit, source, reference_date
                FROM material_prices
                WHERE material_code = ? AND city = ?
                ORDER BY reference_date DESC
                LIMIT 1
            """, [material_code, city]).fetchone()
            if not row:
                return None
            return {
                "label": row[0], "price_fcfa": row[1],
                "unit": row[2], "source": row[3], "date": str(row[4])
            }
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # STATISTIQUES & DASHBOARD
    # ─────────────────────────────────────────────────────────────────────────

    def get_engine_stats(self) -> list[dict]:
        """Retourne les performances comparées de tous les moteurs de rendu."""
        conn = _get_db()
        try:
            rows = conn.execute("""
                SELECT engine_name, total_calls, success_count, error_count,
                       ROUND(avg_duration_s, 2) AS avg_duration_s,
                       CASE WHEN total_calls > 0
                            THEN ROUND(100.0 * success_count / total_calls, 1)
                            ELSE 0 END AS success_rate_pct,
                       last_error, last_success_at
                FROM engine_metrics
                ORDER BY success_rate_pct DESC
            """).fetchall()
            columns = ["engine", "total_calls", "success", "errors",
                       "avg_duration_s", "success_rate_pct", "last_error", "last_success_at"]
            return [dict(zip(columns, r)) for r in rows]
        finally:
            conn.close()

    def get_dashboard_summary(self) -> dict:
        """Retourne un résumé global pour le Dashboard Archi Cam AI."""
        conn = _get_db()
        try:
            nb_projects = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
            nb_renders = conn.execute("SELECT COUNT(*) FROM renders WHERE error_message IS NULL").fetchone()[0]
            nb_quotes = conn.execute("SELECT COUNT(*) FROM quotes").fetchone()[0]
            avg_ttc = conn.execute("SELECT AVG(total_ttc) FROM quotes WHERE total_ttc > 0").fetchone()[0]
            top_engine = conn.execute("""
                SELECT engine_name FROM engine_metrics
                WHERE total_calls > 0
                ORDER BY success_count DESC LIMIT 1
            """).fetchone()
            return {
                "nb_projects": nb_projects,
                "nb_renders_success": nb_renders,
                "nb_quotes": nb_quotes,
                "avg_quote_ttc_fcfa": round(avg_ttc or 0),
                "top_engine": top_engine[0] if top_engine else "N/A",
            }
        finally:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON GLOBAL (importable depuis partout)
# ─────────────────────────────────────────────────────────────────────────────

_db_instance: Optional[DuckDBManager] = None


def get_db_manager() -> DuckDBManager:
    """
    Retourne le singleton DuckDB Manager.
    Si DuckDB n'est pas installé, retourne un NoOpManager pour ne pas bloquer le pipeline.
    """
    global _db_instance
    if _db_instance is None:
        try:
            _db_instance = DuckDBManager()
        except ImportError:
            print("[DuckDB] ⚠️ DuckDB non disponible — logging désactivé (pipeline continue)")
            _db_instance = _NoOpDBManager()
    return _db_instance


class _NoOpDBManager:
    """
    Manager factice utilisé quand DuckDB n'est pas installé.
    Toutes les méthodes retournent des valeurs vides sans erreur.
    Respecte la Règle 4 : si DuckDB est indisponible, le pipeline continue.
    """
    def upsert_project(self, data): return str(uuid.uuid4())
    def log_render(self, data): return str(uuid.uuid4())
    def log_quote(self, data): return str(uuid.uuid4())
    def log_agent_event(self, data): return str(uuid.uuid4())
    def log_semantic_analysis(self, data): return str(uuid.uuid4())
    def get_cached_analysis(self, plan_hash): return None
    def get_similar_projects(self, *args, **kwargs): return []
    def get_engine_stats(self): return []
    def get_dashboard_summary(self): return {}
    def sync_material_prices(self, prices): pass
    def get_price_benchmark(self, *args, **kwargs): return None


# ─────────────────────────────────────────────────────────────────────────────
# TEST CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("📊 DuckDB Manager — Archi Cam AI (Test CLI)")
    print("=" * 55)
    print(f"   Base : {DUCKDB_PATH}\n")

    db = get_db_manager()

    # Test projet
    pid = db.upsert_project({
        "title": "Duplex R+1 — Test Yaoundé Bastos",
        "client": "Famille NDA",
        "city": "Yaoundé",
        "zone_pos": "R1",
        "type_sol": "Normal",
        "zone_climatique": "Tropicale",
        "total_m2": 145.0,
        "nb_rooms": 5,
        "nb_floors": 2,
    })
    print(f"✅ Projet créé : {pid}")

    # Test rendu
    db.log_render({
        "project_id": pid,
        "engine": "gemini",
        "duration_s": 8.4,
        "quality_score": 0.87,
        "image_path": "projects/test/render_final.png",
        "llm_mode": "cloud",
    })
    print("✅ Rendu loggé (gemini)")

    db.log_render({
        "project_id": pid,
        "engine": "opencv_local",
        "duration_s": 1.2,
        "quality_score": 0.65,
        "image_path": "projects/test/render_opencv.png",
        "is_fallback": True,
        "llm_mode": "local",
    })
    print("✅ Rendu loggé (opencv_local fallback)")

    # Test devis
    db.log_quote({
        "project_id": pid,
        "total_ht": 35_800_000,
        "tva": 6_891_750,
        "total_ttc": 42_691_750,
        "nb_rooms": 5,
        "total_m2": 145.0,
        "city": "Yaoundé",
        "type_sol": "Normal",
        "guardrail_passed": True,
    })
    print("✅ Devis loggé")

    # Métriques moteurs
    stats = db.get_engine_stats()
    print("\n📈 Métriques moteurs :")
    for s in stats:
        print(f"   {s['engine']:15s} | succès={s['success_rate_pct']}% | "
              f"durée moy.={s['avg_duration_s']}s | appels={s['total_calls']}")

    # Dashboard
    summary = db.get_dashboard_summary()
    print(f"\n📊 Dashboard Summary : {summary}")
