@echo off
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 start_preview.py
    goto done
)
python --version >nul 2>&1
if not errorlevel 1 (
    python start_preview.py
    goto done
)
echo Python 3 is required to start the local preview server.
echo Install Python from https://www.python.org/downloads/ and try again.
:done
pause
