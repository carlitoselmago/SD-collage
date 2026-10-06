#!/bin/bash
# Starts the sd-turbo API on port 7863, listening on all interfaces.
# Point the reverse proxy to this port: both /prompt/... and /... paths work.
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
    python3 -m venv .venv || exit 1
fi
source .venv/bin/activate
pip install -q -r requirements.txt || exit 1

python server.py --host 0.0.0.0 --port 7863
