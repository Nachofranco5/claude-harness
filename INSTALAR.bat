@echo off
REM Instala el harness de Nacho en esta PC (doble clic). Se puede repetir sin romper nada.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
IF ERRORLEVEL 1 GOTO error
GOTO fin
:error
echo.
echo Algo fallo: lee el mensaje en rojo de arriba.
:fin
pause
