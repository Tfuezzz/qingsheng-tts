@echo off
setlocal EnableExtensions
set "APP_DIR=%~dp0"
set "VENV_PY=%APP_DIR%.venv\Scripts\python.exe"
set "SERVER=%APP_DIR%server.py"
set "REQ=%APP_DIR%requirements.txt"

pushd "%APP_DIR%" >nul 2>&1
if errorlevel 1 (
  echo Cannot open the application folder:
  echo %APP_DIR%
  pause
  exit /b 1
)

if not exist "%SERVER%" (
  echo Missing file: %SERVER%
  pause
  popd
  exit /b 1
)

where ffmpeg >nul 2>&1
if errorlevel 1 goto :no_ffmpeg

if exist "%VENV_PY%" (
  "%VENV_PY%" --version >nul 2>&1
  if errorlevel 1 (
    rmdir /s /q "%APP_DIR%.venv"
  )
)

if not exist "%VENV_PY%" (
  echo First-time setup. Please wait...
  where py >nul 2>&1
  if not errorlevel 1 (
    py -3 -m venv "%APP_DIR%.venv"
  ) else (
    where python >nul 2>&1
    if errorlevel 1 goto :no_python
    python -m venv "%APP_DIR%.venv"
  )
  if errorlevel 1 goto :setup_error
)

"%VENV_PY%" -c "import edge_tts" >nul 2>&1
if errorlevel 1 (
  echo Installing speech components...
  "%VENV_PY%" -m pip install --disable-pip-version-check -r "%REQ%"
  if errorlevel 1 goto :setup_error
)

echo Starting QingSheng...
"%VENV_PY%" "%SERVER%"
if errorlevel 1 (
  echo.
  echo The application stopped with an error.
  pause
)
popd
exit /b 0

:no_python
echo Python 3 was not found.
echo Double-click "安装运行环境.bat", then run this tool again.
pause
popd
exit /b 1

:no_ffmpeg
echo FFmpeg was not found.
echo Double-click "安装运行环境.bat", then run this tool again.
pause
popd
exit /b 1

:setup_error
echo.
echo Setup failed. Check the network connection and Python installation.
pause
popd
exit /b 1
