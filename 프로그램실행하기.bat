@echo off
chcp 65001 >nul
title Node.js 유틸리티 도구 모음

:menu
cls
echo ========================================
echo    Node.js 유틸리티 도구 모음
echo ========================================
echo.
echo [1] 서버 Telnet 연결 체크
echo [2] MSSQL 연결 체크
echo [3] 종료
echo.
set /p choice="실행할 도구를 선택하세요 (1-3): "

if "%choice%"=="1" goto telnet
if "%choice%"=="2" goto mssql_check
if "%choice%"=="3" goto exit
goto menu

:telnet
cls
call run-telnet-checker.bat
goto menu

:mssql_check
cls
call run-mssql-checker.bat
goto menu



:exit
echo 프로그램을 종료합니다.
exit /b 0 