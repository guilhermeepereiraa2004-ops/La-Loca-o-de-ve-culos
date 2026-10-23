// Fetch metadata independently; signing thousands of attachment URLs must never block another dataset.
export async function loadDataResources(resources, {
  onData, onHydrated = () => {}, onError, onAttachmentError = () => {}, onProgress = () => {},
  hydrate, isActive = () => true, concurrency = 4, timeoutMs = 45000,
}) {
  let next = 0;
  let completed = 0;
  const results = {};
  const attachmentJobs = [];
  const deadline = async task => {
    let timer;
    try { return await Promise.race([Promise.resolve().then(task), new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('Data request timed out'), { code: 'TIMEOUT' })), timeoutMs); })]); }
    finally { clearTimeout(timer); }
  };
  const worker = async () => {
    while (next < resources.length && isActive()) {
      const resource = resources[next++];
      try {
        const rows = await deadline(resource.load);
        if (!isActive()) return;
        const projected = resource.project ? resource.project(rows) : rows;
        results[resource.key] = projected;
        onData(resource.key, projected);
        if (hydrate && resource.hydrate !== false && projected.length) attachmentJobs.push(async () => {
          try {
            const hydrated = await hydrate(projected);
            if (isActive()) onHydrated(resource.key, projected, hydrated);
          } catch (error) { if (isActive()) onAttachmentError(resource.key, error); }
        });
      } catch (error) { if (isActive()) onError(resource.key, error); }
      finally { if (isActive()) onProgress(++completed, resources.length); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, resources.length) }, worker));
  // Metadata is already visible. Only now resolve private attachment previews, in the background.
  let attachmentIndex = 0;
  const hydrateWorker = async () => {
    while (attachmentIndex < attachmentJobs.length && isActive()) await attachmentJobs[attachmentIndex++]();
  };
  const hydration = Promise.all(Array.from({ length: Math.min(2, attachmentJobs.length) }, hydrateWorker));
  return { results, hydration };
}

// Keep edits made after a list loaded while applying only unchanged URL/document fields.
export function mergeHydratedRecords(current, original, hydrated) {
  if (Object.is(current, original)) return hydrated;
  if (Array.isArray(current) && Array.isArray(original) && Array.isArray(hydrated)) {
    if (current.length !== original.length || original.length !== hydrated.length) return current;
    return current.map((value, index) => mergeHydratedRecords(value, original[index], hydrated[index]));
  }
  if (current && original && hydrated && typeof current === 'object' && typeof original === 'object' && typeof hydrated === 'object' && !Array.isArray(current)) {
    const next = { ...current };
    for (const [key, value] of Object.entries(hydrated)) {
      if (Object.hasOwn(current, key) && Object.hasOwn(original, key)) next[key] = mergeHydratedRecords(current[key], original[key], value);
      // Derived fields may not exist in the raw snapshot. Add them only if the user did not supply a value meanwhile.
      else if (!Object.hasOwn(current, key) && !Object.hasOwn(original, key)) next[key] = value;
    }
    return next;
  }
  return current;
}

function retainUnresolvedReferences(original, hydrated) {
  if (hydrated == null && typeof original === 'string' && (original.startsWith('storage://') || original.includes('/storage/v1/object/'))) return original;
  if (Array.isArray(original) && Array.isArray(hydrated)) return hydrated.map((value, index) => retainUnresolvedReferences(original[index], value));
  if (original && hydrated && typeof original === 'object' && typeof hydrated === 'object' && !Array.isArray(hydrated)) {
    return Object.fromEntries(Object.entries(hydrated).map(([key, value]) => [key, retainUnresolvedReferences(original[key], value)]));
  }
  return hydrated;
}

export function applyHydratedRows(current, original, hydrated) {
  const source = new Map(original.map(row => [row.id, row]));
  const signed = new Map(hydrated.map(row => [row.id, retainUnresolvedReferences(source.get(row.id), row)]));
  return current.map(row => source.has(row.id) && signed.has(row.id) ? mergeHydratedRecords(row, source.get(row.id), signed.get(row.id)) : row);
}

// This mirrors the SQL permission map to avoid issuing requests for unavailable modules.
// PostgreSQL RLS remains the authorization boundary even if this client filter is bypassed.
const STAFF_DATASET_MODULES = {
  vehicles: ['frota','locacao','investidores','manutencaoAdmin','vistoria','oficina'], clients: ['clientes','locacao'],
  rentals: ['locacao','faturamento','caucao','multas'], leads: ['leads'], transactions: ['financeiro','faturamento','investidores','caucao'],
  maintenances: ['manutencaoAdmin','oficina'], inspections: ['vistoria'], service_orders: ['oficina','manutencaoAdmin'],
  replacement_contracts: ['oficina','locacao'], system_fines: ['multas','faturamento'], oil_changes: ['oficina','manutencaoAdmin'],
  workshop_appointments: ['oficina'], workshop_quotes: ['oficina'], workshop_inventory: ['oficina'], workshop_financials: ['oficina','financeiro'],
  investor_notices: ['investidores'], investors: ['investidores','frota'], system_logs: ['logs'],
};
const INVESTOR_DATASETS = new Set(['investor_notices','service_orders','vehicles','rentals','investors','transactions','maintenances','replacement_contracts','oil_changes']);
export function canLoadDataset(profile, table, { includeWorkshopFinancials = false } = {}) {
  if (!profile || (table === 'workshop_financials' && !includeWorkshopFinancials)) return false;
  if (profile.role === 'administrador') return Object.hasOwn(STAFF_DATASET_MODULES, table);
  if (profile.role === 'investidor') return INVESTOR_DATASETS.has(table);
  if (!['funcionario','gerente'].includes(profile.role) || !Array.isArray(profile.modules)) return false;
  return (STAFF_DATASET_MODULES[table] || []).some(module => profile.modules.includes(module));
}

export function enrichRentalReferencesWhenReady(current, snapshots, enrich) {
  if (!Array.isArray(snapshots.rentals) || !Array.isArray(snapshots.vehicles) || !Array.isArray(snapshots.clients)) return current;
  return applyHydratedRows(current, snapshots.rentals, enrich(snapshots.rentals, snapshots.vehicles, snapshots.clients));
}
