@echo off
title Push to GitHub - Wellmora Ledger
cd /d "%~dp0"
set "PATH=C:\Users\milan\AppData\Local\Programs\Git\cmd;C:\Users\milan\AppData\Local\Programs\Git\mingw64\bin;%PATH%"

echo ========================================================
echo         PUSHING CODE TO GITHUB (ORIGIN MAIN)
echo ========================================================
echo.
echo Repository: https://github.com/Milan799/wellmora-ledger.git
echo Branch:     main
echo.
echo If prompted by Git Credential Manager, complete sign-in in your browser.
echo.
git push origin main
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Code pushed to GitHub successfully.
    echo ========================================================
) else (
    echo.
    echo [ERROR] Git push failed.
)
echo.
pause
