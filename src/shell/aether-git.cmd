@echo off
git.exe %*
set "_AETHER_GIT_EC=%ERRORLEVEL%"
call "%~dp0aether-prompt.cmd"
exit /b %_AETHER_GIT_EC%
