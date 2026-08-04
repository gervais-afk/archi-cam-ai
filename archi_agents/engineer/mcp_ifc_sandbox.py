import sys
import traceback
from typing import Dict, Any, Callable
from archi_agents.engineer.ifc_hybrid_parser import IFCHybridParser

class MCPIFCSandbox:
    """
    Couche d'Exécution Sécurisée (REPL Sandbox) avec Isolations de Sécurité et Boucle 
    de Rétroaction Auto-Débogage (Retry-and-Refine) selon les normes Witan Labs & Google 2026.
    """
    def __init__(self, parser: IFCHybridParser, max_retries: int = 3, max_output_chars: int = 8000):
        self.parser = parser
        self.max_retries = max_retries
        self.max_output_chars = max_output_chars # Troncature à ~2000 tokens

    def _get_safe_globals(self) -> Dict[str, Any]:
        """
        Sécurité REPL : Construit un environnement global restreint.
        Interdit les appels système dangereux (os.system, subprocess, socket, etc.).
        """
        safe_builtins = dict(__builtins__)
        # Suppression des fonctions potentiellement malveillantes
        for dangerous_func in ["exec", "eval", "compile", "open", "__import__"]:
            safe_builtins.pop(dangerous_func, None)

        return {
            "__builtins__": safe_builtins,
            "parser": self.parser,
            "abs": abs,
            "len": len,
            "max": max,
            "min": min,
            "sum": sum,
            "round": round,
            "float": float,
            "int": int,
            "str": str,
            "list": list,
            "dict": dict
        }

    def _truncate_output(self, output: Any) -> Any:
        """Tronque la sortie si elle dépasse la limite de sécurité (max 2000 tokens)."""
        output_str = str(output)
        if len(output_str) > self.max_output_chars:
            truncated = output_str[:self.max_output_chars] + f"\n... [TRONQUÉ : Réponse limitée à {self.max_output_chars} caractères pour éviter la saturation du contexte]"
            return truncated
        return output

    def execute_with_auto_refine(self, code_generator_func: Callable[[str, str], str], user_query: str) -> Dict[str, Any]:
        """
        Exécute de manière itérative la génération et l'exécution du code/SQL REPL.
        En cas d'erreur, renvoie la trace de l'erreur au LLM pour correction.
        """
        error_log = ""
        for attempt in range(1, self.max_retries + 1):
            try:
                # Le LLM génère le script REPL
                sql_or_code = code_generator_func(user_query, error_log)

                # 1. Traitement des requêtes SQL
                if sql_or_code.strip().upper().startswith("SELECT"):
                    results = self.parser.execute_sql_query(sql_or_code)
                    truncated_results = self._truncate_output(results)
                    return {
                        "status": "success",
                        "attempt": attempt,
                        "query_executed": sql_or_code,
                        "data": truncated_results
                    }
                else:
                    # 2. Traitement des scripts REPL Python sécurisés
                    safe_globals = self._get_safe_globals()
                    local_scope = {"results": None}
                    
                    exec(sql_or_code, safe_globals, local_scope)
                    
                    results = local_scope.get("results")
                    truncated_results = self._truncate_output(results)
                    return {
                        "status": "success",
                        "attempt": attempt,
                        "query_executed": sql_or_code,
                        "data": truncated_results
                    }

            except Exception as e:
                error_trace = traceback.format_exc()
                # Troncature du log d'erreur
                truncated_trace = self._truncate_output(error_trace)
                error_log = f"Tentative {attempt} échouée. Erreur: {str(e)}\nTrace: {truncated_trace}"
                print(f"[REPL Sandbox Auto-Refine Alert] {error_log}")

        return {
            "status": "failed",
            "attempts": self.max_retries,
            "last_error": error_log
        }
