import React from 'react';
import { User, Mail, Phone, MapPin, Key, Landmark, Search, Pencil, Trash2, Plus, Users, Calendar } from 'lucide-react';
import { formatCPF } from '../../../utils/cpfFormatter';


const AdminInvestidores = ({
  investors,
  investorForm,
  setInvestorForm,
  isEditing,
  setIsEditing,
  onAddInvestor,
  onUpdateInvestor,
  onDeleteInvestor,
  setShowAdminSuccess,
  vehicles = [],
  transactions = []
}) => {
  const calculateInvestorPayout = (inv) => {
    const invVehicles = (vehicles || []).filter(v => {
      const invNameMatch = v.investor?.toLowerCase().trim() === inv.name?.toLowerCase().trim();
      const invIdMatch = v.investorId === inv.id;
      return invNameMatch || invIdMatch;
    });

    if (invVehicles.length === 0) return 0;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let gross = 0;
    let adminTaxSum = 0;
    let maintenanceSum = 0;
    let protectionSum = 0;
    let insuranceSum = 0;

    const investorTrans = (transactions || []).filter(t => 
      invVehicles.some(v => v.plate === t.vehiclePlate)
    );

    const monthTransactions = investorTrans.filter(t => {
      if (!t.date) return false;
      try {
        const tDate = new Date(t.date + 'T12:00:00');
        return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      } catch (e) {
        return false;
      }
    });

    monthTransactions.forEach(t => {
      const cat = t.cat?.toLowerCase().trim() || '';
      const val = Math.abs(t.val || 0);

      if (t.type === 'in') {
        if (cat === 'taxa adm') {
          adminTaxSum += val;
        } else {
          gross += val;
          const v = invVehicles.find(veh => veh.plate === t.vehiclePlate);
          const taxRate = parseFloat(v?.adminTax || 15) / 100;
          adminTaxSum += val * taxRate;
        }
      } else if (t.type === 'out') {
        if (cat.includes('manuten')) {
          maintenanceSum += val;
        } else if (cat.includes('prote') || cat.includes('veicular')) {
          protectionSum += val;
        } else if (cat.includes('seguro')) {
          insuranceSum += val;
        }
      }
    });

    return gross - adminTaxSum - (maintenanceSum + protectionSum + insuranceSum);
  };
  const [showForm, setShowForm] = React.useState(false);

  // If we start editing from outside, we should show the form
  React.useEffect(() => {
    if (isEditing) {
      setShowForm(true);
    }
  }, [isEditing]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {!showForm ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter">Investidores</h3>
              <p className="text-neutral-400 text-sm font-light mt-1">Gerencie os parceiros e proprietários dos ativos da frota.</p>
            </div>
            
            {/* Próximo Pagamento Info */}
            <div className="flex bg-neutral-900 p-4 rounded-2xl border border-[#C5A059]/20 shadow-xl items-center gap-6">
              <div className="w-12 h-12 bg-[#C5A059] rounded-xl flex items-center justify-center text-neutral-950 shadow-lg shadow-[#C5A059]/20">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-widest text-[#C5A059] font-black mb-1">Próximo Repasse (5º Dia Útil)</p>
                <p className="text-sm font-black text-white">
                  {(() => {
                    const getFifthBusinessDay = (date = new Date()) => {
                      const year = date.getFullYear();
                      const month = date.getMonth();
                      let count = 0;
                      let day = 1;
                      while (count < 5) {
                        const d = new Date(year, month, day);
                        const dayOfWeek = d.getDay();
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
                        if (count < 5) day++;
                      }
                      return new Date(year, month, day);
                    };
                    const today = new Date();
                    const payoutDate = getFifthBusinessDay(new Date(today.getFullYear(), today.getMonth()));
                    // Se o dia útil do mês atual já passou, mostra o do próximo mês
                    if (today > payoutDate) {
                      return getFifthBusinessDay(new Date(today.getFullYear(), today.getMonth() + 1)).toLocaleDateString('pt-BR');
                    }
                    return payoutDate.toLocaleDateString('pt-BR');
                  })()}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setInvestorForm({
                  name: '', email: '', phone: '', cpf: '', address: '',
                  password: '', status: 'Ativo', bank: '', pix: ''
                });
                setIsEditing(false);
                setShowForm(true);
              }}
              className="flex items-center gap-3 px-8 py-4 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl group"
            >
              <Plus size={16} className="text-[#C5A059] group-hover:text-white transition-colors" />
              Cadastrar Investidor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investors.map((investor) => (
              <div key={investor.id} className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-md hover:border-[#C5A059]/30 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-xl shadow-lg">
                      {investor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-lg font-black text-neutral-900">{investor.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${investor.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{investor.status}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setInvestorForm(investor);
                        setIsEditing(true);
                        setShowForm(true);
                      }}
                      className="w-10 h-10 bg-neutral-50 text-neutral-400 rounded-xl flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-all"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteInvestor(investor.id)}
                      className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-neutral-50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Documento</span>
                    <p className="text-xs font-bold text-neutral-700">{investor.cpf}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Dados Bancários / PIX</span>
                    <p className="text-xs text-neutral-700 font-semibold leading-tight">
                      {investor.bank ? `${investor.bank} | ` : ''} PIX: <span className="text-[#C5A059]">{investor.pix || 'Não Informado'}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Contato</span>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-neutral-600 font-medium">
                        <Mail size={12} className="text-[#C5A059]" /> {investor.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-600 font-medium">
                        <Phone size={12} className="text-[#C5A059]" /> {investor.phone}
                      </div>
                    </div>
                  </div>
                  
                  {/* Dynamic monthly payout calculation */}
                  {(() => {
                    const payout = calculateInvestorPayout(investor);
                    const invVehs = (vehicles || []).filter(v => {
                      const invNameMatch = v.investor?.toLowerCase().trim() === investor.name?.toLowerCase().trim();
                      const invIdMatch = v.investorId === investor.id;
                      return invNameMatch || invIdMatch;
                    });
                    
                    return (
                      <div className="mt-6 pt-6 border-t border-neutral-50 space-y-4">
                        <div className="flex justify-between items-center bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100">
                          <div>
                            <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-black">Repasse Mês Atual</span>
                            <p className="text-base font-black text-neutral-900 leading-none mt-1 font-mono">R$ {payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${payout > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-400'}`}>
                            {payout > 0 ? 'A Repassar' : 'Sem Ganhos'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-neutral-500 font-medium px-2">
                          <span>Veículos Associados:</span>
                          <span className="font-black text-neutral-950">{invVehs.length} ativo(s)</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}

            {investors.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-400 space-y-4 bg-white rounded-[2.5rem] border border-dashed border-neutral-200">
                <Users size={48} className="text-neutral-200" />
                <p className="font-light tracking-wide">Nenhum investidor cadastrado ainda.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                  }}
                  className="text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <Search size={18} />
                </button>
                <h3 className="text-3xl font-black uppercase tracking-tighter">
                  {isEditing ? 'Editar Investidor' : 'Cadastro de Investidor'}
                </h3>
              </div>
              <p className="text-neutral-400 text-sm font-light">Preencha os dados abaixo para {isEditing ? 'atualizar o' : 'registrar um novo'} parceiro.</p>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
              }}
              className="px-8 py-4 bg-neutral-100 text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-bold rounded-2xl hover:bg-neutral-200 transition-all"
            >
              Voltar para Listagem
            </button>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
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
                    onChange={e => setInvestorForm({ ...investorForm, cpf: formatCPF(e.target.value) })} 
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
                    setShowForm(false);
                  }}
                  className="px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (isEditing) {
                      const res = await onUpdateInvestor(investorForm);
                      if (res && !res.success) return;
                      setIsEditing(false);
                      setShowAdminSuccess({
                        show: true,
                        title: 'Investidor Atualizado',
                        message: 'Os dados do parceiro foram atualizados com sucesso no sistema.'
                      });
                    } else {
                      const res = await onAddInvestor(investorForm);
                      if (res && !res.success) return;
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
                    setShowForm(false);
                  }}
                  className="px-12 py-5 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-[2rem] hover:bg-[#C5A059] transition-all shadow-xl"
                >
                  {isEditing ? 'Salvar Alterações' : 'Cadastrar Investidor'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInvestidores;
