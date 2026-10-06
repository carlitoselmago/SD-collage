@echo off
rem Starts the sd-turbo API on port 7863, listening on all interfaces.
rem Point the reverse proxy to this port: both /prompt/... and /... paths work.
cd /d "%~dp0"

if not exist .venv (
    python -m venv .venv || exit /b 1
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt || exit /b 1

python server.py --host 0.0.0.0 --port 7863
