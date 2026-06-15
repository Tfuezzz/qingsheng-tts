@echo off
setlocal EnableExtensions
chcp 65001 >nul

where winget >nul 2>&1
if errorlevel 1 (
  echo 未找到 winget。
  echo 请从 Microsoft Store 安装“应用安装程序”，
  echo 或手动安装 Python 3.12 和 FFmpeg。
  pause
  exit /b 1
)

where py >nul 2>&1
if errorlevel 1 (
  echo 正在安装 Python 3.12...
  winget install --id Python.Python.3.12 --exact --accept-package-agreements --accept-source-agreements
  if errorlevel 1 goto :failed
) else (
  echo 已检测到 Python。
)

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo 正在安装 FFmpeg...
  winget install --id Gyan.FFmpeg --exact --accept-package-agreements --accept-source-agreements
  if errorlevel 1 goto :failed
) else (
  echo 已检测到 FFmpeg。
)

echo.
echo 运行环境安装完成。
echo 请关闭此窗口，然后双击“启动工具.bat”。
pause
exit /b 0

:failed
echo.
echo 安装失败，请检查网络或改为手动安装。
pause
exit /b 1
