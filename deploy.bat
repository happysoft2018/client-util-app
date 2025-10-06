@echo off
chcp 65001 >nul
echo.
echo ========================================
echo     Node.js Utility App Deploy Script
echo ========================================
echo.

set "DEPLOY_DIR=deploy"
set "APP_NAME=NodeUtilApp"

echo 📁 Creating deployment directory...
if exist "%DEPLOY_DIR%" rmdir /s /q "%DEPLOY_DIR%"
mkdir "%DEPLOY_DIR%"

echo.
echo 📦 Copying files...

REM Copy executable
if exist "dist\my-node-client-util-app.exe" (
    copy "dist\my-node-client-util-app.exe" "%DEPLOY_DIR%\"
    echo ✅ Executable copied
) else (
    echo ❌ Executable not found in dist/ folder
    echo    Please run build.bat first
    pause
    exit /b 1
)

REM Copy config folder
if exist "config" (
    xcopy "config" "%DEPLOY_DIR%\config\" /e /i /h /y
    echo ✅ Config folder copied
) else (
    echo ❌ Config folder not found
    pause
    exit /b 1
)

REM Copy template folder
if exist "templet" (
    xcopy "templet" "%DEPLOY_DIR%\templet\" /e /i /h /y
    echo ✅ Template folder copied
) else (
    echo ❌ Template folder not found
    pause
    exit /b 1
)

REM Copy documentation
if exist "README.md" copy "README.md" "%DEPLOY_DIR%\"
if exist "README_KR.md" copy "README_KR.md" "%DEPLOY_DIR%\"

REM Create run script
echo @echo off > "%DEPLOY_DIR%\run.bat"
echo chcp 65001 ^>nul >> "%DEPLOY_DIR%\run.bat"
echo my-node-client-util-app.exe >> "%DEPLOY_DIR%\run.bat"
echo pause >> "%DEPLOY_DIR%\run.bat"

echo.
echo ✅ Deployment package created successfully!
echo 📁 Location: %DEPLOY_DIR%\
echo.
echo 📋 Package contents:
echo    - my-node-client-util-app.exe (main executable)
echo    - config/ (database and user settings)
echo    - templet/ (CSV and SQL templates)
echo    - run.bat (launcher script)
echo    - README files (documentation)
echo.
echo 🚀 Ready for distribution!
echo    Copy the entire '%DEPLOY_DIR%' folder to target machines.
echo.
pause
