@echo off
setlocal

echo [1/4] Reversing backend port 8080...
adb reverse tcp:8080 tcp:8080
if errorlevel 1 goto :error

echo [2/4] Reversing Metro port 8083...
adb reverse tcp:8083 tcp:8083
if errorlevel 1 goto :error

echo [3/4] Current reverse mappings:
adb reverse --list
if errorlevel 1 goto :error

echo [4/4] Starting Expo in localhost mode...
npx expo start --localhost -c
goto :eof

:error
echo.
echo Failed to run one or more commands. Ensure:
echo - USB debugging is enabled
echo - Device is connected and authorized
echo - adb is available in PATH
pause
exit /b 1
