import React from 'react';
const LABELS = { system_users: 'Usuários', vehicles: 'Frota', clients: 'Clientes', rentals: 'Locações', leads: 'Leads', investors: 'Investidores', transactions: 'Financeiro', maintenances: 'Manutenções', inspections: 'Vistorias', service_orders: 'Ordens de serviço', investor_notices: 'Avisos', system_logs: 'Logs', system_fines: 'Multas', workshop_appointments: 'Agenda', workshop_quotes: 'Orçamentos', workshop_inventory: 'Estoque', workshop_financials: 'Financeiro da oficina', replacement_contracts: 'Substituições', oil_changes: 'Trocas de óleo' };
export default function DataLoadStatus({ loading, errors = {}, onRetry }) {
  const failures = Object.entries(errors);
  if (!loading && !failures.length) return null;
  return <aside role={failures.length ? 'alert' : 'status'} aria-live="polite" className="fixed bottom-5 left-5 z-[900] max-w-md rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-xl text-sm">
    {loading && <p className="font-bold">Carregando dados do sistema…</p>}
    {failures.length > 0 && <>
      <p className="font-bold">{errors.audit ? 'Não foi possível registrar uma atividade. Confira a operação antes de repeti-la.' : 'Alguns dados não puderam ser atualizados.'}</p>
      <ul className="mt-2 list-disc pl-5 text-xs text-neutral-600">{failures.slice(0, 6).map(([key, failure]) => <li key={key}>{LABELS[key.split(':')[0]] || 'Arquivos'}{failure.attachment ? ' — anexos' : ''} ({failure.code})</li>)}</ul>
      {failures.length > 6 && <p className="mt-2 text-xs">Mais {failures.length - 6} carregamentos pendentes.</p>}
      <button type="button" disabled={loading} onClick={onRetry} className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Tentar novamente</button>
    </>}
  </aside>;
}
