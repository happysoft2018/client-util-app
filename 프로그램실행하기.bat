@echo off
chcp 65001 >nul
title Node.js 통합 유틸리티 도구

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

REM 통합 애플리케이션 실행
echo [정보] Node.js 통합 유틸리티 도구를 시작합니다...
echo.
node app.js

if errorlevel 1 (
    echo.
    echo [오류] 프로그램 실행 중 오류가 발생했습니다.
    echo.
    echo 아무 키나 누르면 창이 닫힙니다...
    pause >nul
    exit /b 1
)

echo.
echo 프로그램이 정상적으로 종료되었습니다.
pause >nul 