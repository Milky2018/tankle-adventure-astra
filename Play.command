#!/bin/sh
cd "$(dirname "$0")" || exit 1
exec moonx cli/serve@0.1.5 --port 8000 dist
