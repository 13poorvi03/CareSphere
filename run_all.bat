@echo off
echo ========================================================
echo Launching CareSphere (Backend + Frontend)
echo ========================================================

start "CareSphere Backend (FastAPI)" cmd /k "cd /d "%~dp0" && .\venv\Scripts\activate && uvicorn app.main:app --app-dir backend --reload --port 8000"

timeout /t 2 /nobreak >nul

start "CareSphere Frontend (React + Vite)" cmd /k "cd /d "%~dp0\frontend" && npm run dev"

echo.
echo ========================================================
echo Both services are starting!
echo.
echo - Frontend Dashboard:   http://localhost:5173
echo - Backend Swagger Docs: http://127.0.0.1:8000/docs
echo ========================================================
pause

