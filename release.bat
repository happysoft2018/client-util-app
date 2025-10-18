@echo off
chcp 65001 >nul
setlocal

REM Read version from package.json
for /f "delims=" %%i in ('powershell -Command "(Get-Content package.json -Raw | ConvertFrom-Json).version"') do set "VERSION=%%i"

echo.
echo ========================================
echo   Node.js Utility App Release Script
echo ========================================
echo.
set "RELEASE_BASE=release"
set "PACKAGE_NAME=ClientUtilApp-v%VERSION%-win-x64"
set "RELEASE_DIR=%RELEASE_BASE%\%PACKAGE_NAME%"
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

echo 📋 Release Information:
echo    Version: %VERSION%
echo    Package: %PACKAGE_NAME%
echo    Build Time: %TIMESTAMP%
echo.

REM Step 1: Clean previous releases
echo 🧹 Step 1: Cleaning previous release...
if exist "%RELEASE_DIR%" (
    rmdir /s /q "%RELEASE_DIR%"
    echo ✅ Previous release cleaned
)

REM Step 2: Build the application
echo.
echo 🔨 Step 2: Building application...
echo.
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed. release aborted.
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo.

REM Step 3: Create release directory structure
echo 📁 Step 3: Creating release directory structure...
mkdir "%RELEASE_DIR%" 2>nul
mkdir "%RELEASE_DIR%\results" 2>nul
mkdir "%RELEASE_DIR%\results\sql_files" 2>nul
mkdir "%RELEASE_DIR%\log" 2>nul
mkdir "%RELEASE_DIR%\user_manual" 2>nul

echo.
echo 📦 Step 4: Copying files...
echo.

REM Copy executable
if exist "dist\client-util-app-v%VERSION%.exe" (
    copy "dist\client-util-app-v%VERSION%.exe" "%RELEASE_DIR%\" >nul
    echo ✅ Executable copied
) else (
    echo ❌ Executable not found: dist\client-util-app-v%VERSION%.exe
    pause
    exit /b 1
)

REM Copy config folder
if exist "config" (
    xcopy "config" "%RELEASE_DIR%\config\" /e /i /h /y >nul
    echo ✅ Config folder copied
)

REM Copy request_resources folder
if exist "request_resources" (
    xcopy "request_resources" "%RELEASE_DIR%\request_resources\" /e /i /h /y >nul
    echo ✅ Request resources folder copied (with sample SQL files)
)

REM Copy documentation files
echo.
echo 📚 Copying documentation...
copy "README*.md" "%RELEASE_DIR%\" >nul 2>&1
copy "USER_MANUAL*.md" "%RELEASE_DIR%\user_manual\" >nul 2>&1
copy "CHANGELOG*.md" "%RELEASE_DIR%\user_manual\" >nul 2>&1
copy "MIGRATION_GUIDE*.md" "%RELEASE_DIR%\user_manual\" >nul 2>&1
echo ✅ Documentation copied

REM Create launcher scripts
echo.
echo 📝 Creating launcher scripts...

REM run.bat (English version)
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cls
    echo echo.
    echo client-util-app-v%VERSION%.exe --lang=en
    echo pause
) > "%RELEASE_DIR%\run.bat"
echo ✅ run.bat created (English)

REM 실행하기.bat (Korean version)
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cls
    echo echo.
    echo client-util-app-v%VERSION%.exe --lang=kr
    echo pause
) > "%RELEASE_DIR%\실행하기.bat"
echo ✅ 실행하기.bat created (Korean)

