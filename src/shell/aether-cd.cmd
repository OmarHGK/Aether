@echo off
set "_AETHER_PREV=%CD%"

if "%~1"=="" (
  cd
  goto :aether_cd_end
)

if "%~1"=="/?" (
  cd /?
  goto :aether_cd_end
)

if "%~1"=="-" if "%~2"=="" goto :aether_cd_dash
if "%~1"=="~" if "%~2"=="" goto :aether_cd_home
if /i "%~1"=="/d" goto :aether_cd_explicit_d

set "_AETHER_FIRST=%~1"
if "%_AETHER_FIRST:~0,2%"=="~/" goto :aether_cd_tilde
if "%_AETHER_FIRST:~0,2%"=="~\" goto :aether_cd_tilde

cd /d %*
goto :aether_cd_record

:aether_cd_dash
if not defined AETHER_OLDPWD (
  echo Aether: no previous directory
  goto :aether_cd_end
)
cd /d "%AETHER_OLDPWD%"
goto :aether_cd_record

:aether_cd_home
cd /d "%USERPROFILE%"
goto :aether_cd_record

:aether_cd_explicit_d
cd %*
goto :aether_cd_record

:aether_cd_tilde
set "_AETHER_REST=%_AETHER_FIRST:~1%"
set "_AETHER_REST=%_AETHER_REST:/=\%"
cd /d "%USERPROFILE%%_AETHER_REST%"
set "_AETHER_REST="
goto :aether_cd_record

:aether_cd_record
if errorlevel 1 goto :aether_cd_end
if /i not "%CD%"=="%_AETHER_PREV%" set "AETHER_OLDPWD=%_AETHER_PREV%"

:aether_cd_end
set "_AETHER_PREV="
set "_AETHER_FIRST="
call "%~dp0aether-prompt.cmd"
