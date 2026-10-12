param([Parameter(Mandatory)][string]$HostMetadata)
$ErrorActionPreference='Stop'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Net.Http
$handler=[Net.Http.HttpClientHandler]::new()
$handler.UseProxy=$false
$client=[Net.Http.HttpClient]::new($handler)
$client.Timeout=[TimeSpan]::FromMinutes(10)
try{
 while($null -ne ($line=[Console]::In.ReadLine())){
  if(!$line.Trim()){continue}
  $request=$null
  try{
   $request=$line | ConvertFrom-Json
   $metadata=Get-Content -LiteralPath $HostMetadata -Raw | ConvertFrom-Json
   if($metadata.url -notmatch '^http://127\.0\.0\.1:[0-9]+$'){throw 'Invalid local Orbit host.'}
   $message=[Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post,$metadata.url+'/mcp')
   $message.Headers.Authorization=[Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$env:ORBIT_API_TOKEN)
   [void]$message.Headers.TryAddWithoutValidation('Accept','application/json, text/event-stream')
   $message.Content=[Net.Http.StringContent]::new($line,[Text.Encoding]::UTF8,'application/json')
   try{
    $response=$client.SendAsync($message).GetAwaiter().GetResult()
    try{
     $answer=$response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
     if(!$response.IsSuccessStatusCode){throw "Orbit returned HTTP $([int]$response.StatusCode). Reconnect after rotating access."}
     if([int]$response.StatusCode -ne 202 -and $answer){[Console]::Out.WriteLine($answer);[Console]::Out.Flush()}
    }finally{$response.Dispose()}
   }finally{$message.Dispose()}
  }catch{
   if($request -and $request.PSObject.Properties.Name -contains 'id'){
    $errorReply=@{jsonrpc='2.0';id=$request.id;error=@{code=-32603;message=$_.Exception.Message}} | ConvertTo-Json -Depth 8 -Compress
    [Console]::Out.WriteLine($errorReply);[Console]::Out.Flush()
   }else{[Console]::Error.WriteLine($_.Exception.Message)}
  }
 }
}finally{$client.Dispose()}