REM Create version info file
echo.
echo 📄 Creating version info...
(
    echo Node.js Integrated Utility Tool
    echo Version: %VERSION%
    echo Build Date: %date% %time%
    echo.
    echo Package Contents:
    echo - client-util-app.exe : Main executable
    echo - config/dbinfo.json : Database configuration
    echo - request_resources/ : Sample CSV and SQL files
    echo - results/ : Output directory for results
    echo - log/ : Log directory
    echo - run.bat : Launcher script ^(English^)
    echo - 실행하기.bat : Launcher script ^(Korean^)
    echo.
    echo Documentation:
    echo - README.md / README_KR.md : Project overview
    echo - USER_MANUAL.md / USER_MANUAL_KR.md : User manual
    echo - CHANGELOG.md / CHANGELOG_KR.md : Version history
    echo - MIGRATION_GUIDE.md / MIGRATION_GUIDE_KR.md : Migration guide
    echo.
    echo Key Features:
    echo 1. Database Connection and Permission Check
    echo    - Supports: MSSQL, MySQL, MariaDB, PostgreSQL, Oracle
    echo    - CSV file based batch processing
    echo.
    echo 2. Server Telnet Connection Check
    echo    - Network connectivity testing
    echo    - Port accessibility verification
    echo.
    echo 3. Database SQL Execution
    echo    - Parameterized SQL execution
    echo    - CSV/JSON parameter files
    echo    - Structured CSV result output
    echo    - #DATABASE directive support
    echo.
    echo 4. Multi-language Support
    echo    - English ^(run.bat^)
    echo    - Korean ^(실행하기.bat^)
    echo.
    echo For more information, see USER_MANUAL.md or USER_MANUAL_KR.md
) > "%RELEASE_DIR%\VERSION_INFO.txt"
echo ✅ VERSION_INFO.txt created

REM Step 5: Create release notes
echo.
echo 📝 Step 5: Creating release notes...
(
    echo ========================================
    echo   Node.js Integrated Utility Tool
    echo   Release v%VERSION%
    echo ========================================
    echo.
    echo Build Date: %date% %time%
    echo Build ID: %TIMESTAMP%
    echo.
    echo What's New in v1.3.0:
    echo.
    echo [Database SQL Executor Improvements]
    echo • CSV result file generation with structured output
    echo • #DATABASE preprocessor directive for specifying DB
    echo • JSON parameter file support (alongside CSV)
    echo • Condition-based result grouping
    echo.
    echo [Database Support]
    echo • Added MariaDB support (MySQL compatible)
    echo.
    echo [Supported Databases]
    echo • Microsoft SQL Server (mssql)
    echo • MySQL (mysql)
    echo • MariaDB (mariadb) ⭐ NEW
    echo • PostgreSQL (postgresql)
    echo • Oracle (oracle)
    echo.
    echo [Installation]
    echo 1. Extract the package to your desired location
    echo 2. Edit config/dbinfo.json with your database settings
    echo 3. Add your SQL files to request_resources/sql_files/
    echo 4. Run run.bat ^(English^) or 실행하기.bat ^(Korean^)
    echo.
    echo [Quick Start]
    echo 1. Database Connection Check: Menu option 1
    echo 2. Telnet Check: Menu option 2
    echo 3. SQL Execution: Menu option 3
    echo    - Create SQL file with #DATABASE directive
    echo    - Create matching CSV or JSON parameter file
    echo    - Results saved to results/sql_files/
    echo.
    echo [Documentation]
    echo • USER_MANUAL.md / USER_MANUAL_KR.md - Detailed user guide
    echo • CHANGELOG.md / CHANGELOG_KR.md - Version history
    echo • README.md / README_KR.md - Project overview
    echo.
    echo [Support]
    echo For issues or questions, check the documentation or
    echo contact the development team.
    echo.
    echo ========================================
) > "%RELEASE_DIR%\RELEASE_NOTES.txt"
echo ✅ RELEASE_NOTES.txt created

REM Step 6: Create ZIP archive
echo.
echo 📦 Step 6: Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%RELEASE_DIR%' -DestinationPath '%RELEASE_BASE%\%PACKAGE_NAME%.zip' -Force"
if %errorlevel% equ 0 (
    echo ✅ ZIP archive created
) else (
    echo ⚠️  ZIP creation failed, but release folder is ready
)

echo.
echo ========================================
echo ✅ Release Package Created Successfully!
echo ========================================
echo.
echo 📁 Location: %RELEASE_DIR%\
if exist "%RELEASE_BASE%\%PACKAGE_NAME%.zip" (
    echo 📦 ZIP Archive: %RELEASE_BASE%\%PACKAGE_NAME%.zip
)
echo.
echo 📋 Package Contents:
echo    • Executable ^(client-util-app.exe^)
echo    • Configuration files
echo    • Sample files and templates
echo    • Complete documentation ^(8 files^)
echo    • Launcher scripts ^(English ^& Korean^)
echo    • Release notes
echo.
echo 🎉 Ready for distribution!
echo.
pause

