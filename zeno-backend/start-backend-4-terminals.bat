@echo off
setlocal

set "ROOT=%~dp0"

set "DISCOVERY=%ROOT%discovery-server"
set "AUTH=%ROOT%auth-service"
set "CORE=%ROOT%core-service"
set "GATEWAY=%ROOT%api-gateway"

echo Checking service folders...
if not exist "%DISCOVERY%\mvnw.cmd" goto :missingDiscovery
if not exist "%AUTH%\mvnw.cmd" goto :missingAuth
if not exist "%CORE%\mvnw.cmd" goto :missingCore
if not exist "%GATEWAY%\mvnw.cmd" goto :missingGateway

echo.
echo Starting 4 backend services in separate terminals...
echo 1) discovery-server
start "discovery-server" cmd /k "cd /d "%DISCOVERY%" && mvnw.cmd spring-boot:run"

echo Waiting 10 seconds before next service...
timeout /t 10 /nobreak >nul

echo 2) auth-service
start "auth-service" cmd /k "cd /d "%AUTH%" && mvnw.cmd spring-boot:run"

echo Waiting 8 seconds before next service...
timeout /t 8 /nobreak >nul

echo 3) core-service
start "core-service" cmd /k "cd /d "%CORE%" && mvnw.cmd spring-boot:run"

echo Waiting 8 seconds before next service...
timeout /t 8 /nobreak >nul

echo 4) api-gateway
start "api-gateway" cmd /k "cd /d "%GATEWAY%" && mvnw.cmd spring-boot:run"

echo.
echo All startup commands sent.
echo Check each terminal for successful startup logs.
goto :eof

:missingDiscovery
echo Missing file: %DISCOVERY%\mvnw.cmd
goto :error

:missingAuth
echo Missing file: %AUTH%\mvnw.cmd
goto :error

:missingCore
echo Missing file: %CORE%\mvnw.cmd
goto :error

:missingGateway
echo Missing file: %GATEWAY%\mvnw.cmd
goto :error

:error
echo.
echo Startup aborted. Verify backend folder structure and try again.
pause
exit /b 1
