param(
    [string]$PythonExecutable = 'python',
    [string]$SevenZip = '7z',
    [string]$MakeNsis = 'makensis',
    [Parameter(Mandatory=$true)][string]$NsisPluginDirectory
)
$ErrorActionPreference = 'Stop'
$sourceRoot = $PSScriptRoot
$buildRoot = Join-Path $sourceRoot ('build-work-' + [guid]::NewGuid().ToString('N'))
$runtimeRoot = Join-Path $buildRoot 'runtime'
$outputRoot = Join-Path $sourceRoot 'dist'
New-Item -ItemType Directory -Path $runtimeRoot,$outputRoot -Force | Out-Null
$pluginRoot = (Resolve-Path -LiteralPath $NsisPluginDirectory).Path
if (-not (Test-Path -LiteralPath (Join-Path $pluginRoot 'Nsis7z.dll'))) { throw 'Nsis7z.dll was not found in NsisPluginDirectory.' }
function Invoke-Checked([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}
$template = Join-Path $sourceRoot 'build\runtime-template.7z'
if (-not (Test-Path -LiteralPath $template)) {
    Write-Host 'Downloading the Orbit runtime template...'
    Invoke-WebRequest -Uri 'https://github.com/baiming-zhang/Orbit-Workspace/releases/download/v1.8.2/runtime-template.7z' -OutFile $template
}
Invoke-Checked $SevenZip @('x', (Join-Path $sourceRoot 'build\runtime-template.7z'), ('-o' + $runtimeRoot), '-y')
Invoke-Checked $PythonExecutable @((Join-Path $sourceRoot 'build\pack_asar.py'), (Join-Path $sourceRoot 'app'), (Join-Path $runtimeRoot 'resources\app.asar'))
$runtimeArchive = Join-Path $buildRoot 'runtime.7z'
Push-Location $runtimeRoot
try { Invoke-Checked $SevenZip @('a', '-t7z', '-mx=5', $runtimeArchive, '.\*') } finally { Pop-Location }
$exe = Join-Path $outputRoot 'Orbit.exe'
Invoke-Checked $MakeNsis @('/INPUTCHARSET', 'UTF8', '/V2', ('/DOUTPUT_EXE=' + $exe), ('/DAPP_ICON=' + (Join-Path $sourceRoot 'app\desktop\assets\icon.ico')), ('/DRUNTIME_ARCHIVE=' + $runtimeArchive), ('/DNSIS_PLUGIN_DIR=' + $pluginRoot), (Join-Path $sourceRoot 'build\Orbit.nsi'))
Copy-Item -LiteralPath (Join-Path $sourceRoot 'app\desktop\mcp-bridge.cjs') -Destination (Join-Path $outputRoot 'orbit-api-bridge.cjs')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'app\LICENSE'),(Join-Path $sourceRoot 'app\README.txt'),(Join-Path $sourceRoot 'app\THIRD-PARTY-NOTICES.txt') -Destination $outputRoot
$digest = Get-FileHash -LiteralPath $exe -Algorithm SHA256
($digest.Hash + '  Orbit.exe') | Set-Content -LiteralPath (Join-Path $outputRoot 'SHA256.txt') -Encoding utf8
Write-Host "Built: $exe"
