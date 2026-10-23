import React, { useState, useRef, useEffect } from 'react';
import { Bell, Plus, Trash2, Send, Video, Users, CheckCircle2, X, Youtube, Eye, Pencil } from 'lucide-react';
import { normalizeNoticeVideoUrl } from '../../../lib/noticePersistence.js';

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const canonical = normalizeNoticeVideoUrl(url);
    return canonical ? `https://www.youtube.com/embed/${new URL(canonical).searchParams.get('v')}` : null;
  } catch {
    return null;
  }
};

const formatNoticeDate = (dateStr) => {
  if (!dateStr) return '---';
  try {
    let rawStr = dateStr;
    if (!rawStr.endsWith('Z') && rawStr.includes('T')) {
      rawStr = rawStr + 'Z';
    }
    const d = new Date(rawStr);
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' às ' + d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
};

const emptyForm = () => ({ title: '', message: '', videoUrl: '', targetType: 'all', targetIds: [] });

const AdminAvisos = ({ noticeRecipients = [], notices = [], onAddNotice, onUpdateNotice, onDeleteNotice, canEdit = false }) => {
  const recipients = [...new Map(noticeRecipients.filter(item => item?.id && typeof item.name === 'string').map(item => [item.id, { id: item.id, name: item.name }])).values()];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNotice, setViewingNotice] = useState(null);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');
  const savePending = useRef(false);
  const requestId = useRef(null);
  const errorRef = useRef(null);
  const feedbackRef = useRef(null);
  useEffect(() => {
    if (!formError && !feedback) return;
    const frame = requestAnimationFrame(() => (formError ? errorRef : feedbackRef).current?.scrollIntoView({ block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [formError, feedback]);
  const closeEditor = () => {
    if (savePending.current) return;
    setIsModalOpen(false);
    requestId.current = null;
  };
  const openEditor = notice => {
    if (!canEdit || savePending.current || (notice ? !onUpdateNotice : !onAddNotice)) return;
    requestId.current = crypto.randomUUID();
    setEditingNotice(notice || null);
    setFormData(notice ? { title: notice.title || '', message: notice.message || '', videoUrl: notice.videoUrl || '', targetType: notice.targetType === 'selected' ? 'selected' : 'all', targetIds: [...(notice.targetIds || [])] } : emptyForm());
    setFormError('');
    setFeedback('');
    setIsModalOpen(true);
  };

  const handleToggleInvestor = (id) => {
    setFormData(prev => ({
      ...prev,
      targetIds: prev.targetIds.includes(id) 
        ? prev.targetIds.filter(i => i !== id) 
        : [...prev.targetIds, id]
    }));
  };

  const handleSelectAll = () => {
    if (recipients.length && recipients.every(item => formData.targetIds.includes(item.id))) {
      setFormData(prev => ({ ...prev, targetIds: [] }));
    } else {
      setFormData(prev => ({ ...prev, targetIds: [...new Set([...prev.targetIds, ...recipients.map(i => i.id)])] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savePending.current || !canEdit) return;
    if (!formData.title.trim() || !formData.message.trim() || (formData.targetType === 'selected' && formData.targetIds.length === 0)) {
      setFormError('Preencha o título, a mensagem e os destinatários.');
      return;
    }
    const payload = { title: formData.title.trim(), message: formData.message.trim(), videoUrl: formData.videoUrl || null, targetType: formData.targetType, targetIds: formData.targetType === 'selected' ? [...formData.targetIds] : null };
    if (editingNotice) {
      if (formData.title === (editingNotice.title || '')) delete payload.title;
      if (formData.message === (editingNotice.message || '')) delete payload.message;
      if (formData.videoUrl === (editingNotice.videoUrl || '')) delete payload.videoUrl;
      const targetsUnchanged = formData.targetType === editingNotice.targetType &&
        JSON.stringify([...formData.targetIds].sort()) === JSON.stringify([...(editingNotice.targetIds || [])].sort());
      if (targetsUnchanged) { delete payload.targetType; delete payload.targetIds; }
      if (Object.keys(payload).length === 0) {
        closeEditor();
        setFeedback('Nenhuma alteração foi necessária.');
        return;
      }
    }
    if (payload.videoUrl && !getYoutubeEmbedUrl(payload.videoUrl)) {
      setFormError('Informe um link válido de vídeo do YouTube.');
      return;
    }
    const save = editingNotice ? onUpdateNotice : onAddNotice;
    if (!save) return;
    savePending.current = true;
    setIsSaving(true);
    setFormError('');
    try {
      const result = await save({
        ...(editingNotice ? { id: editingNotice.id } : {}),
        requestId: requestId.current,
        ...payload,
      });
      if (result?.success !== true) {
        setFormError(result?.error?.message || 'Não foi possível salvar o aviso. Os dados continuam neste formulário para tentar novamente.');
        return;
      }
      setIsModalOpen(false);
      setFeedback(editingNotice ? 'Aviso atualizado. As leituras já registradas foram mantidas.' : 'Aviso enviado com sucesso.');
      setFormData(emptyForm());
      requestId.current = null;
    } catch {
      setFormError('Não foi possível confirmar o salvamento. Os dados continuam neste formulário para tentar novamente.');
    } finally {
      savePending.current = false;
      setIsSaving(false);
    }
  };

  const sortedNotices = [...notices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
            <Bell className="text-[#C5A059]" />
            Avisos para Investidores
          </h2>
          <p className="text-sm font-bold text-neutral-400 mt-1">{notices.length} aviso(s) enviado(s)</p>
        </div>
        {canEdit && onAddNotice && <button
          onClick={() => openEditor()}
          className="flex items-center gap-2 bg-[#C5A059] text-white px-5 py-2.5 rounded-xl hover:bg-[#B39050] transition-colors shadow-lg shadow-[#C5A059]/20 font-bold text-sm whitespace-nowrap"
        >
          <Plus size={18} />
          Novo Aviso
        </button>}
      </div>
      {feedback && <p ref={feedbackRef} role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{feedback}</p>}

      {/* List */}
      <div className="space-y-4">
        {sortedNotices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
            <Bell size={40} className="text-neutral-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-neutral-400">Nenhum aviso enviado ainda.</p>
          </div>
        ) : (
          sortedNotices.map((notice) => {
            const readCount = (notice.readBy || []).length;
            const totalTarget = notice.targetType === 'all' ? recipients.length : (notice.targetIds || []).length;
            return (
              <div key={notice.id} className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-black text-neutral-900 uppercase tracking-tight truncate">{notice.title}</h3>
                      {notice.videoUrl && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-100 rounded-lg text-[9px] font-black text-red-500 uppercase tracking-widest">
                          <Youtube size={10} /> Vídeo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 font-medium line-clamp-2 mb-3">{notice.message}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      <span>{formatNoticeDate(notice.createdAt)}</span>
                      <span className="text-neutral-200">•</span>
                      <span className="flex items-center gap-1">
                        <Users size={10} />
                        {notice.targetType === 'all' ? 'Todos' : `${(notice.targetIds || []).length} selecionado(s)`}
                      </span>
                      <span className="text-neutral-200">•</span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Eye size={10} />
                        {readCount}/{totalTarget} lido(s)
                      </span>
                      <span className="text-neutral-200">•</span>
                      <span>por {notice.createdBy || 'Admin'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit && onUpdateNotice && <button type="button" onClick={() => openEditor(notice)} title="Editar aviso" aria-label={`Editar aviso ${notice.title}`} className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                      <Pencil size={16} />
                    </button>}
                    <button
                      onClick={() => setViewingNotice(notice)}
                      className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                    </button>
                    {onDeleteNotice && <button
                      onClick={() => {
                        if (window.confirm('Deseja excluir este aviso? Ele será removido para todos os investidores.')) {
                          onDeleteNotice(notice.id);
                        }
                      }}
                      className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Notice Modal */}
      {viewingNotice && (
        <div role="dialog" aria-modal="true" aria-label="Visualizar aviso" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setViewingNotice(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                <Bell className="text-[#C5A059]" />
                {viewingNotice.title}
              </h3>
              <button onClick={() => setViewingNotice(null)} aria-label="Fechar visualização de aviso" className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <p className="text-sm text-neutral-700 font-medium whitespace-pre-wrap leading-relaxed">{viewingNotice.message}</p>
              {viewingNotice.videoUrl && getYoutubeEmbedUrl(viewingNotice.videoUrl) && (
                <div className="aspect-video rounded-xl overflow-hidden border border-neutral-200 shadow-inner">
                  <iframe
                    src={getYoutubeEmbedUrl(viewingNotice.videoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Vídeo do aviso"
                  ></iframe>
                </div>
              )}
              <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Quem leu este aviso</p>
                {(viewingNotice.readBy || []).length === 0 ? (
                  <p className="text-xs font-bold text-neutral-400">Nenhum investidor leu ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(viewingNotice.readBy || []).map(rid => {
                      const inv = recipients.find(i => i.id === rid);
                      return (
                        <span key={rid} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                          <CheckCircle2 size={10} />
                          {inv?.name || 'Investidor'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Notice Modal */}
      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-label={editingNotice ? 'Editar aviso' : 'Novo aviso'} aria-busy={isSaving} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={closeEditor}></div>
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                <Send className="text-[#C5A059]" />
                {editingNotice ? 'Editar Aviso' : 'Novo Aviso'}
              </h3>
              <button onClick={closeEditor} disabled={isSaving} aria-label="Fechar editor de aviso" className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors disabled:opacity-50">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <fieldset disabled={isSaving} className="space-y-5">
              {formError && <p ref={errorRef} role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{formError}</p>}
              {editingNotice && <p className="text-xs text-neutral-500">Criado por {editingNotice.createdBy || 'Admin'} em {formatNoticeDate(editingNotice.createdAt)}. As leituras já registradas serão mantidas.</p>}
              <div className="space-y-2">
                <label htmlFor="notice-title" className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Título do Aviso *</label>
                <input
                  id="notice-title"
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Ex: Relatório Mensal de Agosto"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="notice-message" className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Mensagem *</label>
                <textarea
                  id="notice-message"
                  required
                  maxLength={10000}
                  placeholder="Digite a mensagem que será enviada..."
                  value={formData.message}
                  onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-medium resize-none min-h-[120px]"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label htmlFor="notice-video" className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1 flex items-center gap-1">
                  <Video size={12} /> Link do Vídeo (YouTube — Opcional)
                </label>
                <input
                  id="notice-video"
                  type="url"
                  maxLength={2048}
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.videoUrl}
                  onChange={e => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold"
                />
                {formData.videoUrl && getYoutubeEmbedUrl(formData.videoUrl) && (
                  <div className="aspect-video rounded-xl overflow-hidden border border-neutral-200 mt-2">
                    <iframe
                      src={getYoutubeEmbedUrl(formData.videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Preview do vídeo"
                    ></iframe>
                  </div>
                )}
              </div>

              {/* Target Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Destinatários</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, targetType: 'all', targetIds: [] }))}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${
                      formData.targetType === 'all' 
                        ? 'bg-[#C5A059] text-white border-[#C5A059] shadow-lg shadow-[#C5A059]/20' 
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Users size={16} className="inline mr-2" />
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, targetType: 'selected' }))}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${
                      formData.targetType === 'selected' 
                        ? 'bg-[#C5A059] text-white border-[#C5A059] shadow-lg shadow-[#C5A059]/20' 
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <CheckCircle2 size={16} className="inline mr-2" />
                    Selecionar
                  </button>
                </div>

                {formData.targetType === 'selected' && (
                  <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 space-y-3 max-h-[200px] overflow-y-auto">
                    <button 
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[10px] font-black uppercase tracking-widest text-[#C5A059] hover:text-[#B39050]"
                    >
                      {recipients.length && recipients.every(item => formData.targetIds.includes(item.id)) ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                    {recipients.map(inv => (
                      <label 
                        key={inv.id} 
                        className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-neutral-100 transition-colors select-none"
                      >
                        <input type="checkbox" checked={formData.targetIds.includes(inv.id)} onChange={() => handleToggleInvestor(inv.id)} className="accent-[#C5A059]" />
                        <span className="text-sm font-bold text-neutral-700">{inv.name}</span>
                      </label>
                    ))}
                    {recipients.length === 0 && (
                      <p className="text-xs font-bold text-neutral-400 text-center py-2">Nenhum investidor cadastrado.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={closeEditor}
                  className="flex-1 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving || (formData.targetType === 'selected' && formData.targetIds.length === 0)}
                  className="flex-1 py-3 text-sm font-black text-white bg-[#C5A059] hover:bg-[#B39050] shadow-lg shadow-[#C5A059]/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  {isSaving ? 'Salvando…' : editingNotice ? 'Salvar alterações' : 'Enviar Aviso'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAvisos;
