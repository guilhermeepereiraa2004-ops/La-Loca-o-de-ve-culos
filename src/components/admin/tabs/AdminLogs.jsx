import React, { useState } from 'react';
import { Search, Database, Clock, User, Filter, Activity, Eye, X, ShieldAlert } from 'lucide-react';

const AdminLogs = ({ logs = [], isDbConnected = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);


  const getActionBadgeColor = (action) => {
    const act = String(action).toLowerCase();
    if (act.includes('criar') || act.includes('adicionar')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (act.includes('atualizar') || act.includes('editar')) return 'bg-amber-50 text-amber-700 border-amber-100';
    if (act.includes('apagar') || act.includes('deletar') || act.includes('excluir')) return 'bg-red-50 text-red-700 border-red-100';
    if (act.includes('login')) return 'bg-blue-50 text-blue-700 border-blue-100';
    if (act.includes('encerrar')) return 'bg-neutral-900 text-white border-neutral-800';
    return 'bg-neutral-50 text-neutral-600 border-neutral-200';
  };

  // Get unique modules and actions for filters
  const uniqueActions = ['all', ...new Set(logs.map(log => log.action).filter(Boolean))];
  const uniqueModules = ['all', ...new Set(logs.map(log => log.targetType).filter(Boolean))];

  // Filtering logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetId || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesModule = moduleFilter === 'all' || log.targetType === moduleFilter;

    return matchesSearch && matchesAction && matchesModule;
  });

  const formatLogDate = (dateStr) => {
    if (!dateStr) return '---';
    try {
      let rawStr = dateStr;
      if (!rawStr.endsWith('Z') && rawStr.includes('T')) {
        rawStr = rawStr + 'Z';
      }
      const d = new Date(rawStr);
      return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' ' + d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h3 className="text-4xl font-black uppercase tracking-tighter">Logs do Sistema</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Audit trail e histórico de movimentações dos administradores.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isDbConnected ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Nuvem Ativa
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Modo Local
            </div>
          )}
        </div>
      </div>

      {/* Banner de setup SQL removido pois a tabela foi devidamente criada no Supabase */}

      {/* Filters Toolbar */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, usuário, e-mail, ID..."
            className="w-full pl-14 pr-6 py-4 bg-neutral-50 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:bg-white border-2 border-transparent focus:border-[#C5A059]/30 transition-all text-sm font-bold placeholder:text-neutral-300"
          />
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-100">
          <Filter size={14} className="text-neutral-400" />
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Ação</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-xs font-black uppercase text-neutral-800 outline-none cursor-pointer"
          >
            <option value="all">TODAS</option>
            {uniqueActions.filter(a => a !== 'all').map(act => (
              <option key={act} value={act}>{String(act).toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Module filter */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-100">
          <Activity size={14} className="text-neutral-400" />
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Módulo</span>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-transparent text-xs font-black uppercase text-neutral-800 outline-none cursor-pointer"
          >
            <option value="all">TODOS</option>
            {uniqueModules.filter(m => m !== 'all').map(mod => (
              <option key={mod} value={mod}>{String(mod).toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-24 px-8">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
              <Clock size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Nenhum registro encontrado</p>
            <p className="text-xs text-neutral-300 mt-2 font-light">Tente limpar os filtros ou realizar ações no painel para gerar logs.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px] md:min-w-0">
                <thead>
                  <tr className="bg-neutral-100/50 text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-black border-b border-neutral-100">
                    <th className="px-4 py-3 xl:px-5 xl:py-4">Data e Hora</th>
                    <th className="px-4 py-3 xl:px-5 xl:py-4">Usuário</th>
                    <th className="px-4 py-3 xl:px-5 xl:py-4 text-center">Ação</th>
                    <th className="px-4 py-3 xl:px-5 xl:py-4">Módulo / Tabela</th>
                    <th className="px-4 py-3 xl:px-5 xl:py-4">Descrição da Atividade</th>
                    <th className="px-4 py-3 xl:px-5 xl:py-4 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-[11px] font-medium text-neutral-700">
                  {filteredLogs.map((log, idx) => (
                    <tr key={`${log.id || 'log'}-${idx}`} className="hover:bg-neutral-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3 xl:px-5 xl:py-3.5 shrink-0 whitespace-nowrap text-neutral-400 font-bold">
                        {formatLogDate(log.createdAt || log.created_at)}
                      </td>
                      
                      {/* User profile */}
                      <td className="px-4 py-3 xl:px-5 xl:py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-[#C5A059] flex items-center justify-center font-black text-xs shrink-0 uppercase">
                            {String(log.userName || log.user_name || '?').charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-neutral-900 leading-tight">{log.userName || log.user_name || 'Sistema'}</p>
                            <p className="text-[9px] text-neutral-400 leading-none mt-0.5">{log.userEmail || log.user_email || 'system@la.com'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="px-4 py-3 xl:px-5 xl:py-3.5 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Target Type */}
                      <td className="px-4 py-3 xl:px-5 xl:py-3.5 text-neutral-900 font-black uppercase tracking-wider">
                        {log.targetType || 'Auth'}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 xl:px-5 xl:py-3.5 text-neutral-600 font-sans leading-relaxed">
                        {log.description}
                        {log.targetId && (
                          <span className="ml-2 font-mono text-[9px] bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-200">
                            #{String(log.targetId).substring(0, 8)}
                          </span>
                        )}
                      </td>

                      {/* JSON Details Button */}
                      <td className="px-4 py-3 xl:px-5 xl:py-3.5 text-right">
                        {log.details ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-[#C5A059]/10 hover:border-[#C5A059]/30 border border-transparent transition-all ml-auto"
                            title="Ver Detalhes do JSON"
                          >
                            <Eye size={14} />
                          </button>
                        ) : (
                          <span className="text-neutral-300 text-[10px] pr-2">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden divide-y divide-neutral-100">
              {filteredLogs.map((log, idx) => (
                <div key={`${log.id || 'log'}-${idx}`} className="p-5 flex flex-col gap-4 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-[#C5A059] flex items-center justify-center font-black text-xs shrink-0 uppercase">
                        {String(log.userName || log.user_name || '?').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-neutral-900 leading-tight truncate">{log.userName || log.user_name || 'Sistema'}</p>
                        <p className="text-[9px] text-neutral-400 leading-none mt-0.5 truncate">{log.userEmail || log.user_email || 'system@la.com'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Módulo:</span>
                      <span className="font-black text-[#C5A059] uppercase tracking-wider">{log.targetType || 'Auth'}</span>
                    </div>
                    <p className="text-neutral-600 font-sans leading-relaxed">
                      {log.description}
                      {log.targetId && (
                        <span className="ml-2 font-mono text-[9px] bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-200">
                          #{String(log.targetId).substring(0, 8)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-between items-center gap-4 pt-1">
                    <span className="text-[9px] text-neutral-400 font-bold">
                      {formatLogDate(log.createdAt || log.created_at)}
                    </span>
                    {log.details ? (
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 bg-neutral-50 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-[#C5A059]/10 border border-neutral-200 transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest active:scale-95"
                        title="Ver Detalhes do JSON"
                      >
                        <Eye size={12} /> Detalhes JSON
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* JSON Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setSelectedLog(null)} />
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col border border-neutral-100">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059]">
                  <Database size={22} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter">Detalhes do Registro</h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Payload e dados da transação</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="w-10 h-10 bg-neutral-50 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-400 font-bold uppercase">Operador</span>
                  <span className="text-neutral-950 font-black">{selectedLog.userName} ({selectedLog.userEmail})</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-400 font-bold uppercase">Ação / Módulo</span>
                  <span className="text-neutral-950 font-black uppercase tracking-wider">{selectedLog.action} / {selectedLog.targetType}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-400 font-bold uppercase">Data e Hora</span>
                  <span className="text-neutral-950 font-black">{formatLogDate(selectedLog.createdAt || selectedLog.created_at)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Dados Brutos (JSON)</label>
                <div className="bg-neutral-950 rounded-3xl p-6 overflow-x-auto text-neutral-300 font-mono text-[10px] leading-relaxed max-h-80 custom-scrollbar border border-white/5">
                  <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedLog(null)} 
                className="px-10 py-4 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
