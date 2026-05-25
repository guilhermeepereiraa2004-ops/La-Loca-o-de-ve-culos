import React, { useState } from 'react';
import { 
  X, User, Phone, Mail, FileText, 
  MapPin, CreditCard, ImageIcon, Download, 
  AlertTriangle, Calendar, ShieldCheck, Camera, Edit2, Save
} from 'lucide-react';
import { formatCPF } from '../../../utils/cpfFormatter';


const ClientDetailModal = ({ client, onClose, onUpdate }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(client || {});
  const [errorModal, setErrorModal] = useState(null);

  if (!client) return null;

  const handleSave = async () => {
    if (onUpdate) {
      const res = await onUpdate(editForm);
      if (res && !res.success) {
        const errorMsg = res.error?.message || '';
        const errorCode = res.error?.code || '';
        
        if (errorCode === '23505' || errorMsg.toLowerCase().includes('unique') || errorMsg.toLowerCase().includes('duplicate')) {
          if (errorMsg.includes('cpf')) {
            setErrorModal({
              title: 'CPF Duplicado',
              message: 'Este CPF já está cadastrado para outro cliente no sistema.'
            });
          } else if (errorMsg.includes('cnh_number') || errorMsg.includes('cnh')) {
            setErrorModal({
              title: 'CNH Duplicada',
              message: 'Este número de CNH já está cadastrado para outro cliente.'
            });
          } else if (errorMsg.includes('email') || errorMsg.includes('e-mail')) {
            setErrorModal({
              title: 'E-mail em Uso',
              message: 'Este endereço de e-mail já está cadastrado para outro cliente.'
            });
          } else {
            setErrorModal({
              title: 'Dados Duplicados',
              message: 'Já existe um cadastro no sistema com esses mesmos dados únicos (CPF, CNH ou E-mail).'
            });
          }
        } else {
          setErrorModal({
            title: 'Erro ao Salvar',
            message: res.error?.message || 'Ocorreu um erro inesperado ao salvar os dados.'
          });
        }
        return; // Keep editing mode active so they don't lose progress
      }
    }
    setIsEditing(false);
  };

  const getFileUrl = (file) => {
    if (!file) return null;
    
    // Handle object format (like {preview: 'url'})
    if (typeof file === 'object') {
      if (file.preview) return file.preview;
      if (file.url) return file.url;
      try {
        return URL.createObjectURL(file);
      } catch (e) {
        return null;
      }
    }

    if (typeof file === 'string') {
      if (file === '[object Object]') return null;
      if (file.startsWith('http') || file.startsWith('blob:') || file.startsWith('data:')) return file;
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/La-locacao/${file}`;
    }
    
    return null;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateStr);
    return expDate < today;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        
        {/* Image Preview Overlay */}
        {selectedImage && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-10">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedImage(null)} />
            <div className="relative z-10 max-w-full max-h-full">
              <img src={selectedImage} className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-white/10" alt="Preview" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase text-[10px] tracking-widest hover:text-[#C5A059] transition-colors">
                <X size={20} /> Fechar Preview
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-8 md:p-12 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-neutral-900 rounded-[2rem] flex items-center justify-center text-[#C5A059] shadow-2xl shadow-[#C5A059]/20 transform -rotate-3">
              <User size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[#C5A059] text-[10px] uppercase font-black tracking-widest">Dossiê do Cliente</span>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${!isExpired(client.cnhValidity) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {isExpired(client.cnhValidity) ? 'Cadastro Irregular' : 'Cadastro Regular'}
                </span>
              </div>
              <h4 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">{client.nome || client.name}</h4>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-neutral-900 transition-all shadow-xl">
                <Save size={16} /> Salvar
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-900 font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-neutral-200 transition-all">
                <Edit2 size={16} /> Editar
              </button>
            )}
            <button onClick={onClose} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400 hover:text-neutral-900">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            
            {/* Left Col: Info */}
            <div className="md:col-span-7 space-y-8">
              
              {/* Personal Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck size={18} className="text-[#C5A059]" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Dados Pessoais</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-50 p-8 rounded-[2.5rem]">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-neutral-400 mb-1">WhatsApp</p>
                    {isEditing ? (
                      <input type="text" value={editForm.telefone || editForm.phone || ''} onChange={e => setEditForm({...editForm, telefone: e.target.value})} className="w-full bg-white border border-neutral-200 p-2 rounded-xl text-sm font-black text-neutral-900 outline-none focus:border-[#C5A059]" />
                    ) : (
                      <p className="text-sm font-black text-neutral-900">{client.telefone || client.phone || '---'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-neutral-400 mb-1">E-mail</p>
                    {isEditing ? (
                      <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-white border border-neutral-200 p-2 rounded-xl text-sm font-black text-neutral-900 outline-none focus:border-[#C5A059]" />
                    ) : (
                      <p className="text-sm font-black text-neutral-900 truncate">{client.email || '---'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-neutral-400 mb-1">Data de Nascimento</p>
                    {isEditing ? (
                      <input type="date" value={editForm.birthDate || ''} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} className="w-full bg-white border border-neutral-200 p-2 rounded-xl text-sm font-black text-neutral-900 outline-none focus:border-[#C5A059]" />
                    ) : (
                      <p className="text-sm font-black text-neutral-900 leading-tight">
                        {client.birthDate ? new Date(client.birthDate).toLocaleDateString('pt-BR') : '---'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-neutral-400 mb-1">CPF</p>
                    {isEditing ? (
                      <input type="text" value={editForm.cpf || ''} onChange={e => setEditForm({...editForm, cpf: formatCPF(e.target.value)})} className="w-full bg-white border border-neutral-200 p-2 rounded-xl text-sm font-black text-neutral-900 outline-none focus:border-[#C5A059]" placeholder="000.000.000-00" />
                    ) : (
                      <p className="text-sm font-black text-neutral-900">{client.cpf || '---'}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Document Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard size={18} className="text-[#C5A059]" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Habilitação (CNH)</h5>
                </div>
                <div className="grid grid-cols-4 gap-6 bg-neutral-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                  <div>
                    <p className="text-[8px] uppercase font-bold text-[#C5A059] mb-1">Nº CNH</p>
                    {isEditing ? (
                      <input type="text" value={editForm.cnhNumber || editForm.cnh || ''} onChange={e => setEditForm({...editForm, cnhNumber: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 p-2 rounded-xl text-sm font-black text-white outline-none focus:border-[#C5A059]" />
                    ) : (
                      <p className="text-sm font-black">{client.cnhNumber || client.cnh || '---'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] uppercase font-bold text-[#C5A059] mb-1">Nº Registro</p>
                    {isEditing ? (
                      <input type="text" value={editForm.cnhRegisterNumber || ''} onChange={e => setEditForm({...editForm, cnhRegisterNumber: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 p-2 rounded-xl text-sm font-black text-white outline-none focus:border-[#C5A059]" />
                    ) : (
                      <p className="text-sm font-black">{client.cnhRegisterNumber || '---'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] uppercase font-bold text-[#C5A059] mb-1">Validade</p>
                    {isEditing ? (
                      <input type="date" value={editForm.cnhExpiration || editForm.cnhValidity || ''} onChange={e => setEditForm({...editForm, cnhExpiration: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 p-2 rounded-xl text-sm font-black text-white outline-none focus:border-[#C5A059]" />
                    ) : (
                      <p className={`text-sm font-black ${isExpired(client.cnhExpiration || client.cnhValidity) ? 'text-red-400' : 'text-white'}`}>
                        {(client.cnhExpiration || client.cnhValidity) ? new Date(client.cnhExpiration || client.cnhValidity).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '---'}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Right Col: Documents */}
            <div className="md:col-span-5 space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <Camera size={18} className="text-[#C5A059]" />
                <h5 className="text-sm font-black uppercase tracking-widest text-neutral-900">Anexos Digitais</h5>
              </div>
              <div className="grid grid-cols-2 gap-6">
                
                {/* CNH Photo */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">CNH</p>
                  <div className="aspect-[4/3] bg-neutral-100 rounded-3xl overflow-hidden group relative border border-neutral-200">
                    {client.docs?.cnh ? (
                      <>
                        <img src={getFileUrl(client.docs.cnh)} className="w-full h-full object-cover" alt="CNH" />
                        <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button onClick={() => setSelectedImage(getFileUrl(client.docs.cnh))} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"><ImageIcon size={20} /></button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300">
                        <AlertTriangle size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Não Anexada</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Residence Proof */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">Residência</p>
                  <div className="aspect-[4/3] bg-neutral-100 rounded-3xl overflow-hidden group relative border border-neutral-200">
                    {client.docs?.residence ? (
                      <>
                        <img src={getFileUrl(client.docs.residence)} className="w-full h-full object-cover" alt="Residência" />
                        <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button onClick={() => setSelectedImage(getFileUrl(client.docs.residence))} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"><ImageIcon size={20} /></button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300">
                        <AlertTriangle size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Não Anexado</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* App Prints */}
                {(client.docs?.appPrints || []).map((print, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest text-center">App {idx + 1}</p>
                    <div className="aspect-[4/3] bg-neutral-100 rounded-3xl overflow-hidden group relative border border-neutral-200">
                      <img src={getFileUrl(print)} className="w-full h-full object-cover" alt={`App ${idx + 1}`} />
                      <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <button onClick={() => setSelectedImage(getFileUrl(print))} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-neutral-900 shadow-xl hover:scale-110 transition-transform"><ImageIcon size={20} /></button>
                      </div>
                    </div>
                  </div>
                ))}

                {(!client.docs?.appPrints || client.docs.appPrints.length === 0) && (
                  <div className="col-span-2 p-6 bg-neutral-50 border-2 border-dashed border-neutral-100 rounded-3xl flex items-center justify-center">
                    <p className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">Sem Prints de Aplicativo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {errorModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm" onClick={() => setErrorModal(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setErrorModal(null)}
              className="absolute top-8 right-8 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 mb-4">{errorModal.title}</h3>
            <p className="text-neutral-500 font-light mb-10 leading-relaxed text-sm">
              {errorModal.message}
            </p>
            <button 
              onClick={() => setErrorModal(null)}
              className="w-full py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all active:scale-95 duration-200 shadow-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailModal;
