# Operação de segurança

O sistema usa Supabase Auth e autorização no PostgreSQL. E-mails, cadastros,
veículos, movimentações e seus IDs são preservados na migração. A conta de
acesso é vinculada pelo campo `auth_user_id`; senhas legadas nunca são usadas
como alternativa ao Auth. Nenhuma credencial de serviço pode usar prefixo `VITE_`.

## Configuração

- Navegador: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (pública).
- Vercel, somente servidor: `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
  `SUPABASE_SERVICE_ROLE_KEY`, com escopo de ambiente correto.
- Supabase Edge Functions: implantar `secure-upload`. Ela verifica a identidade
  com `getUser` e as permissões atuais antes de usar a credencial de serviço
  fornecida pelo ambiente. Upload direto do navegador ao Storage é negado.
- Turnstile opcional: configurar as duas variáveis `VITE_TURNSTILE_SITE_KEY` e
  `TURNSTILE_SECRET_KEY`, ou manter ambas ausentes. Sem chaves não há CAPTCHA;
  continuam a validação, honeypot e limite por IP no servidor.
- Auth: desabilitar cadastro público, exigir senha forte, configurar limites,
  recuperação e MFA administrativo. Exigir senha atual no provedor para trocas;
  o cliente envia `current_password`, mas a configuração servidor é obrigatória.

## Migração de acesso

1. Revisar o arquivo de migração e obter autorização específica antes de alterar
   policies/grants de produção. Uma contenção emergencial não autoriza o corte
   definitivo automaticamente.
2. Testar a migração em ambiente separado com contas A/B/admin/funcionário.
   Não executar `db reset`, seeds nem replay de correções históricas em produção.
3. Revisar identidades/e-mails/papéis fora de canais públicos. Preparar manifesto
   privado e executar `scripts/security/provision-auth.mjs --manifest <arquivo>`.
   O padrão é dry-run. `--apply` exige autorização e revisão do manifesto.
4. Vincular identidades Auth aos cadastros existentes, com **senhas novas**.
   Não é necessário recadastrar investidores, clientes, veículos ou histórico.
5. Publicar funções, configurar variáveis e publicar o frontend em conjunto com
   o corte do banco. Validar leitura/escrita pelo REST, isolamento A/B e documentos.
   Em falha, manter os acessos bloqueados; não restaurar policies públicas antigas.

## Verificação

Use Node 24.22.1 ou patch posterior da linha24 e `npm ci --ignore-scripts`.
Execute `npm run test:security`, `npm run build` e `npm audit`.

`scripts/security/test-rls.mjs` testa a contenção e a migração em PostgreSQL
embarcado com dados sintéticos. Pode usar `PGLITE_MODULE_PATH` para uma instalação
de teste de `@electric-sql/pglite@0.5.11`. Opcionalmente,
`SECURITY_SCHEMA_METADATA_FILE` aponta para um export privado de tipos/chaves do
catálogo real, sem linhas de negócio. Não compartilhar esse arquivo no Git.

As evidências privadas e o relatório do incidente ficam em `security-audit/`,
excluídos de Git/deploy. Dumps e planilhas permanecem no computador quando
retirados do índice Git. Isso não apaga versões antigas, clones ou cópias já
baixadas. Revogação de credenciais e limpeza de histórico são operações
separadas, que exigem aprovação e coordenação.

A CSP completa começa em Report-Only enquanto OCR/arquivos são verificados no
navegador. Não a considerar uma barreira completa contra XSS até ativar e testar
a política de bloqueio.
