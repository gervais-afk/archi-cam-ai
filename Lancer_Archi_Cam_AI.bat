@echo off
title ARCHI CAM AI — Plateforme Agentique BTP & IA Cameroun
color 0A
setlocal enabledelayedexpansion

:: ============================================================
::   ARCHI CAM AI - LANCEMENT AGENTIQUE UNIFIE (5 TERMINAUX)
::   Architecture : Hybrid Cloud OpenRouter + Local-First OpenCV
:: ============================================================

echo.
echo  ===========================================================
echo   ARCHI CAM AI - DEMARRAGE SUITE AGENTIQUE (5 TERMINAUX)   
echo   Cloud OpenRouter + Sovereign Local Engine (OpenCV 2.5D)  
echo   RAG BTP (MINMAP 2026, BAEL 91, Urbanisme 2004/003)      
echo   Dashboard & Wallet Credits : http://localhost:3000        
echo  ===========================================================
echo.

:: Détection automatique du répertoire racine du projet
if exist "%~dp0package.json" (
    set "ROOT=%~dp0"
) else if exist "%~dp0archi-cameroun-ai\package.json" (
    set "ROOT=%~dp0archi-cameroun-ai"
) else (
    set "ROOT=%CD%"
)

:: Nettoyer le trailing backslash si présent
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo [INFO] Racine du projet detectee : %ROOT%
echo.

:: ---------------------------------------------------------
::  TERMINAL 1 : YOLO FastAPI Microservice (port 8000)
:: ---------------------------------------------------------
echo [1/5] Demarrage YOLO FastAPI Microservice (segmentation plans)...
start "YOLO T1 - FastAPI Segmentation" cmd /k "cd /d "%ROOT%\services\yolo_segmentation" && echo ======================================================= && echo   TERMINAL 1 : YOLO FastAPI MICROSERVICE && echo   Segmentation semantique des plans d'architecte && echo   ONNX Runtime CPU - Fallback OpenCV deterministe && echo   Port : http://localhost:8000 && echo ======================================================= && echo. && (if exist "%ROOT%\.venv\Scripts\python.exe" ("%ROOT%\.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000) else (python -m uvicorn main:app --host 0.0.0.0 --port 8000)) && pause"

timeout /t 2 /nobreak > nul

:: ---------------------------------------------------------
::  TERMINAL 2 : FastMCP Python Workers (Calculs BTP & IFC)
:: ---------------------------------------------------------
echo [2/5] Demarrage FastMCP Python Workers (MoteurCalculBTP)...
start "FastMCP T2 - Python Workers" cmd /k "cd /d "%ROOT%\fastmcp" && echo ======================================================= && echo   TERMINAL 2 : FASTMCP PYTHON WORKERS (BTP Engine) && echo   Outils : run_metreur, run_structure, run_economiste && echo            run_conducteur, run_architectural_crew && echo   Port : http://localhost:8001 (MCP Streamable HTTP) && echo ======================================================= && echo. && (if exist "%ROOT%\.venv\Scripts\fastmcp.exe" ("%ROOT%\.venv\Scripts\fastmcp.exe" run main.py:mcp --transport streamable-http --port 8001) else (fastmcp run main.py:mcp --transport streamable-http --port 8001)) && pause"

timeout /t 2 /nobreak > nul

:: ---------------------------------------------------------
::  TERMINAL 3 : Orchestrateur ADK + API Python
:: ---------------------------------------------------------
echo [3/5] Demarrage Orchestrateur Agent ADK...
start "ADK T3 - Orchestrateur Agents" cmd /k "cd /d "%ROOT%" && echo ======================================================= && echo   TERMINAL 3 : ORCHESTRATEUR ADK - Reseau d'Agents BTP && echo   Agents : Router, Designer, Engineer, Legal, PM && echo   API ADK  : http://localhost:8080 && echo ======================================================= && echo. && (if exist "%ROOT%\.venv\Scripts\adk.exe" ("%ROOT%\.venv\Scripts\adk.exe" web --port 8080 archi_agents) else (adk web --port 8080 archi_agents)) && pause"

