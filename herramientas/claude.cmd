@echo off
REM claude.cmd: acceso a Claude Code para la linea de comandos (la app de escritorio no lo pone en el PATH).
REM Lo copia instalar.ps1 del harness a %USERPROFILE%\.local\bin junto con claude-buscar.ps1.
REM Dentro de una sesion de Claude Code usa CLAUDE_CODE_EXECPATH (rapido); afuera busca el mas nuevo.
setlocal
if defined CLAUDE_CODE_EXECPATH if exist "%CLAUDE_CODE_EXECPATH%" goto conocido
set "CLAUDE_EXE="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0claude-buscar.ps1"`) do set "CLAUDE_EXE=%%i"
if not defined CLAUDE_EXE goto falta
if /i "%CLAUDE_EXE%"=="%~dp0claude.exe" goto falta
"%CLAUDE_EXE%" %*
exit /b %ERRORLEVEL%
:conocido
"%CLAUDE_CODE_EXECPATH%" %*
exit /b %ERRORLEVEL%
:falta
echo claude.cmd: no encontre Claude Code. Abri la app de escritorio de Claude una vez. 1>&2
exit /b 9009
