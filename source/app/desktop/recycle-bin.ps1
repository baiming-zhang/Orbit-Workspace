param([ValidateSet('list','restore')][string]$Operation)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$inputData=$env:ORBIT_RECYCLE_INPUT | ConvertFrom-Json
$original=[IO.Path]::GetFullPath([string]$inputData.original)
$directory=[IO.Path]::GetDirectoryName($original)
$filename=[IO.Path]::GetFileName($original)
$shell=New-Object -ComObject Shell.Application
$bin=$shell.Namespace(10)
$matches=@()
foreach($item in $bin.Items()){
 if([string]$item.ExtendedProperty('System.Recycle.DeletedFrom') -ieq $directory -and [string]$item.Name -ieq $filename){
  $matches+=@{item=$item;path=[string]$item.Path;deleted=[string]$item.ExtendedProperty('System.Recycle.DateDeleted')}
 }
}
if($Operation -eq 'list'){
 ConvertTo-Json -InputObject @($matches | ForEach-Object {@{path=$_.path;deleted=$_.deleted}}) -Compress
 exit
}
if(Test-Path -LiteralPath $original){throw 'restore-target-exists'}
if($inputData.token){$matches=@($matches | Where-Object {$_.path -ieq [string]$inputData.token})}
if($matches.Count -eq 0){throw 'recycle-item-missing'}
if($matches.Count -ne 1){throw 'recycle-item-ambiguous'}
$matches[0].item.InvokeVerb('undelete')
for($attempt=0;$attempt -lt 80;$attempt++){
 if(Test-Path -LiteralPath $original -PathType Leaf){@{restored=$true} | ConvertTo-Json -Compress;exit}
 Start-Sleep -Milliseconds 100
}
throw 'restore-not-completed'