timeout /t 2 /nobreak > nul

:: ---------------------------------------------------------
::  TERMINAL 4 : DuckDB + Neo4j GraphRAG BTP
:: ---------------------------------------------------------
echo [4/5] Verification DuckDB + Seed Neo4j GraphRAG BTP...
start "Neo4j T4 - DuckDB et GraphRAG" cmd /k "cd /d "%ROOT%" && echo ======================================================= && echo   TERMINAL 4 : DUCKDB ANALYTICS ET NEO4J GRAPHRAG && echo   Regles : POS Cameroun, BAEL 91, Mercuriale MINMAP 2026 && echo   Browser: http://localhost:7474 && echo ======================================================= && echo. && echo Initialisation de DuckDB... && (if exist "%ROOT%\.venv\Scripts\python.exe" ("%ROOT%\.venv\Scripts\python.exe" scripts\duckdb_manager.py) else (python scripts\duckdb_manager.py)) && echo. && echo Verification connectivite Neo4j... && (if exist "%ROOT%\.venv\Scripts\python.exe" ("%ROOT%\.venv\Scripts\python.exe" -c "from neo4j import GraphDatabase; d=GraphDatabase.driver('bolt://127.0.0.1:7687',auth=('neo4j','password123')); d.verify_connectivity(); print('[OK] Neo4j connecte'); d.close()") else (python -c "from neo4j import GraphDatabase; d=GraphDatabase.driver('bolt://127.0.0.1:7687',auth=('neo4j','password123')); d.verify_connectivity(); print('[OK] Neo4j connecte'); d.close()")) 2>nul || echo [INFO] Neo4j hors-ligne : mode fallback actif && echo. && echo [DONE] DuckDB pret. && pause"

timeout /t 2 /nobreak > nul

:: ---------------------------------------------------------
::  TERMINAL 5 : Frontend Next.js (Dashboard Archi Cam AI)
:: ---------------------------------------------------------
echo [5/5] Demarrage du Dashboard Web Next.js 14...
start "NextJS T5 - Dashboard Web" cmd /k "cd /d "%ROOT%" && echo ======================================================= && echo   TERMINAL 5 : DASHBOARD WEB ARCHI CAM AI (Next.js 14) && echo   Interface  : http://localhost:3000 && echo   Particulier: http://localhost:3000/dashboard/particulier && echo   Pro BIM    : http://localhost:3000/dashboard/pro && echo   Health     : http://localhost:3000/api/health && echo ======================================================= && echo. && npm run dev && pause"

timeout /t 5 /nobreak > nul

:: ---------------------------------------------------------
::  OUVERTURE AUTOMATIQUE DES INTERFACES WEB
:: ---------------------------------------------------------
echo.
echo  Ouverture des interfaces dans le navigateur...
timeout /t 2 /nobreak > nul

start http://localhost:3000
timeout /t 2 /nobreak > nul
start http://localhost:3000/api/health

echo.
echo  +-----------------------------------------------------------+
echo  ^|   TOUS LES SERVICES SONT EN COURS DE DEMARRAGE !         ^|
echo  +-----------------------------------------------------------+
echo  ^|   Dashboard Archi Cam AI : http://localhost:3000         ^|
echo  ^|   Health Check API       : http://localhost:3000/api/health ^|
echo  ^|   YOLO FastAPI           : http://localhost:8000/health  ^|
echo  ^|   FastMCP Workers        : http://localhost:8001         ^|
echo  ^|   ADK Agent API          : http://localhost:8080         ^|
echo  ^|   Neo4j Browser          : http://localhost:7474         ^|
echo  +-----------------------------------------------------------+
echo.
echo  Appuyez sur une touche pour fermer cette fenetre principale...
pause > nul
