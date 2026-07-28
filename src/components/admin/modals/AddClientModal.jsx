import React, { useState } from 'react';
import { X, User, Phone, Mail, FileText, Calendar, Camera, Smartphone, Loader2, Check, Home, CreditCard } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { compressImage } from '../../../utils/imageCompression';
import { formatCPF } from '../../../utils/cpfFormatter';

const AddClientModal = ({ isOpen, onClose, onAddClient }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [form, setForm] = useState({
    nome: '', telefone: '', email: '', cpf: '', birthDate: '',
    rg: '', nacionalidade: 'brasileiro(a)', estadoCivil: 'solteiro(a)',
    address: '', cep: '', cidadeUf: 'Aracaju/SE',
    cnhNumber: '', cnhRegisterNumber: '', cnhValidity: '',
    docs: { cnh: null, residence: null, appPrints: [] }
  });

  const resetForm = () => {
    setForm({
      nome: '', telefone: '', email: '', cpf: '', birthDate: '',
      rg: '', nacionalidade: 'brasileiro(a)', estadoCivil: 'solteiro(a)',
      address: '', cep: '', cidadeUf: 'Aracaju/SE',
      cnhNumber: '', cnhRegisterNumber: '', cnhValidity: '',
      docs: { cnh: null, residence: null, appPrints: [] }
    });
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      alert('O nome do cliente é obrigatório.');
      return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const result = await onAddClient(form);
      if (result?.success) {
        resetForm();
        onClose(true); // true = success
      }
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => { if (!isSubmitting) onClose(); }} />
      <div className="relative bg-[#0a0a0a] w-full max-w-6xl h-full md:max-h-[92vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-6 md:p-10 pb-6 border-b border-neutral-50 shrink-0 bg-black/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-900 text-[#D4AF37] rounded-2xl flex items-center justify-center shadow-lg">
                <User size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
                  <EditorialLabel className="text-[#D4AF37]">Gestão de Condutores</EditorialLabel>
                </div>
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white leading-none">Novo Cliente</h3>
              </div>
            </div>
            <button
              onClick={() => { if (!isSubmitting) onClose(); }}
              disabled={isSubmitting}
              className={`w-10 h-10 md:w-12 md:h-12 bg-[#0a0a0a] border border-neutral-800 rounded-xl md:rounded-2xl flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-900 transition-all shadow-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Left Column: Personal Data + Address + CNH */}
            <div className="md:col-span-2 space-y-10">

              {/* Personal Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-[#D4AF37] rounded-full" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-white">Dados Pessoais</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">Nome Completo *</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                      <input type="text" required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-black text-white border border-neutral-800 pl-12 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm" placeholder="Ex: João Silva" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">WhatsApp de Contato</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                      <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className="w-full bg-black text-white border border-neutral-800 pl-12 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm" placeholder="(79) 99999-9999" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">E-mail Principal</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                      <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-black text-white border border-neutral-800 pl-12 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm" placeholder="exemplo@email.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">CPF do Condutor</label>
                    <div className="relative group">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                      <input type="text" value={form.cpf} onChange={e => setForm({...form, cpf: formatCPF(e.target.value)})} className="w-full bg-black text-white border border-neutral-800 pl-12 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm" placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">Data de Nascimento</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                      <input type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} className="w-full bg-black text-white border border-neutral-800 pl-12 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">RG (Órgão Emissor/UF)</label>
                    <input type="text" value={form.rg} onChange={e => setForm({...form, rg: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm" placeholder="Ex: 1234567 SSP/SE" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">Nacionalidade</label>
                    <input type="text" value={form.nacionalidade} onChange={e => setForm({...form, nacionalidade: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm" placeholder="brasileiro(a)" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white font-black ml-1">Estado Civil</label>
                    <select value={form.estadoCivil} onChange={e => setForm({...form, estadoCivil: e.target.value})} className="w-full bg-black text-white border border-neutral-800 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] focus:bg-[#0a0a0a] transition-all font-bold text-sm">
                      <option value="solteiro(a)">Solteiro(a)</option>
                      <option value="casado(a)">Casado(a)</option>
                      <option value="divorciado(a)">Divorciado(a)</option>
                      <option value="viúvo(a)">Viúvo(a)</option>
                      <option value="união estável">União Estável</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Address */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-[#D4AF37] rounded-full" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-white">Endereço de Residência</h5>
                </div>
                <div className="p-6 bg-black rounded-2xl border border-neutral-800">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Rua, Nº, Bairro</label>
                      <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-[#0a0a0a] border border-neutral-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs text-white" placeholder="Ex: Rua Antônio, n° 42, Bairro Zona" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">CEP</label>
                      <input type="text" value={form.cep} onChange={e => setForm({...form, cep: e.target.value})} className="w-full bg-[#0a0a0a] border border-neutral-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs text-white" placeholder="Ex: 49000-000" />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Cidade / UF</label>
                      <input type="text" value={form.cidadeUf} onChange={e => setForm({...form, cidadeUf: e.target.value})} className="w-full bg-[#0a0a0a] border border-neutral-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs text-white" placeholder="Ex: Aracaju/SE" />
                    </div>
                  </div>
                </div>
              </section>

              {/* CNH */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-[#D4AF37] rounded-full" />
                  <h5 className="text-sm font-black uppercase tracking-widest text-white">Documentação CNH</h5>
                </div>
                <div className="p-6 bg-black rounded-2xl border border-neutral-800">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Número CNH</label>
                      <input type="text" value={form.cnhNumber} onChange={e => setForm({...form, cnhNumber: e.target.value})} className="w-full bg-[#0a0a0a] border border-neutral-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs text-white" placeholder="Ex: 123456789" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nº Registro</label>
                      <input type="text" value={form.cnhRegisterNumber} onChange={e => setForm({...form, cnhRegisterNumber: e.target.value})} className="w-full bg-[#0a0a0a] border border-neutral-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs text-white" placeholder="Ex: 987654321" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Validade</label>
                      <input type="date" value={form.cnhValidity} onChange={e => setForm({...form, cnhValidity: e.target.value})} className="w-full bg-[#0a0a0a] border border-neutral-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-black text-xs text-white" />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Document Uploads */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-[#D4AF37] rounded-full" />
                <h5 className="text-sm font-black uppercase tracking-widest text-white">Anexos</h5>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* CNH Photo */}
                <label className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-500 group relative ${form.docs.cnh ? 'border-emerald-500 bg-emerald-500/10/30' : 'border-neutral-800 bg-black hover:border-[#D4AF37]/50 hover:bg-[#0a0a0a]'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${form.docs.cnh ? 'bg-emerald-500 text-white' : 'bg-[#0a0a0a] text-neutral-300 group-hover:text-[#D4AF37] group-hover:scale-110'}`}>
                    <Camera size={24} />
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${form.docs.cnh ? 'text-emerald-600' : 'text-white'}`}>Foto da CNH</span>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">
                      {form.docs.cnh ? (form.docs.cnh.name || 'CNH Selecionada') : 'Clique para anexar'}
                    </span>
                  </div>
                  <input type="file" className="hidden text-white" accept="image/*,application/pdf" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        setIsProcessingFiles(true);
                        const compressed = file.type.includes('image') ? await compressImage(file) : file;
                        setForm(prev => ({...prev, docs: { ...prev.docs, cnh: compressed }}));
                      } finally { setIsProcessingFiles(false); }
                    }
                  }} />
                  {isProcessingFiles && <div className="absolute inset-0 bg-[#0a0a0a]/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl"><Loader2 className="animate-spin text-[#D4AF37]" /></div>}
                </label>

                {/* Residence Proof */}
                <label className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-500 group relative ${form.docs.residence ? 'border-emerald-500 bg-emerald-500/10/30' : 'border-neutral-800 bg-black hover:border-[#D4AF37]/50 hover:bg-[#0a0a0a]'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${form.docs.residence ? 'bg-emerald-500 text-white' : 'bg-[#0a0a0a] text-neutral-300 group-hover:text-[#D4AF37] group-hover:scale-110'}`}>
                    <FileText size={24} />
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${form.docs.residence ? 'text-emerald-600' : 'text-white'}`}>Comprovante</span>
                    <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">
                      {form.docs.residence ? (form.docs.residence.name || 'Comprovante Selecionado') : '(Opcional)'}
                    </span>
                  </div>
                  <input type="file" className="hidden text-white" accept="image/*,application/pdf" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        setIsProcessingFiles(true);
                        const compressed = file.type.includes('image') ? await compressImage(file) : file;
                        setForm(prev => ({...prev, docs: { ...prev.docs, residence: compressed }}));
                      } finally { setIsProcessingFiles(false); }
                    }
                  }} />
                </label>

                {/* App Prints */}
                <label className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-500 group relative ${form.docs.appPrints?.length > 0 ? 'border-emerald-500 bg-emerald-500/10/30' : 'border-neutral-800 bg-black hover:border-[#D4AF37]/50 hover:bg-[#0a0a0a]'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${form.docs.appPrints?.length > 0 ? 'bg-emerald-500 text-white' : 'bg-[#0a0a0a] text-neutral-300 group-hover:text-[#D4AF37] group-hover:scale-110'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${form.docs.appPrints?.length > 0 ? 'text-emerald-600' : 'text-white'}`}>Prints App</span>
                    {form.docs.appPrints?.length > 0 ? (
                      <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
                        {form.docs.appPrints.length} ARQUIVOS
                      </span>
                    ) : (
                      <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">(Opcional)</span>
                    )}
                  </div>
                  <input type="file" multiple className="hidden text-white" accept="image/*,application/pdf" onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      try {
                        setIsProcessingFiles(true);
                        const compressed = await Promise.all(files.map(f => f.type.includes('image') ? compressImage(f) : f));
                        setForm(prev => ({...prev, docs: { ...prev.docs, appPrints: compressed }}));
                      } finally { setIsProcessingFiles(false); }
                    }
                  }} />
                </label>
              </div>

              {/* Quick Status */}
              <div className="p-5 bg-neutral-900 rounded-2xl text-center">
                <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-2">Status do Cadastro</p>
                <div className="flex items-center justify-center gap-3">
                  {form.nome ? <Check size={14} className="text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-700" />}
                  <span className={`text-xs font-black uppercase tracking-widest ${form.nome ? 'text-white' : 'text-neutral-600'}`}>
                    {form.nome ? 'Pronto para cadastrar' : 'Preencha o nome'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-10 pt-6 border-t border-neutral-800 bg-[#0a0a0a] shrink-0 flex justify-between items-center">
          <button
            type="button"
            onClick={() => { if (!isSubmitting) onClose(); }}
            disabled={isSubmitting}
            className="px-8 py-4 text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !form.nome.trim()}
            className={`px-10 py-4 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black transition-all duration-300 flex items-center gap-3 shadow-lg ${
              isSubmitting || !form.nome.trim()
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-neutral-900 text-white hover:bg-[#D4AF37] shadow-neutral-900/20 hover:shadow-[#D4AF37]/20 active:scale-95'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                <User size={16} />
                Cadastrar Cliente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddClientModal;
