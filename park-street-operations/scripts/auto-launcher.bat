@echo off
REM Park Street Operations - Auto-Launcher
REM Runs supervisor.js at Windows login (no admin needed)
cd /d "d:\slack\park-street-operations"
start /min "" "C:\Program Files\nodejs\node.exe" "d:\slack\park-street-operations\src\supervisor.js"
