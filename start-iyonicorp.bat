@echo off
title Iyonicorp 3.0 Platform

cd /d "C:\Users\IYONICORP\Desktop\iyonicorp3.0"

if not exist package.json (
    echo ERROR: package.json was not found.
    pause
    exit /b 1
)

if not exist node_modules (
    echo ERROR: node_modules folder is missing.
    echo Run npm install in the project folder first.
    pause
    exit /b 1
)

echo Starting Iyonicorp 3.0...
echo Logs will be saved to task-scheduler.log

call npm run dev >> "C:\Users\IYONICORP\Desktop\iyonicorp3.0\task-scheduler.log" 2>&1