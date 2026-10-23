const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INPUT_FIELDS = new Set(['id','requestId','title','message','videoUrl','targetType','targetIds']);
const YOUTUBE_QUERY = new Set(['v','t','start','time_continue','si','feature','ab_channel','rel','autoplay','controls','modestbranding','list','index','pp']);
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
const problem = (message, code = 'NOTICE_INPUT') => Object.assign(new Error(message), { code });
const own = (object, field) => Object.hasOwn(object, field);

function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw problem(`Confira ${label} do aviso.`);
  }
  return value.trim();
}

export function normalizeNoticeVideoUrl(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\%#]/.test(value)) throw problem('Informe um link HTTPS válido do YouTube.');
  let url;
  try { url = new URL(value); } catch { throw problem('Informe um link HTTPS válido do YouTube.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be'].includes(url.hostname) ||
      [...url.searchParams].length > 16 || [...url.searchParams].some(([key, val]) => !YOUTUBE_QUERY.has(key) || !/^[A-Za-z0-9_.~-]*$/.test(val)) ||
      new Set(url.searchParams.keys()).size !== [...url.searchParams].length || url.hash) throw problem('Informe um link HTTPS válido do YouTube.');
  let id;
  if (['youtu.be','www.youtu.be'].includes(url.hostname)) id = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  else if (url.pathname === '/watch') {
    if (url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v');
  } else id = /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  if (url.pathname !== '/watch' && url.searchParams.has('v')) throw problem('Informe um link de vídeo válido do YouTube.');
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) throw problem('Informe um link de vídeo válido do YouTube.');
  return `https://www.youtube.com/watch?v=${id}`;
}

function targetIds(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500 || value.some(id => typeof id !== 'string' || !UUID.test(id)) || new Set(value.map(id => id.toLowerCase())).size !== value.length) {
    throw problem('Selecione entre 1 e 500 investidores válidos, sem repetição.');
  }
  return value.map(id => id.toLowerCase());
}

export function buildNoticeCommand(input, { operation = 'create' } = {}) {
  if (!plain(input) || Object.keys(input).some(key => !INPUT_FIELDS.has(key)) || !['create','update'].includes(operation) ||
      typeof input.requestId !== 'string' || !UUID.test(input.requestId) ||
      (operation === 'create' && input.id != null) || (operation === 'update' && (typeof input.id !== 'string' || !UUID.test(input.id)))) {
    throw problem('Reabra o formulário do aviso e confira os dados.');
  }
  const payload = {};
  if (operation === 'create' || own(input, 'title')) payload.title = text(input.title, 200, 'o título');
  if (operation === 'create' || own(input, 'message')) payload.message = text(input.message, 10000, 'a mensagem');
  if (own(input, 'videoUrl')) payload.video_url = normalizeNoticeVideoUrl(input.videoUrl);
  if (operation === 'create' || own(input, 'targetType')) {
    const type = input.targetType ?? 'all';
    if (!['all','selected'].includes(type)) throw problem('Escolha os destinatários do aviso.');
    payload.target_type = type;
    if (type === 'all') {
      if (input.targetIds != null && (!Array.isArray(input.targetIds) || input.targetIds.length)) throw problem('Use a seleção de investidores para destinatários específicos.');
      payload.target_ids = null;
    } else payload.target_ids = targetIds(input.targetIds);
  } else if (own(input, 'targetIds')) throw problem('Escolha o tipo de destinatário ao alterar a seleção.');
  if (!Object.keys(payload).length) throw problem('Informe os dados que deseja alterar no aviso.');
  return { p_id: operation === 'update' ? input.id : null, p_notice: payload, p_request_id: input.requestId };
}

