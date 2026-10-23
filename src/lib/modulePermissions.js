const OPERATIONAL_MODULES = new Set([
  'frota', 'leads', 'locacao', 'clientes', 'investidores', 'financeiro',
  'faturamento', 'caucao', 'manutencaoAdmin', 'vistoria', 'multas', 'oficina', 'avisos',
]);

// UI guidance only: PostgreSQL and server endpoints always enforce authorization.
export function canOperateModule(profile, module) {
  if (!profile || !OPERATIONAL_MODULES.has(module)) return false;
  return profile.role === 'administrador' ||
    (['funcionario', 'gerente'].includes(profile.role) && Array.isArray(profile.modules) && profile.modules.includes(module));
}
