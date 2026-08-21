import React, { useState } from 'react';
import { Bell, Plus, Trash2, Send, Video, Users, CheckCircle2, X, Youtube, Eye } from 'lucide-react';

const getYoutubeEmbedUrl = (url) => {
  if (!url) return null;
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    }
  } catch (e) {
    return null;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
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

const AdminAvisos = ({ investors = [], notices = [], onAddNotice, onDeleteNotice }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNotice, setViewingNotice] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    videoUrl: '',
    targetType: 'all',
    targetIds: []
  });

  const handleToggleInvestor = (id) => {
    setFormData(prev => ({
      ...prev,
      targetIds: prev.targetIds.includes(id) 
        ? prev.targetIds.filter(i => i !== id) 
        : [...prev.targetIds, id]
    }));
  };

  const handleSelectAll = () => {
    if (formData.targetIds.length === investors.length) {
      setFormData(prev => ({ ...prev, targetIds: [] }));
    } else {
      setFormData(prev => ({ ...prev, targetIds: investors.map(i => i.id) }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) return;
    onAddNotice({
      title: formData.title,
      message: formData.message,
      videoUrl: formData.videoUrl || null,
      targetType: formData.targetType,
      targetIds: formData.targetType === 'selected' ? formData.targetIds : null
    });
    setIsModalOpen(false);
    setFormData({ title: '', message: '', videoUrl: '', targetType: 'all', targetIds: [] });
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#C5A059] text-white px-5 py-2.5 rounded-xl hover:bg-[#B39050] transition-colors shadow-lg shadow-[#C5A059]/20 font-bold text-sm whitespace-nowrap"
        >
          <Plus size={18} />
          Novo Aviso
        </button>
      </div>

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
            const totalTarget = notice.targetType === 'all' ? investors.length : (notice.targetIds || []).length;
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
                    <button 
                      onClick={() => setViewingNotice(notice)}
                      className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Deseja excluir este aviso? Ele será removido para todos os investidores.')) {
                          onDeleteNotice(notice.id);
                        }
                      }}
                      className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Notice Modal */}
      {viewingNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setViewingNotice(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                <Bell className="text-[#C5A059]" />
                {viewingNotice.title}
              </h3>
              <button onClick={() => setViewingNotice(null)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors">
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
                      const inv = investors.find(i => i.id === rid);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                <Send className="text-[#C5A059]" />
                Novo Aviso
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Título do Aviso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Relatório Mensal de Agosto"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Mensagem *</label>
                <textarea
                  required
                  placeholder="Digite a mensagem que será enviada..."
                  value={formData.message}
                  onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-medium resize-none min-h-[120px]"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1 flex items-center gap-1">
                  <Video size={12} /> Link do Vídeo (YouTube — Opcional)
                </label>
                <input
                  type="url"
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
                      {formData.targetIds.length === investors.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                    {investors.map(inv => (
                      <label 
                        key={inv.id} 
                        onClick={() => handleToggleInvestor(inv.id)}
                        className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-neutral-100 transition-colors select-none"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          formData.targetIds.includes(inv.id) 
                            ? 'bg-[#C5A059] border-[#C5A059]' 
                            : 'border-neutral-300 group-hover:border-neutral-400'
                        }`}>
                          {formData.targetIds.includes(inv.id) && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <span className="text-sm font-bold text-neutral-700">{inv.name}</span>
                        {inv.email && <span className="text-[10px] text-neutral-400 font-medium">{inv.email}</span>}
                      </label>
                    ))}
                    {investors.length === 0 && (
                      <p className="text-xs font-bold text-neutral-400 text-center py-2">Nenhum investidor cadastrado.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={formData.targetType === 'selected' && formData.targetIds.length === 0}
                  className="flex-1 py-3 text-sm font-black text-white bg-[#C5A059] hover:bg-[#B39050] shadow-lg shadow-[#C5A059]/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Enviar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAvisos;
