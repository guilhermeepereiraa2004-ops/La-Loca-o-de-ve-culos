import React from 'react';
import { User, Mail, Phone, MapPin, Key, Landmark, Search, Pencil, Trash2 } from 'lucide-react';

const AdminInvestidores = ({
  investors,
  investorForm,
  setInvestorForm,
  isEditing,
  setIsEditing,
  onAddInvestor,
  onUpdateInvestor,
  onDeleteInvestor,
  setShowAdminSuccess
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-tighter">Cadastro de Investidores</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Gerencie os parceiros e proprietários dos ativos da frota.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-8 bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
          <form className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Nome Completo</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    value={investorForm.name} 
                    onChange={e => setInvestorForm({ ...investorForm, name: e.target.value })} 
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" 
                    placeholder="Nome do investidor" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">CPF</label>
                <input 
                  type="text" 
                  value={investorForm.cpf} 
                  onChange={e => setInvestorForm({ ...investorForm, cpf: e.target.value })} 
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" 
                  placeholder="000.000.000-00" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="email" 
                    value={investorForm.email} 
                    onChange={e => setInvestorForm({ ...investorForm, email: e.target.value })} 
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" 
                    placeholder="email@exemplo.com" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Telefone / Whats</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    value={investorForm.phone} 
                    onChange={e => setInvestorForm({ ...investorForm, phone: e.target.value })} 
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Endereço Residencial</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                  <input 
                    type="text" 
                    value={investorForm.address} 
                    onChange={e => setInvestorForm({ ...investorForm, address: e.target.value })} 
                    className="w-full bg-neutral-50 border-none p-5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" 
                    placeholder="Endereço completo" 
                  />
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-neutral-100" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h5 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                  <Key size={18} className="text-[#C5A059]" />
                  Acesso ao Portal
                </h5>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Senha de Acesso</label>
                    <input 
                      type="text" 
                      value={investorForm.password} 
                      onChange={e => setInvestorForm({ ...investorForm, password: e.target.value })} 
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold tracking-widest" 
                      placeholder="Senha segura" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Status da Conta</label>
                    <select 
                      value={investorForm.status} 
                      onChange={e => setInvestorForm({ ...investorForm, status: e.target.value })} 
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h5 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                  <Landmark size={18} className="text-[#C5A059]" />
                  Dados para Repasse
                </h5>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Banco / Agência / Conta</label>
                    <input 
                      type="text" 
                      value={investorForm.bank} 
                      onChange={e => setInvestorForm({ ...investorForm, bank: e.target.value })} 
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light" 
                      placeholder="Ex: Nubank / 0001 / 12345-6" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Chave PIX</label>
                    <input 
                      type="text" 
                      value={investorForm.pix} 
                      onChange={e => setInvestorForm({ ...investorForm, pix: e.target.value })} 
                      className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-[#C5A059]" 
                      placeholder="E-mail, CPF, Telefone ou Chave" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-6 pt-8">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setInvestorForm({
                    name: '', email: '', phone: '', cpf: '', address: '',
                    password: '', status: 'Ativo', bank: '', pix: ''
                  });
                }}
                className="px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                Limpar Campos
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (isEditing) {
                    onUpdateInvestor(investorForm);
                    setIsEditing(false);
                    setShowAdminSuccess({
                      show: true,
                      title: 'Investidor Atualizado',
                      message: 'Os dados do parceiro foram atualizados com sucesso no sistema.'
                    });
                  } else {
                    onAddInvestor(investorForm);
                    setShowAdminSuccess({
                      show: true,
                      title: 'Investidor Cadastrado',
                      message: 'O novo parceiro foi registrado com sucesso no sistema da LA Locação.'
                    });
                  }
                  setInvestorForm({
                    name: '', email: '', phone: '', cpf: '', address: '',
                    password: '', status: 'Ativo', bank: '', pix: ''
                  });
                }}
                className="px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl"
              >
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Investidor'}
              </button>
            </div>
          </form>
        </div>

        {/* List Column */}
        <div className="space-y-6">
          <h5 className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-black px-4">Investidores Cadastrados</h5>
          <div className="space-y-4">
            {investors.map((investor) => (
              <div key={investor.id} className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm hover:border-[#C5A059]/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059] font-black text-xs shadow-lg">
                      {investor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-neutral-900">{investor.name}</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{investor.cpf}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setInvestorForm(investor);
                        setIsEditing(true);
                      }}
                      className="w-8 h-8 bg-neutral-50 text-neutral-400 rounded-lg flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-all"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteInvestor(investor.id)}
                      className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                    <Mail size={10} className="text-[#C5A059]" /> {investor.email}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                    <Phone size={10} className="text-[#C5A059]" /> {investor.phone}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvestidores;
