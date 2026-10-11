param([ValidateSet('list','restore')][string]$Operation)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$inputData=$env:ORBIT_RECYCLE_INPUT | ConvertFrom-Json
$original=[IO.Path]::GetFullPath([string]$inputData.original)
$directory=[IO.Path]::GetDirectoryName($original)
$filename=[IO.Path]::GetFileName($original)
if($Operation -eq 'restore' -and (Test-Path -LiteralPath $original)){throw 'restore-target-exists'}
$token=$inputData.token
$shell=New-Object -ComObject Shell.Application
$bin=$shell.Namespace(10)
$matches=@()
foreach($item in $bin.Items()){
 # Filter by name before making slower property queries for unrelated files.
 if([string]$item.Name -ine $filename){continue}
 if([string]$item.ExtendedProperty('System.Recycle.DeletedFrom') -ine $directory){continue}
 $itemPath=[string]$item.Path
 if($Operation -eq 'restore' -and $token){
  $savedPath=if($token -is [string]){$token}else{$token.path}
  if($savedPath -and $itemPath -ine [string]$savedPath){continue}
  if($token.deferred -eq $true){
   if([long]$item.Size -ne [long]$token.size){continue}
   $deletedDate=$item.ExtendedProperty('System.Recycle.DateDeleted')
   if($deletedDate -isnot [datetime]){continue}
   $deletedMs=([datetimeoffset][datetime]::SpecifyKind($deletedDate,[DateTimeKind]::Utc)).ToUnixTimeMilliseconds()
   # Windows deletion timestamps may have second precision. Never select a
   # different old copy just because it has the same name and original folder.
   if($deletedMs -lt ([long]$token.startedAt-2000) -or $deletedMs -gt ([long]$token.finishedAt+2000)){continue}
  }
 }
 $matches+=@{item=$item;path=$itemPath;deleted=[string]$item.ExtendedProperty('System.Recycle.DateDeleted')}
}
if($Operation -eq 'list'){
 ConvertTo-Json -InputObject @($matches | ForEach-Object {@{path=$_.path;deleted=$_.deleted}}) -Compress
 exit
}
if(Test-Path -LiteralPath $original){throw 'restore-target-exists'}
if($matches.Count -eq 0){throw 'recycle-item-missing'}
if($matches.Count -ne 1){throw 'recycle-item-ambiguous'}
$matches[0].item.InvokeVerb('undelete')
for($attempt=0;$attempt -lt 80;$attempt++){
 if(Test-Path -LiteralPath $original -PathType Leaf){@{restored=$true} | ConvertTo-Json -Compress;exit}
 Start-Sleep -Milliseconds 100
}
throw 'restore-not-completed'
