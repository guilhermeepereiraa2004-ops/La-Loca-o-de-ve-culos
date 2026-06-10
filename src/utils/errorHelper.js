export const parseDbError = (err) => {
  if (!err) return 'Erro desconhecido.';
  const errMsg = (err.message || err.toString() || '').toLowerCase();
  
  if (errMsg.includes('unique constraint') || errMsg.includes('duplicate key')) {
    if (errMsg.includes('email')) return 'Este e-mail já está em uso no sistema.';
    if (errMsg.includes('cpf') || errMsg.includes('cnpj') || errMsg.includes('document')) return 'Este CPF/CNPJ já está cadastrado no sistema.';
    if (errMsg.includes('plate') || errMsg.includes('placa')) return 'Esta placa já está cadastrada no sistema.';
    if (errMsg.includes('renavam')) return 'Este Renavam já está cadastrado no sistema.';
    if (errMsg.includes('chassis') || errMsg.includes('chassi')) return 'Este Chassi já está cadastrado no sistema.';
    return 'Um registro com estes dados já existe (cadastro duplicado). Verifique se o item já não foi cadastrado.';
  }
  
  if (errMsg.includes('foreign key constraint')) {
    return 'Não é possível concluir a ação pois o registro está vinculado a outros dados importantes do sistema (ex: locações, transações).';
  }

  if (errMsg.includes('violates row-level security')) {
    return 'Você não tem permissão para realizar esta operação.';
  }

  return err.message || 'Erro inesperado no servidor.';
};
