@echo off
doskey cd=call "%~dp0aether-cd.cmd" $*
doskey chdir=call "%~dp0aether-cd.cmd" $*
doskey pushd=call "%~dp0aether-pushd.cmd" $*
doskey popd=call "%~dp0aether-popd.cmd" $*
doskey git=call "%~dp0aether-git.cmd" $*
doskey clear=cls
call "%~dp0aether-prompt.cmd"
cls
