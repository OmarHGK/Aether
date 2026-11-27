@echo off
set "_AETHER_DIR=%CD%"
set "_AETHER_GIT_ROOT="

:aether_find_git
if exist "%_AETHER_DIR%\.git" goto :aether_found_git_hit
for %%I in ("%_AETHER_DIR%\..") do set "_AETHER_PARENT=%%~fI"
if /i "%_AETHER_PARENT%"=="%_AETHER_DIR%" goto :aether_no_git
set "_AETHER_DIR=%_AETHER_PARENT%"
goto :aether_find_git

:aether_found_git_hit
set "_AETHER_GIT_ROOT=%_AETHER_DIR%"
set "_AETHER_BRANCH="
set "_AETHER_HEAD="
if exist "%_AETHER_GIT_ROOT%\.git\HEAD" set /p _AETHER_HEAD=<"%_AETHER_GIT_ROOT%\.git\HEAD"
if defined _AETHER_HEAD goto :aether_parse_head
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "_AETHER_BRANCH=%%B"
goto :aether_check_branch

:aether_parse_head
if "%_AETHER_HEAD:~0,16%"=="ref: refs/heads/" goto :aether_head_ref
set "_AETHER_BRANCH=%_AETHER_HEAD:~0,7%"
goto :aether_check_branch

:aether_head_ref
set "_AETHER_BRANCH=%_AETHER_HEAD:~16%"

:aether_check_branch
if not defined _AETHER_BRANCH goto :aether_no_git

set "_AETHER_DIRTY="
for /f "delims=" %%S in ('git status --porcelain 2^>nul') do (
  set "_AETHER_DIRTY=1"
  goto :aether_dirty_done
)
:aether_dirty_done

set "_AETHER_BRANCH_P=%_AETHER_BRANCH:$=$$%"
if defined _AETHER_DIRTY goto :aether_prompt_dirty
goto :aether_prompt_clean

:aether_prompt_dirty
prompt $E]9999;aether_git:1:%_AETHER_BRANCH_P%$E\$E[36m$P $E[33m(%_AETHER_BRANCH_P% *)$E[90m$G$E[0m 
goto :aether_prompt_cleanup

:aether_prompt_clean
prompt $E]9999;aether_git:0:%_AETHER_BRANCH_P%$E\$E[36m$P $E[35m(%_AETHER_BRANCH_P%)$E[90m$G$E[0m 
goto :aether_prompt_cleanup

:aether_no_git
prompt $E]9999;aether_git:$E\$E[36m$P$E[90m$G$E[0m 

:aether_prompt_cleanup
set "_AETHER_DIR="
set "_AETHER_PARENT="
set "_AETHER_GIT_ROOT="
set "_AETHER_HEAD="
set "_AETHER_BRANCH="
set "_AETHER_BRANCH_P="
set "_AETHER_DIRTY="
