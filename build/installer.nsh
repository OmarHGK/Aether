!macro customInstall
  ; Right-click empty background inside any folder -> Open in Aether
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Aether" "" "Open in Aether"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Aether" "Icon" "$INSTDIR\Aether.exe,0"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Aether\command" "" '"$INSTDIR\Aether.exe" --cwd "%V"'

  ; Right-click on any folder icon -> Open in Aether
  WriteRegStr HKCU "Software\Classes\Directory\shell\Aether" "" "Open in Aether"
  WriteRegStr HKCU "Software\Classes\Directory\shell\Aether" "Icon" "$INSTDIR\Aether.exe,0"
  WriteRegStr HKCU "Software\Classes\Directory\shell\Aether\command" "" '"$INSTDIR\Aether.exe" --cwd "%V"'

  ; Right-click on any drive (C:\, D:\) -> Open in Aether
  WriteRegStr HKCU "Software\Classes\Drive\shell\Aether" "" "Open in Aether"
  WriteRegStr HKCU "Software\Classes\Drive\shell\Aether" "Icon" "$INSTDIR\Aether.exe,0"
  WriteRegStr HKCU "Software\Classes\Drive\shell\Aether\command" "" '"$INSTDIR\Aether.exe" --cwd "%V"'

  ; Register "aether" command for File Explorer address bar & Win+R
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\aether.exe" "" "$INSTDIR\Aether.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\aether.exe" "Path" "$INSTDIR"

  ; Add install folder to per-user PATH (broadcasts WM_SETTINGCHANGE automatically)
  nsExec::ExecToLog `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$d='$INSTDIR'; $$p=[Environment]::GetEnvironmentVariable('Path','User'); $$parts=@(); if($$p){$$parts=$$p -split ';' | Where-Object {$$_ -and ($$_ -ine $$d)}}; [Environment]::SetEnvironmentVariable('Path',(($$parts+$$d) -join ';'),'User')"`
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\Aether"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\Aether"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\Aether"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\aether.exe"

  nsExec::ExecToLog `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$$d='$INSTDIR'; $$p=[Environment]::GetEnvironmentVariable('Path','User'); if($$p){$$parts=$$p -split ';' | Where-Object {$$_ -and ($$_ -ine $$d)}; [Environment]::SetEnvironmentVariable('Path',(($$parts) -join ';'),'User')}"`
!macroend
