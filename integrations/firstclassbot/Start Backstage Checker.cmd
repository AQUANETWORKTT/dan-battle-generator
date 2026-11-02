@echo off
if /i "%~1"=="--run" goto run
rem Keep a dedicated command window open even when startup fails.
start "Backstage Checker" "%ComSpec%" /d /k ""%~f0" --run"
exit /b

:run
title Backstage Checker - keep this window open
cd /d "%~dp0\..\.." || goto folder_error
echo Starting the Backstage availability checker...
echo Keep this window and the Backstage browser open.
echo.
set "checker_node=node"
if exist "%ProgramFiles%\nodejs\node.exe" set "checker_node=%ProgramFiles%\nodejs\node.exe"
"%checker_node%" "%~dp0start-checker.cjs"
echo.
echo The checker has stopped. Any startup error is shown above.
echo You can close this window and double-click Start Backstage Checker to retry.
exit /b

:folder_error
echo Could not open the project folder. Keep the launcher inside the project.
exit /b 1
