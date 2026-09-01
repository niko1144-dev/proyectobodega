@echo off
title ESTADO DEL SERVICIO ITAM CHILEATIENDE
echo ========================================================
echo   ESTADO DEL SERVICIO WINDOWS ITAM CHILEATIENDE
echo ========================================================
echo.
sc query itam_chileatiende_server.exe
echo.
echo ========================================================
echo   ULTIMOS EVENTOS DE LOG
echo ========================================================
echo.
if exist "c:\Users\administrador\proyectobodega\backend\daemon\itam_chileatiende_server.out.log" (
    powershell -Command "Get-Content -Path 'c:\Users\administrador\proyectobodega\backend\daemon\itam_chileatiende_server.out.log' -Tail 30"
)
pause
