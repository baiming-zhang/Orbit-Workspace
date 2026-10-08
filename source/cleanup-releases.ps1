param(
    [Parameter(Mandatory=$true)][string]$VerifiedTag,
    [Parameter(Mandatory=$true)][string]$SHA256File,
    [string]$Repository='baiming-zhang/Orbit-Workspace',
    [switch]$Preview
)
$ErrorActionPreference='Stop'
if($VerifiedTag -notmatch '^v\d+\.\d+\.\d+$'){throw 'Use a numbered release tag, such as v1.8.4.'}
if($Repository -notmatch '^[\w.-]+/[\w.-]+$'){throw 'Invalid repository name.'}
$currentVersion=[version]$VerifiedTag.Substring(1)
$releaseJson=& gh api "repos/$Repository/releases/tags/$VerifiedTag"
if($LASTEXITCODE -ne 0){throw 'Cannot read the new published release.'}
$release=$releaseJson | ConvertFrom-Json
if($release.draft -or $release.tag_name -ne $VerifiedTag){throw 'The new release must be published before cleanup.'}
$manifest=Get-Content -LiteralPath $SHA256File
$verified=0
foreach($line in $manifest){
    if([string]::IsNullOrWhiteSpace($line)){continue}
    if($line -notmatch '^([a-fA-F0-9]{64})\s+([^/\\]+)$'){throw 'Invalid SHA256 manifest entry.'}
    $expectedDigest='sha256:'+$Matches[1].ToLowerInvariant()
    $assetName=$Matches[2].Trim()
    $assets=@($release.assets | Where-Object { $_.name -eq $assetName })
    if($assets.Count -ne 1 -or $assets[0].state -ne 'uploaded' -or $assets[0].digest -ne $expectedDigest){throw "Uploaded asset verification failed: $assetName"}
    $verified++
}
if($verified -lt 4){throw 'Verify the executable, bridge, runtime template, and source ZIP before cleanup.'}
$releaseList=& gh release list --repo $Repository --limit 100 --json tagName,isDraft
if($LASTEXITCODE -ne 0){throw 'Cannot list older releases.'}
$older=@($releaseList | ConvertFrom-Json | Where-Object { $_.tagName -match '^v\d+\.\d+\.\d+$' -and [version]$_.tagName.Substring(1) -lt $currentVersion })
foreach($item in $older){
    if($Preview){Write-Output ("Would remove release packages: "+$item.tagName);continue}
    & gh release delete $item.tagName --repo $Repository --yes
    if($LASTEXITCODE -ne 0){throw ("Could not remove release packages: "+$item.tagName)}
    Write-Output ("Removed release packages; Git tag retained: "+$item.tagName)
}
Write-Output ("Verified $verified assets for $VerifiedTag.")
