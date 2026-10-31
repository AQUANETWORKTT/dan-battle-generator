@echo off
cd /d "%~dp0\..\.."
node integrations\firstclassbot\start-checker.cjs
pause
