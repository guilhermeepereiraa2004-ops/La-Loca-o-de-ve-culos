// Write permissions belong to the operation's module. Reading related data
// (for example investor vehicles) never grants permission to upload or change it.
const UPLOAD_MODULES = Object.freeze({
  condutores: Object.freeze(['clientes', 'locacao']),
  veiculos: Object.freeze(['frota']),
  vistorias: Object.freeze(['vistoria']),
  manutencoes: Object.freeze(['manutencaoAdmin', 'oficina']),
  contratos: Object.freeze(['locacao', 'faturamento']),
});

export function canOperate(profile, requiredModules) {
  if (!Array.isArray(requiredModules) || !requiredModules.length) return false;
  if (profile?.role === 'administrador') return true;
  return ['funcionario', 'gerente'].includes(profile?.role) && Array.isArray(profile.modules)
    && requiredModules.some(module => profile.modules.includes(module));
}

export function canUploadToFolder(profile, folder, isPublic = false) {
  if (typeof folder !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)) return false;
  if (isPublic && folder !== 'veiculos') return false;
  const moduleOwner = folder.split('/')[0];
  if (!Object.hasOwn(UPLOAD_MODULES, moduleOwner)) return false;
  return canOperate(profile, UPLOAD_MODULES[moduleOwner]);
}
