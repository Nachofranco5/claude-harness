@echo off
rem Atajo a Codex CLI (npm -g de nvm, que no esta en el PATH). Lo dejo Claude el 2026-11-20.
setlocal
for /f "delims=" %%i in ('npm prefix -g') do set "NPMG=%%i"
if not exist "%NPMG%\codex.cmd" goto falta
"%NPMG%\codex.cmd" %*
exit /b %ERRORLEVEL%
:falta
echo No encuentro Codex. Instalalo con: npm install -g @openai/codex
exit /b 1
