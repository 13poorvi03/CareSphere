@echo off
echo ========================================================
echo Starting CareSphere FastAPI Backend...
echo ========================================================
cd /d "%~dp0"
call .\venv\Scripts\activate
uvicorn app.main:app --app-dir backend --reload --port 8000
pause

