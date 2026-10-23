# Verificação em duas etapas da administração

A inscrição por aplicativo autenticador é individual. Nenhuma conta é obrigada a fornecer um código antes de o próprio titular cadastrar e verificar um fator. Um cadastro iniciado e não verificado não bloqueia o painel.

## Ativação pelo titular

1. Entre no painel administrativo e abra **Segurança 2FA**.
2. Confirme sua senha atual. A verificação usa uma sessão temporária separada da sessão do painel.
3. Configure o QR diretamente em seu aplicativo autenticador. Prepare uma cópia segura do autenticador em outro aparelho ou gerenciador antes de ativar. O QR e a chave manual são credenciais privadas: não os envie em conversas, chamados ou capturas de tela.
4. Informe o código de seis dígitos e confirme a ativação.
5. Para trocar de aparelho, adicione e teste um autenticador de reserva antes de remover o anterior. A interface não remove o último autenticador.

Depois da ativação, novos acessos exigem senha e código. Um link individual de recuperação de senha também exige o autenticador antes de permitir a alteração da senha.

## Perda dos autenticadores

Use o autenticador de reserva. Se todas as cópias forem perdidas, um operador com acesso administrativo ao projeto Supabase deverá conferir a identidade do titular por um procedimento externo, revogar suas sessões e remover os fatores afetados no Auth. Não existe uma rota pública de remoção de fatores nem recuperação de MFA apenas por senha ou link. Depois da recuperação, o titular deve cadastrar e verificar um novo autenticador. Essa operação é manual e não é executada automaticamente pela aplicação.

## Requisitos de publicação e limites

- Habilitar inscrição e verificação TOTP no Supabase Auth. SMTP e novos redirecionamentos não são necessários para TOTP.
- Publicar a aplicação e o endpoint de gestão de contas com `requireVerifiedMfa` integrado; aplicar a migração `20261023181455_conditional_mfa_enforcement.sql`.
- O endpoint valida o usuário e as claims assinadas do bearer original. Uma reautenticação de senha em outra sessão não substitui a comprovação AAL2 desse bearer.
- A migração restringe os módulos e as operações da equipe usando os fatores verificados no Auth e o nível AAL do JWT. O próprio perfil mínimo de equipe continua legível para completar o desafio. Cadastro não verificado não exige AAL2.
- A inscrição é oferecida aos administradores. As contas, senhas e políticas próprias dos investidores foram mantidas conforme o escopo adiado.
- A conclusão real da inscrição precisa ser feita pelo titular, diretamente na interface; agentes não devem acessar o QR, a chave ou os códigos.

## Referências

- [Supabase: TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Supabase: verificar um desafio](https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify)
- [Supabase: remoção de fator](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll)
