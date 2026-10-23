export async function recordActivity(client, { action, targetType, targetId, description, details = null }) {
  const controller = new AbortController();
  let timer;
  let request = client.rpc('record_system_activity', {
    p_action: action, p_target_type: targetType || null, p_target_id: String(targetId ?? ''),
    p_description: description, p_details: details,
  });
  if (typeof request.abortSignal === 'function') request = request.abortSignal(controller.signal);
  let result;
  try { result = await Promise.race([request, new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('O registro da atividade demorou.')); },10000); })]); }
  finally { clearTimeout(timer); }
  const { data, error } = result;
  if (error) throw error;
  if (!data?.log?.id || !data.log.created_at || data.log.action !== action || data.log.target_id !== String(targetId ?? '')) throw new Error('O registro da atividade não foi confirmado.');
  return data.log;
}
