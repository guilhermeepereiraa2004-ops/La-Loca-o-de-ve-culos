<#
Apply only the reviewed Auth/RLS migration, never replay historical data migrations.
Default is local DRY RUN. Production requires the owner's separate cutover approval.

  .\scripts\security\apply-security-cutover.ps1
  .\scripts\security\apply-security-cutover.ps1 -Apply -ExpectedSHA256 <reviewed-hash>

Emergency containment has its own approval; it does NOT authorize this full cutover.
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$ExpectedSHA256
)
$ErrorActionPreference = 'Stop'
$securityRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$securityMigrationVersion = '20261023162033'
$securityMigration = Join-Path $securityRoot 'supabase/migrations/20261023162033_security_auth_rls_containment.sql'
$securityProjectRef = 'ucfzkzpmvjekgotexriq'
$securityMigrationHash = (Get-FileHash -LiteralPath $securityMigration -Algorithm SHA256).Hash
$securityLinkedRef = (Get-Content -LiteralPath (Join-Path $securityRoot 'supabase/.temp/project-ref') -Raw).Trim()
if ($securityLinkedRef -ne $securityProjectRef) { throw 'Projeto vinculado divergente; nenhuma alteração.' }
if ($ExpectedSHA256 -and $ExpectedSHA256 -ne $securityMigrationHash) { throw 'Hash divergente; revise a versão exata antes de aplicar.' }
Write-Output "Projeto: $securityProjectRef"
Write-Output "Migration: $securityMigrationVersion"
Write-Output "SHA256: $securityMigrationHash"
if (-not $Apply) {
  Write-Output 'DRY RUN local: nenhum SQL remoto executado. Após revisar e obter aprovação específica do corte definitivo, use -Apply -ExpectedSHA256 com o hash acima.'
  return
}
if (-not $ExpectedSHA256) { throw 'A aplicação exige -ExpectedSHA256 da migration revisada.' }
Push-Location -LiteralPath $securityRoot
try {
  $securityCli = (Get-Command supabase.cmd -ErrorAction Stop).Source
  $securityAlreadySql = "select count(*)::integer as applied from supabase_migrations.schema_migrations where version='$securityMigrationVersion'"
  $securityAlreadyRaw = & $securityCli db query --linked $securityAlreadySql --output json
  if ($LASTEXITCODE -ne 0) { throw 'Pré-checagem remota falhou; nenhuma migration aplicada.' }
  $securityAlready = ($securityAlreadyRaw -join "`n") | ConvertFrom-Json
  if ($securityAlready.rows[0].applied -ne 0) { throw 'Migration já registrada. Não executar novamente.' }
  $securityResult = & $securityCli db query --linked --file $securityMigration --output json
  if ($LASTEXITCODE -ne 0) { throw 'Migration falhou. Não registrar versão; manter contenção e revisar a transação.' }
  $securityResult | Set-Content -LiteralPath (Join-Path $securityRoot 'security-audit/full-cutover-applied.json') -Encoding utf8
  # Record just this exact version after a successful transaction. This does not
  # run any old data correction, seed, reset, squash or push.
  & $securityCli migration repair --linked --status applied $securityMigrationVersion
  if ($LASTEXITCODE -ne 0) {
    throw 'A migration FOI aplicada, mas o registro de versão falhou. NÃO reaplique o SQL. Revise e registre só a versão aplicada com migration repair.'
  }
  $securityVerifySql = "select jsonb_build_object('anon_system_password',has_column_privilege('anon','public.system_users','password','SELECT'),'authenticated_investor_password',has_column_privilege('authenticated','public.investors','password','SELECT'),'anon_rate_rpc',has_function_privilege('anon','public.consume_security_rate_limit(text,integer,integer)','EXECUTE'),'authenticated_rate_rpc',has_function_privilege('authenticated','public.consume_security_rate_limit(text,integer,integer)','EXECUTE'),'service_role_rate_rpc',has_function_privilege('service_role','public.consume_security_rate_limit(text,integer,integer)','EXECUTE'),'legacy_bucket_public',(select public from storage.buckets where id='La-locacao')) as verification"
  $securityVerification = & $securityCli db query --linked $securityVerifySql --output json
  if ($LASTEXITCODE -ne 0) { throw 'Migration aplicada e registrada; falta concluir a verificação. Não reexecute o SQL.' }
  $securityVerification | Set-Content -LiteralPath (Join-Path $securityRoot 'security-audit/full-cutover-verified.json') -Encoding utf8
  Write-Output $securityVerification
  Write-Output 'Migration isolada aplicada e registrada. Complete provisionamento, testes Auth/REST A/B, upload e advisors antes de reabrir os painéis.'
} finally { Pop-Location }
