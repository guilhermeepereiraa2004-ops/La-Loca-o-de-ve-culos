[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$OutputFile,
  [string]$CompareTo
)
$ErrorActionPreference='Stop'
$preservationRoot=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$preservationRef=(Get-Content -LiteralPath (Join-Path $preservationRoot 'supabase/.temp/project-ref') -Raw).Trim()
if($preservationRef -ne 'ucfzkzpmvjekgotexriq'){throw 'Projeto divergente; parar.'}
Push-Location -LiteralPath $preservationRoot
try{
  $preservationCli=(Get-Command supabase.cmd -ErrorAction Stop).Source
  $preservationRaw=& $preservationCli db query --linked --file scripts/security/preservation-snapshot.sql --output json
  if($LASTEXITCODE -ne 0){throw 'Falha na consulta; não considerar verificado.'}
  $preservationCurrent=($preservationRaw -join "`n")|ConvertFrom-Json
  if(-not $preservationCurrent.rows[0].preservation_snapshot){throw 'Resposta inesperada; não considerar verificado.'}
  $preservationRaw|Set-Content -LiteralPath $OutputFile -Encoding utf8
  Write-Output "Snapshot salvo: contagens/fingerprints de $($preservationCurrent.rows[0].preservation_snapshot.public_tables.Count) tabelas; nenhum dado de usuário retornado."
  if($CompareTo){
    $preservationPrevious=(Get-Content -LiteralPath $CompareTo -Raw|ConvertFrom-Json).rows[0].preservation_snapshot
    $preservationNow=$preservationCurrent.rows[0].preservation_snapshot
    $preservationDifferences=@()
    foreach($preservationTable in $preservationPrevious.public_tables){
      $preservationNew=@($preservationNow.public_tables|Where-Object table_name -EQ $preservationTable.table_name)
      if($preservationNew.Count -ne 1 -or $preservationNew[0].row_count -ne $preservationTable.row_count -or $preservationNew[0].row_fingerprint -ne $preservationTable.row_fingerprint){
        $preservationDifferences+=$preservationTable.table_name
      }
    }
    if($preservationPrevious.storage_objects.row_count -ne $preservationNow.storage_objects.row_count -or $preservationPrevious.storage_objects.row_fingerprint -ne $preservationNow.storage_objects.row_fingerprint){$preservationDifferences+='storage.objects'}
    if($preservationPrevious.auth_users -ne $preservationNow.auth_users){$preservationDifferences+='auth.users count'}
    if($preservationDifferences.Count -gt 0){throw "Snapshot mudou em: $($preservationDifferences -join ', '). Revisar antes de afirmar preservação. Compare antes do bootstrap, que adiciona um perfil legítimo."}
    Write-Output 'PASS: contagens e fingerprints de todas as tabelas prévias, metadata de objetos Storage e contagem Auth permanecem iguais.'
  }
}finally{Pop-Location}
