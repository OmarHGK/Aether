@echo off
pushd %*
set "_AETHER_EC=%ERRORLEVEL%"
call "%~dp0aether-prompt.cmd"
exit /b %_AETHER_EC%
