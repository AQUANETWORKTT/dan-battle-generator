@echo off
cd /d "%~dp0\..\.."
node integrations\firstclassbot\start-reports.cjs
if errorlevel 1 pause
