!include "FileFunc.nsh"
!insertmacro GetParameters
!ifndef ORBIT_PROFILE_DIR
!define ORBIT_PROFILE_DIR "$APPDATA\Orbit Workspace"
!endif
Var RuntimeDir
Var RuntimeMutex
Var LaunchRequest
Var LaunchDirectory
Function TryRunningOrbit
 ${GetParameters} $0
 StrCpy $9 $0 2
 StrCmp $9 "--" forward_done
 IfFileExists "${ORBIT_PROFILE_DIR}\launch-pipe.txt" 0 forward_done
 ClearErrors
 FileOpen $8 "${ORBIT_PROFILE_DIR}\launch-pipe.txt" r
 IfErrors forward_done
 FileRead $8 $1
 FileClose $8
 StrCpy $9 $1 9
 StrCmp $9 "\\.\pipe\" 0 forward_done
 System::Call 'kernel32::CreateFileW(w r1,i 0xc0000000,i 0,p 0,i 3,i 0,p 0)p.r2'
 IntCmp $2 -1 forward_done
 System::Call 'kernel32::GetNamedPipeServerProcessId(p r2,*i .r8)i.r7'
 StrCmp $7 0 +2
 System::Call 'user32::AllowSetForegroundWindow(i r8)'
 System::Call 'kernel32::GetCurrentDirectoryW(i ${NSIS_MAX_STRLEN},w .r3)i.r7'
 StrCpy $4 "$3$\n--orbit-launch-id=$LaunchRequest $0"
 StrLen $5 $4
 IntOp $5 $5 + 1
 IntOp $5 $5 * 2
 System::Call 'kernel32::WriteFile(p r2,w r4,i r5,*i .r6,p 0)i.r7'
 StrCmp $7 0 pipe_close
 IntCmp $6 $5 0 pipe_close pipe_close
 StrCpy $9 0
 pipe_wait:
 System::Call 'kernel32::PeekNamedPipe(p r2,p 0,i 0,p 0,*i .r8,p 0)i.r7'
 StrCmp $7 0 pipe_close
 IntCmp $8 6 pipe_read pipe_delay pipe_read
 pipe_delay:
 IntOp $9 $9 + 1
 IntCmp $9 60 pipe_close
 Sleep 5
 Goto pipe_wait
 pipe_read:
 System::Call 'kernel32::ReadFile(p r2,w .r8,i 6,*i .r6,p 0)i.r7'
 System::Call 'kernel32::CloseHandle(p r2)'
 StrCmp $7 0 forward_done
 StrCmp $8 "OK" 0 forward_done
 SetErrorLevel 0
 Quit
 pipe_close:
 System::Call 'kernel32::CloseHandle(p r2)'
 forward_done:
FunctionEnd
Function PrepareRuntime
 StrCpy $RuntimeDir "$LOCALAPPDATA\Orbit Workspace\Runtime\${CACHE_ID}"
 System::Call 'kernel32::CreateMutexW(p 0,i 0,w "Local\OrbitRuntime-${CACHE_ID}")p.s'
 Pop $RuntimeMutex
 System::Call 'kernel32::WaitForSingleObject(p $RuntimeMutex,i 90000)i.r8'
 IntCmp $8 0 locked
 IntCmp $8 128 locked
 SetErrorLevel 3
 Quit
 locked:
 SetOutPath "$RuntimeDir"
FunctionEnd
Function ReleaseRuntime
 System::Call 'kernel32::ReleaseMutex(p $RuntimeMutex)'
 System::Call 'kernel32::CloseHandle(p $RuntimeMutex)'
FunctionEnd
!macro OrbitCacheCheck cached
 IfFileExists "$RuntimeDir\.complete" 0 +5
 IfFileExists "$RuntimeDir\Orbit.exe" 0 +4
 IfFileExists "$RuntimeDir\icudtl.dat" 0 +3
 IfFileExists "$RuntimeDir\resources.pak" 0 +2
 IfFileExists "$RuntimeDir\resources\app.asar" ${cached}
!macroend
!macro OrbitFinishCache
 IfErrors cache_error
 ClearErrors
 FileOpen $8 "$RuntimeDir\.complete" w
 IfErrors cache_error
 FileWrite $8 "${CACHE_ID}"
 FileClose $8
 Goto cache_ready
 cache_error:
 Call ReleaseRuntime
 SetErrorLevel 2
 Quit
 cache_ready:
!macroend
!macro OrbitStartRuntime
 Call ReleaseRuntime
 System::Call 'kernel32::SetEnvironmentVariableW(w "PORTABLE_EXECUTABLE_FILE",w "$EXEPATH")'
 System::Call 'kernel32::SetEnvironmentVariableW(w "PORTABLE_EXECUTABLE_DIR",w "$EXEDIR")'
 System::Call 'kernel32::SetEnvironmentVariableW(w "ORBIT_LAUNCH_CWD",w "$LaunchDirectory")'
 ${GetParameters} $0
 ExecWait '"$RuntimeDir\Orbit.exe" --orbit-launch-id=$LaunchRequest $0' $1
 SetErrorLevel $1
!macroend
