Unicode true
Name "Orbit Workspace"
Caption "Orbit Workspace"
OutFile "${OUTPUT_EXE}"
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
SetCompressor zlib
SetCompress off
!addplugindir /x86-unicode "${NSIS_PLUGIN_DIR}"
Icon "${APP_ICON}"
VIProductVersion "1.8.9.0"
VIAddVersionKey "ProductName" "Orbit"
VIAddVersionKey "FileDescription" "Orbit — Designed by Baiming Zhang"
VIAddVersionKey "ProductVersion" "1.8.9"
VIAddVersionKey "FileVersion" "1.8.9.0"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 Baiming Zhang. MIT License."
!include "FileFunc.nsh"
!insertmacro GetParameters
Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File /oname=Orbit.7z "${RUNTIME_ARCHIVE}"
  SetOutPath "$PLUGINSDIR\Orbit"
  Nsis7z::Extract "$PLUGINSDIR\Orbit.7z"
  IfFileExists "$PLUGINSDIR\Orbit\Orbit.exe" +3 0
    SetErrorLevel 2
    Quit
  System::Call 'kernel32::SetEnvironmentVariableW(w "PORTABLE_EXECUTABLE_FILE", w "$EXEPATH") i .r0'
  System::Call 'kernel32::SetEnvironmentVariableW(w "PORTABLE_EXECUTABLE_DIR", w "$EXEDIR") i .r0'
  ${GetParameters} $R0
  ExecWait '"$PLUGINSDIR\Orbit\Orbit.exe" $R0' $0
  SetErrorLevel $0
SectionEnd
