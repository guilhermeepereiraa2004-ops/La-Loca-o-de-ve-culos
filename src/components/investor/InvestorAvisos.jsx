import React, { useState } from 'react';
import { Bell, CheckCircle2, Youtube, X, ArrowRight, ShieldAlert, Sparkles, Clock, ChevronRight, Play, Video } from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';

const isDirectVideoUrl = (url) => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.includes('/storage/v1/object/public/');
};

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
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3` : null;
};

const InvestorAvisos = ({ investor, notices = [], onMarkNoticeRead }) => {
  const [viewingNotice, setViewingNotice] = useState(null);

  // Filter notices for this investor
  const myNotices = notices.filter(n => n.targetType === 'all' || (n.targetIds && n.targetIds.includes(investor?.id)));
  const sortedNotices = [...myNotices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = myNotices.filter(n => !(n.readBy || []).includes(investor?.id)).length;

  const handleOpenNotice = (notice) => {
    setViewingNotice(notice);
    if (!(notice.readBy || []).includes(investor?.id)) {
      onMarkNoticeRead(notice.id, investor?.id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-8 xl:p-10 overflow-hidden shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <EditorialLabel className="text-[#D4AF37]">Comunicados & Avisos</EditorialLabel>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                  {unreadCount} {unreadCount === 1 ? 'novo' : 'novos'}
                </span>
              )}
            </div>
            <h1 className="text-3xl xl:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              Quadro de Avisos
            </h1>
            <p className="text-sm font-medium text-neutral-400 max-w-xl">
              Acompanhe pronunciamentos da diretoria, novos relatórios e novidades sobre a operação da sua frota.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-neutral-900/80 border border-neutral-800/80 p-4 rounded-2xl shrink-0 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <Bell size={22} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-neutral-500">Total de Avisos</p>
              <p className="text-2xl font-black text-white font-mono">{sortedNotices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* List / Empty State */}
      <div className="space-y-4">
        {sortedNotices.length === 0 ? (
          <div className="relative bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-16 text-center shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-radial from-[#D4AF37]/5 via-transparent to-transparent opacity-50"></div>
            
            <div className="relative z-10 max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 group-hover:text-[#D4AF37] group-hover:border-[#D4AF37]/40 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all duration-500">
                <Bell size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Nenhum aviso pendente</h3>
                <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                  Você está em dia com todos os comunicados e atualizações da L.A Locação de Veículos.
                </p>
              </div>
            </div>
          </div>
        ) : (
          sortedNotices.map((notice) => {
            const isRead = (notice.readBy || []).includes(investor?.id);
            const hasVideo = Boolean(notice.videoUrl && getYoutubeEmbedUrl(notice.videoUrl));

            return (
              <div 
                key={notice.id} 
                onClick={() => handleOpenNotice(notice)}
                className={`relative bg-[#0a0a0a] rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden group p-6 xl:p-7 ${
                  !isRead 
                    ? 'border-[#D4AF37]/40 shadow-[0_0_30px_rgba(212,175,55,0.08)] bg-gradient-to-r from-[#D4AF37]/5 via-[#0a0a0a] to-[#0a0a0a]' 
                    : 'border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/30'
                }`}
              >
                {!isRead && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-[#D4AF37] to-amber-600 shadow-[0_0_12px_rgba(212,175,55,0.8)]"></div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {!isRead ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-[#D4AF37] text-neutral-950 text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                          Novo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                          <CheckCircle2 size={10} className="text-emerald-400" /> Leitura Concluída
                        </span>
                      )}

                      {hasVideo && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-widest">
                          <Youtube size={12} className="text-rose-400" /> Possui Vídeo Explicativo
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className={`text-lg font-black uppercase tracking-tight transition-colors group-hover:text-[#D4AF37] ${isRead ? 'text-neutral-200' : 'text-white'}`}>
                        {notice.title}
                      </h3>
                      <p className="text-xs text-neutral-400 font-medium line-clamp-2 mt-1 leading-relaxed">
                        {notice.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-neutral-600" />
                        {new Date(notice.createdAt).toLocaleDateString('pt-BR')} às {new Date(notice.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className="text-neutral-400">Por: {notice.createdBy || 'L.A Locação'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 group-hover:bg-[#D4AF37] text-neutral-300 group-hover:text-neutral-950 font-black text-[10px] uppercase tracking-widest transition-all duration-300 border border-neutral-800 group-hover:border-[#D4AF37]">
                      <span>{isRead ? 'Ver Aviso' : 'Ler Aviso'}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Visualizar Aviso */}
      {viewingNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 xl:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-[#0d0d0d] border border-neutral-800 w-full max-w-3xl rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between p-6 xl:p-8 border-b border-neutral-800/80 bg-neutral-950/60 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Bell size={20} />
                </div>
                <div>
                  <EditorialLabel className="text-[#D4AF37]">Comunicado Oficial</EditorialLabel>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                    {viewingNotice.title}
                  </h3>
                </div>
              </div>
              
              <button 
                onClick={() => setViewingNotice(null)} 
                className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto p-6 xl:p-8 space-y-6">
              <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-widest border-b border-neutral-800/50 pb-4">
                <span>Publicado em: {new Date(viewingNotice.createdAt).toLocaleDateString('pt-BR')} às {new Date(viewingNotice.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>•</span>
                <span>Emissor: {viewingNotice.createdBy || 'Diretoria L.A Locação'}</span>
              </div>

              <div className="text-sm text-neutral-300 font-normal whitespace-pre-wrap leading-relaxed space-y-4">
                {viewingNotice.message}
              </div>
              
              {viewingNotice.videoUrl && (isDirectVideoUrl(viewingNotice.videoUrl) || getYoutubeEmbedUrl(viewingNotice.videoUrl)) && (
                <div className="space-y-3 pt-4 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                      <Play size={13} className="text-[#D4AF37] fill-[#D4AF37]" />
                      Vídeo Explicativo em Anexo
                    </p>
                    <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      L.A MEDIA PLAYER
                    </span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-neutral-950 shadow-[0_0_35px_rgba(212,175,55,0.12)]">
                    {/* Header bar overlay for custom branding */}
                    <div className="bg-neutral-900/90 border-b border-neutral-800/80 px-4 py-2.5 flex items-center justify-between backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-200">L.A Locação • Transmissão Oficial</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-[#D4AF37] uppercase tracking-widest">Exclusivo Investidores</span>
                    </div>

                    <div className="aspect-video relative bg-black">
                      {isDirectVideoUrl(viewingNotice.videoUrl) ? (
                        <video
                          src={viewingNotice.videoUrl}
                          controls
                          controlsList="nodownload"
                          className="w-full h-full object-contain bg-black"
                        />
                      ) : (
                        <iframe
                          src={getYoutubeEmbedUrl(viewingNotice.videoUrl)}
                          className="w-full h-full border-none"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Vídeo de Comunicado L.A Locação"
                        ></iframe>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-6 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between shrink-0">
              {(viewingNotice.readBy || []).includes(investor?.id) ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest">
                    <CheckCircle2 size={16} /> Leitura Concluída
                  </span>
                  <button 
                    onClick={() => setViewingNotice(null)}
                    className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all border border-neutral-700 cursor-pointer"
                  >
                    Fechar
                  </button>
                </>
              ) : (
                <>
                  <div></div>
                  <button 
                    onClick={() => setViewingNotice(null)}
                    className="flex items-center gap-2 px-8 py-3 bg-[#D4AF37] hover:bg-[#c4a02e] text-neutral-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    Concluir Leitura
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorAvisos;
