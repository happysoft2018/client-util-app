@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Node.js가 설치되어 있는지 확인
node --version >nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo Node.js를 설치한 후 다시 실행해주세요.
    echo https://nodejs.org/
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

REM 의존성 패키지가 설치되어 있는지 확인
if not exist "node_modules" (
    echo [정보] 의존성 패키지를 설치합니다...
    npm install
    if errorlevel 1 (
        echo [오류] 패키지 설치에 실패했습니다.
        echo.
        echo 아무 키나 누르면 창이 닫힙니다...
        pause >nul
        exit /b 1
    )
)

echo [정보] 필요한 정보를 입력해주세요.
echo.
set /p csv_path="CSV 파일 경로 (예: C:\temp\DB목록.csv): "
set /p db_user="DB 계정 ID: "
set /p db_password="DB 패스워드: "

REM CSV 파일 경로가 입력되었는지 확인
if "!csv_path!"=="" (
    echo [오류] CSV 파일 경로를 입력해주세요.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

REM DB 계정 정보가 입력되었는지 확인
if "!db_user!"=="" (
    echo [오류] DB 계정 ID를 입력해주세요.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

if "!db_password!"=="" (
    echo [오류] DB 패스워드를 입력해주세요.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

REM CSV 파일이 존재하는지 확인
if not exist "!csv_path!" (
    echo [오류] 지정된 CSV 파일을 찾을 수 없습니다: !csv_path!
    echo 파일 경로를 다시 확인해주세요.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)


echo [정보] 입력 정보 검증 완료
echo [정보] CSV 파일: !csv_path!
echo [정보] DB 계정: !db_user!
echo [정보] MSSQL 연결 체크를 시작합니다...
echo.

REM 스크립트 실행
node src/mssql-connection-checker.js -f "!csv_path!" -u "!db_user!" -p "!db_password!"

if errorlevel 1 (
    echo.
    echo [오류] 스크립트 실행 중 오류가 발생했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo [완료] MSSQL 연결 체크가 완료되었습니다.
echo.
echo 아무 키나 누르면 창이 닫힙니다...
pause >nul 