function validateReceipt(data, command) {
  const row = data?.notice;
  const legacyIds = value => value === null || (Array.isArray(value) && value.every(id => id === null || (typeof id === 'string' && UUID.test(id))));
  if (!plain(data) || !plain(row) || typeof row.id !== 'string' || !UUID.test(row.id) || (command.p_id && row.id.toLowerCase() !== command.p_id.toLowerCase()) ||
      typeof row.title !== 'string' || typeof row.message !== 'string' ||
      !['all','selected'].includes(row.target_type) || !legacyIds(row.read_by) ||
      (row.created_by != null && typeof row.created_by !== 'string') || (row.video_url != null && typeof row.video_url !== 'string') ||
      typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) {
    throw problem('O resultado do aviso não foi confirmado. Confira a lista antes de repetir.', 'UNCONFIRMED_RESULT');
  }
  let ids;
  try {
    // An update that omits video_url preserves a legacy stored URL verbatim.
    if (own(command.p_notice, 'video_url') && (row.video_url ?? null) !== normalizeNoticeVideoUrl(row.video_url)) throw problem('Vídeo inválido.');
    // Nullable array elements and older limits are valid stored schema values.
    // Only explicitly edited business fields must match the new strict DTO.
    if (!own(command.p_notice, 'target_ids')) {
      if (!legacyIds(row.target_ids)) throw problem('Destinatários inválidos.');
      ids = row.target_ids;
    } else if (row.target_type === 'all') {
      if (row.target_ids !== null) throw problem('Destinatários inválidos.');
      ids = null;
    } else ids = targetIds(row.target_ids);
  } catch { throw problem('O resultado do aviso não foi confirmado. Confira a lista antes de repetir.', 'UNCONFIRMED_RESULT'); }
  for (const [key, value] of Object.entries(command.p_notice)) {
    const actual = key === 'target_ids' ? ids : row[key];
    if (Array.isArray(value) ? !Array.isArray(actual) || value.length !== actual.length || value.some((id, i) => id !== actual[i]) : actual !== value) {
      throw problem('O resultado do aviso não foi confirmado. Confira a lista antes de repetir.', 'UNCONFIRMED_RESULT');
    }
  }
  return { notice: Object.fromEntries(['id','title','message','video_url','target_type','target_ids','read_by','created_at','created_by'].map(key => [key, row[key]])) };
}

// Keep one instance per mounted verified session; clear it on logout/identity change.
export function createNoticePersistence({ client, timeoutMs = 45000 }) {
  let owner = null, generation = 0;
  const active = new Map();
  const sessionChanged = () => problem('O acesso mudou durante o envio. Confira a lista antes de repetir.', 'SESSION_CHANGED');
  const clear = () => {
    owner = null; generation++;
    for (const [controller, cancel] of active) { controller.abort(); cancel(sessionChanged()); }
    active.clear();
  };
  const save = async (input, { ownerId, operation = 'create' } = {}) => {
    if (typeof ownerId !== 'string' || !UUID.test(ownerId)) throw problem('Entre novamente e reabra o formulário do aviso.');
    const command = buildNoticeCommand(input, { operation });
    if (owner !== ownerId) { clear(); owner = ownerId; }
    const current = generation;
    const checkOwner = () => { if (current !== generation || owner !== ownerId) throw sessionChanged(); };
    const controller = new AbortController();
    let timer;
    try {
      checkOwner();
      const cancelled = new Promise((_, reject) => active.set(controller, reject));
      let request = client.rpc('save_notice', command);
      if (typeof request.abortSignal === 'function') request = request.abortSignal(controller.signal);
      const deadline = new Promise((_, reject) => { timer = setTimeout(() => {
        controller.abort(); reject(problem('A confirmação do aviso demorou. Confira a lista antes de repetir.', 'TIMEOUT'));
      }, timeoutMs); });
      const result = await Promise.race([request, deadline, cancelled]);
      checkOwner();
      if (result?.error) throw result.error;
      return validateReceipt(result?.data, command);
    } catch (error) { checkOwner(); throw error; }
    finally { clearTimeout(timer); active.delete(controller); }
  };
  return { save, clear };
}
