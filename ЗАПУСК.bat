@echo off
chcp 65001 >nul
title Деньги-Бабки CRM
cd /d "%~dp0"

echo.
echo  💰 Деньги-Бабки CRM v2.0
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ОШИБКА] Node.js не установлен!
    echo  Скачай: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo  Устанавливаю зависимости...
    call npm install
    echo.
)

echo  Сервер: http://localhost:3000
echo  Логин:  admin / admin123
echo  Нажми Ctrl+C чтобы остановить
echo.

start http://localhost:3000
node server/index.js
