Unicode true
Name "Orbit"
Caption "Orbit"
OutFile "${OUTPUT_EXE}"
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
CRCCheck off
SetCompressor zlib
SetCompress off
!addplugindir /x86-unicode "${NSIS_PLUGIN_DIR}"
Icon "${APP_ICON}"
VIProductVersion "1.8.17.0"
VIAddVersionKey "ProductName" "Orbit"
VIAddVersionKey "FileDescription" "Orbit Workspace"
VIAddVersionKey "ProductVersion" "1.8.17"
VIAddVersionKey "FileVersion" "1.8.17.0"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 Baiming Zhang. MIT License."
!include "${__FILEDIR__}\launcher-cache.nsh"
Function .onInit
 System::Call 'kernel32::GetCurrentDirectoryW(i ${NSIS_MAX_STRLEN},w .r3)'
 StrCpy $LaunchDirectory $3
 System::Call 'kernel32::GetCurrentProcessId()i.r6'
 System::Call 'kernel32::GetTickCount()i.r7'
 StrCpy $LaunchRequest "$6-$7"
 Call TryRunningOrbit
 Call PrepareRuntime
 !insertmacro OrbitCacheCheck init_cached
 Call ReleaseRuntime
 Return
 init_cached:
 !insertmacro OrbitStartRuntime
 Quit
FunctionEnd
Section
 Call PrepareRuntime
 !insertmacro OrbitCacheCheck runtime_cached
 InitPluginsDir
 SetOutPath "$PLUGINSDIR"
 File /oname=Orbit.7z "${RUNTIME_ARCHIVE}"
 SetOutPath "$RuntimeDir"
 Nsis7z::Extract "$PLUGINSDIR\Orbit.7z"
 IfFileExists "$RuntimeDir\Orbit.exe" +4 0
 Call ReleaseRuntime
 SetErrorLevel 2
 Quit
 !insertmacro OrbitFinishCache
 runtime_cached:
 !insertmacro OrbitStartRuntime
SectionEnd
