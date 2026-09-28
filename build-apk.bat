

@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo       WELLMORA LEDGER - ONE-CLICK IN-PLACE APK BUILDER
echo ========================================================
echo.

cd /d "%~dp0frontend"

echo [1/3] Building Web Assets and Syncing Android...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %ERRORLEVEL%
)

call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Compiling Signed APK with Auto-Incrementing Version...
cd android
if exist "C:\Users\milan\.jdks\jdk-21.0.12.1+1" (
    set "JAVA_HOME=C:\Users\milan\.jdks\jdk-21.0.12.1+1"
) else if exist "C:\Users\milan\.jdks\jbr-21.0.11" (
    set "JAVA_HOME=C:\Users\milan\.jdks\jbr-21.0.11"
) else (
    for /d %%D in ("C:\Users\milan\.jdks\*") do (
        if exist "%%D\bin\java.exe" set "JAVA_HOME=%%D"
    )
)
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle build failed.
    pause
    exit /b %ERRORLEVEL%
)
cd ..\..

echo.
echo [3/3] Copying APK to Project Root...
copy /Y "frontend\android\app\build\outputs\apk\debug\app-debug.apk" "Wellmora-Ledger.apk" >nul

if exist "Wellmora-Ledger.apk" (
    echo.
    echo ========================================================
    echo  SUCCESS! Updated APK created:
    echo  %~dp0Wellmora-Ledger.apk
    echo ========================================================
    echo.
    
    set "ADB=C:\Users\milan\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    if exist "!ADB!" (
        "!ADB!" get-state >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo Phone detected via USB! Installing update in-place...
            "!ADB!" install -r "Wellmora-Ledger.apk"
            if !ERRORLEVEL! EQU 0 (
                echo [SUCCESS] App updated directly on your phone! No uninstall needed.
            ) else (
                echo [NOTICE] If update failed, uninstall the previous version ONE LAST TIME to register the permanent key.
            )
        ) else (
            echo No USB device detected. You can copy "Wellmora-Ledger.apk" directly to your phone.
        )
    )
) else (
    echo [ERROR] Could not find generated APK.
)

echo.
echo Press any key to exit...
pause >nul
