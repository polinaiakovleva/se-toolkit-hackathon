@echo off
echo Starting ContextTask AI Backend...
cd /d "%~dp0"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause