@echo off
echo Starting MapReduce Simulation Platform...
echo.

:: Start FastAPI backend in a new window
start "MapReduce Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && python main.py"

:: Wait a moment for backend to boot
timeout /t 3 /nobreak >nul

:: Start Next.js frontend
start "MapReduce Frontend (Next.js)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting...
echo   Backend API:  http://localhost:8000
echo   Frontend App: http://localhost:3000
echo   API Docs:     http://localhost:8000/docs
echo.
pause
