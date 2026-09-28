@echo off
title GitHub Sync - Wellmora Ledger
cd /d "%~dp0"

:: Set paths to Git and GitHub CLI
set "PATH=C:\Users\milan\AppData\Local\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin;C:\Users\milan\AppData\Local\Programs\Git\cmd;C:\Users\milan\AppData\Local\Programs\Git\mingw64\bin;%PATH%"

echo =======================================================================
echo                 WELLMORA LEDGER - GITHUB PUSH TOOL
echo =======================================================================
echo.

:: 1. Check if GitHub CLI is authenticated
echo [1/3] Checking GitHub authentication status...
gh auth status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ACTION NEEDED] Your PC was recently reformatted, so GitHub sign-in is required.
    echo.
    echo 1. An 8-character code will be displayed below.
    echo 2. Copy the code and press Enter when prompted.
    echo 3. Your browser will open GitHub - paste the code and click Authorize.
    echo.
    gh auth login --hostname github.com --git-protocol https --web
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] GitHub authentication could not be completed.
        goto :failed
    )
) else (
    echo [OK] GitHub authentication active.
)

:: 2. Configure Git to use GitHub CLI credentials
echo.
echo [2/3] Configuring Git credential helper...
gh auth setup-git
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Could not set up git credential helper with gh. Continuing with push...
)

:: 3. Push to GitHub
echo.
echo [3/3] Pushing commits to GitHub (origin main)...
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Git push failed.
    goto :failed
)

echo.
echo =======================================================================
echo  SUCCESS! All changes have been pushed to GitHub (origin main)!
echo =======================================================================
echo.
pause
exit /b 0

:failed
echo.
echo =======================================================================
echo  PUSH FAILED
echo  Please check the error message above.
echo =======================================================================
echo.
pause
exit /b 1
