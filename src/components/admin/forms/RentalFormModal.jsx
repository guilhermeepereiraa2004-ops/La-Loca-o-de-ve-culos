import React from 'react';
import { X, Check, Car, TrendingUp, Calendar, Wallet, Landmark, AlertTriangle, Plus, FileText, Camera, FileDown, User, Phone, Mail, Smartphone, Download, Loader2, Search } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';
import { getDayOfWeek } from '../../../utils/adminUtils.jsx';
import { generateRentalContract } from '../../../utils/contractGenerator';
import { compressImage } from '../../../utils/imageCompression';
import { formatCPF } from '../../../utils/cpfFormatter';


const RentalFormModal = ({ 
  isOpen, onClose, currentRentalStep, setCurrentRentalStep, totalRentalSteps, 
  rentalForm, setRentalForm, vehicles, clients = [], fines = [], onSubmit 
}) => {
  const [isProcessingFiles, setIsProcessingFiles] = React.useState(false);
  const [conductorType, setConductorType] = React.useState('cadastrar');
  const [vehicleSearch, setVehicleSearch] = React.useState('');

  const blockStatus = React.useMemo(() => {
    if (!fines || fines.length === 0) return { blocked: false, activeFinesCount: 0 };
    const name = (rentalForm.user || '').trim().toLowerCase();
    const id = rentalForm.clientId;
    if (!name && !id) return { blocked: false, activeFinesCount: 0 };

    const driverFines = fines.filter(f => {
      return (id && f.driverId === id) || 
             (name && (f.driverName || '').trim().toLowerCase() === name);
    });

    const activeFines = driverFines.filter(f => f.status !== 'Paga');
    const activeFinesCount = activeFines.length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hasBlockingFine = activeFines.some(f => {
      if (!f.date) return false;
      const fineDate = new Date(f.date);
      return fineDate < thirtyDaysAgo;
    });

    return { blocked: hasBlockingFine, activeFinesCount };
  }, [fines, rentalForm.user, rentalForm.clientId]);

  const filteredVehicles = React.useMemo(() => {
    return (vehicles || []).filter(v => {
      const isAvailable = v.status === 'Disponível';
      if (!isAvailable) return false;
      if (!vehicleSearch) return true;
      const searchLower = vehicleSearch.toLowerCase();
      return (
        v.model?.toLowerCase().includes(searchLower) ||
        v.plate?.toLowerCase().includes(searchLower)
      );
    });
  }, [vehicles, vehicleSearch]);

  if (!isOpen) return null;

  const fillTestData = () => {
    if (currentRentalStep === 2) {
      setRentalForm({
        ...rentalForm,
        user: "Guilherme Pereira",
        clientPhone: "(79) 99876-5432",
        email: "guilherme.teste@gmail.com",
        cpf: "123.456.789-00",
        cnhNumber: "12345678900",
        cnhRegisterNumber: "987654321",
        birthDate: "1995-05-15",
        cnhValidity: "2029-12-31"
      });
    } else if (currentRentalStep === 3) {
      setRentalForm({
        ...rentalForm,
        value: "650,00",
        tireTax: "50,00",
        startDate: new Date().toISOString().split('T')[0],
        durationWeeks: "4",
        depositTotal: "1.500,00",
        depositPaid: "800,00",
        depositInstallments: "4",
        lateFine: "10",
        dailyInterest: "1"
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-7xl h-full md:max-h-[95vh] rounded-none md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
        {/* Header / Steps Indicator */}
        <div className="p-6 md:p-12 pb-6 md:pb-8 border-b border-neutral-50 shrink-0 bg-neutral-50/50">
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse" />
                <EditorialLabel className="text-[#C5A059]">Fluxo de Nova Locação</EditorialLabel>
              </div>
              <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-neutral-900 leading-none">
                {currentRentalStep === 1 ? 'Seleção do Veículo' : 
                 currentRentalStep === 2 ? 'Dados do Condutor' : 
                 currentRentalStep === 3 ? 'Termos Financeiros' : 'Gestão de Contrato'}
              </h3>
            </div>
            <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-neutral-100 rounded-xl md:rounded-2xl flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:border-neutral-900 transition-all shadow-sm">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-1">
            {['Veículo', 'Condutor', 'Financeiro', 'Contrato'].map((step, idx) => {
              const isActive = currentRentalStep === idx + 1;
              const isCompleted = currentRentalStep > idx + 1;
              return (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-500 ${isActive ? 'bg-neutral-900 shadow-xl shadow-neutral-900/10' : ''}`}>
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-black transition-all ${isActive ? 'bg-[#C5A059] text-white' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-neutral-200 text-neutral-400'}`}>
                      {isCompleted ? <Check size={10} /> : idx + 1}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black hidden sm:block ${isActive ? 'text-white' : 'text-neutral-400'}`}>{step}</span>
                  </div>
                  {idx < 3 && <div className="w-6 sm:w-12 h-px bg-neutral-200 mx-1 sm:mx-2" />}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 pt-6 md:pt-10">
          {currentRentalStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-[#C5A059] rounded-full" />
                  <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Escolha na frota ativa o veículo para o novo contrato.</p>
                </div>
                
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por placa ou veículo..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-100 pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-xs text-neutral-900"
                  />
                  {vehicleSearch && (
                    <button
                      type="button"
                      onClick={() => setVehicleSearch('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {filteredVehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredVehicles.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setRentalForm({
                        ...rentalForm, 
                        plate: v.plate, 
                        vehicle: v.model,
                        vehicleId: v.id,
                        value: v.weeklyRental || ''
                      })}
                      className={`relative p-8 rounded-[3rem] border-2 text-left transition-all duration-500 group overflow-hidden ${rentalForm.plate === v.plate ? 'border-neutral-900 bg-neutral-900 text-white shadow-2xl shadow-neutral-900/20' : 'border-neutral-100 bg-white hover:border-[#C5A059]/30 hover:shadow-xl'}`}
                    >
                      <div className="h-44 rounded-[2rem] overflow-hidden mb-6 bg-neutral-100 relative">
                        <img src={v.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} alt={v.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        <div className="absolute top-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl border border-white/20">
                          <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">{v.plate}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className={`text-xl font-black uppercase tracking-tighter leading-none transition-colors ${rentalForm.plate === v.plate ? 'text-[#C5A059]' : 'text-neutral-900'}`}>{v.model}</h4>
                          <p className={`text-[10px] font-bold tracking-widest uppercase mt-2 ${rentalForm.plate === v.plate ? 'text-neutral-400' : 'text-neutral-400'}`}>Frota Própria / LA Locadora</p>
                        </div>

                        <div className={`p-5 rounded-2xl flex justify-between items-center transition-colors ${rentalForm.plate === v.plate ? 'bg-white/5 border border-white/10' : 'bg-neutral-50 border border-neutral-100'}`}>
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase tracking-widest font-black opacity-50 mb-1">Valor Semanal</span>
                            <span className={`text-lg font-black tracking-tight ${rentalForm.plate === v.plate ? 'text-white' : 'text-neutral-900'}`}>
                              {(v.weeklyRental ? 
                                (typeof v.weeklyRental === 'string' ? parseFloat(v.weeklyRental.replace(/\./g, '').replace(',', '.')) : v.weeklyRental)
                                  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                : 'Sob Consulta')}
                            </span>
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${rentalForm.plate === v.plate ? 'bg-[#C5A059] text-white' : 'bg-white text-[#C5A059]'}`}>
                            <Car size={18} />
                          </div>
                        </div>
                      </div>

                      {rentalForm.plate === v.plate && (
                        <div className="absolute top-6 left-6 w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                          <Check size={20} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-neutral-50 rounded-[3rem] border border-dashed border-neutral-200 animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 mb-4">
                    <Car size={32} />
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tighter text-neutral-900 mb-1">Nenhum veículo encontrado</h4>
                  <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Tente buscar por outro termo ou placa.</p>
                </div>
              )}
            </div>
          )}

          {currentRentalStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
              <div className="flex justify-between items-end border-b border-neutral-100 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-900 text-[#C5A059] rounded-2xl flex items-center justify-center shadow-lg">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-neutral-500 font-medium italic text-lg tracking-tight">Insira os dados pessoais e documentos do condutor.</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-black mt-1">Informações para o contrato jurídico</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={fillTestData}
                  className="px-6 py-3 bg-neutral-50 hover:bg-neutral-900 hover:text-white text-neutral-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 group"
                >
                  <TrendingUp size={14} className="group-hover:animate-bounce" />
                  Preencher dados de teste
                </button>
              </div>

              {/* Segmented Toggle Selector (Glassmorphic) */}
              <div className="flex justify-center p-1.5 bg-neutral-100 rounded-3xl max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setConductorType('cadastrar')}
                  className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${conductorType === 'cadastrar' ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  Cadastrar Condutor
                </button>
                <button
                  type="button"
                  onClick={() => setConductorType('cadastrado')}
                  className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${conductorType === 'cadastrado' ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                  Condutor Cadastrado
                </button>
              </div>

              {/* Dropdown to Autocomplete Registered Conductor */}
              {conductorType === 'cadastrado' && (
                <div className="bg-neutral-50 p-8 rounded-[2.5rem] border border-neutral-100 space-y-4 max-w-2xl mx-auto animate-in slide-in-from-top-4 duration-500">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-black ml-1">Selecionar Condutor Cadastrado</label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId === '') return;
                      const client = clients.find(c => c.id === selectedId);
                      if (client) {
                        setRentalForm({
                          ...rentalForm,
                          clientId: client.id,
                          user: client.nome || client.name || '',
                          clientPhone: client.telefone || client.phone || '',
                          email: client.email || '',
                          cpf: client.cpf || '',
                          cnhNumber: client.cnhNumber || client.cnh || '',
                          cnhRegisterNumber: client.cnhRegisterNumber || '',
                          birthDate: client.birthDate || '',
                          cnhValidity: client.cnhExpiration || client.cnhValidity || '',
                          docs: {
                            cnh: client.documentos?.cnh || client.docs?.cnh || null,
                            residence: client.documentos?.residence || client.docs?.residence || null,
                            appPrints: client.documentos?.appPrints || client.docs?.appPrints || [],
                            signedContract: client.documentos?.signedContract || client.docs?.signedContract || null
                          }
                        });
                      }
                    }}
                    className="w-full bg-white border border-neutral-200 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] transition-all font-bold text-neutral-900 text-xs cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Selecione um cliente da lista --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome || c.name} (CPF: {c.cpf || 'Não Informado'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Nome Completo</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                        <input type="text" required value={rentalForm.user || ''} onChange={e => setRentalForm({...rentalForm, user: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" placeholder="Ex: João Silva" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">WhatsApp de Contato</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                        <input type="text" required value={rentalForm.clientPhone || ''} onChange={e => setRentalForm({...rentalForm, clientPhone: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" placeholder="(79) 99999-9999" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">E-mail Principal</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                        <input type="email" required value={rentalForm.email || ''} onChange={e => setRentalForm({...rentalForm, email: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" placeholder="exemplo@email.com" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">CPF do Condutor</label>
                      <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                        <input type="text" required value={rentalForm.cpf || ''} onChange={e => setRentalForm({...rentalForm, cpf: formatCPF(e.target.value)})} className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" placeholder="000.000.000-00" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Data de Nascimento</label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-[#C5A059] transition-colors" size={18} />
                        <input type="date" required value={rentalForm.birthDate || ''} onChange={e => setRentalForm({...rentalForm, birthDate: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-neutral-50 rounded-[2.5rem] border border-neutral-100 space-y-6">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-black">Documentação CNH</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Número CNH</label>
                        <input type="text" required value={rentalForm.cnhNumber || ''} onChange={e => setRentalForm({...rentalForm, cnhNumber: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xs" placeholder="Ex: 123456789" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nº Registro</label>
                        <input type="text" required value={rentalForm.cnhRegisterNumber || ''} onChange={e => setRentalForm({...rentalForm, cnhRegisterNumber: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xs" placeholder="Ex: 987654321" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Validade</label>
                        <input type="date" required value={rentalForm.cnhValidity || ''} onChange={e => setRentalForm({...rentalForm, cnhValidity: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xs text-neutral-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black ml-1">Anexos Obrigatórios</p>
                  <div className="grid grid-cols-1 gap-4">
                    <label className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-500 group relative ${rentalForm.docs.cnh ? 'border-emerald-500 bg-emerald-50/30' : 'border-neutral-100 bg-neutral-50 hover:border-[#C5A059]/50 hover:bg-white'}`}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${rentalForm.docs.cnh ? 'bg-emerald-500 text-white animate-bounce' : 'bg-white text-neutral-300 group-hover:text-[#C5A059] group-hover:scale-110'}`}>
                        <Camera size={28} />
                      </div>
                      <div className="text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${rentalForm.docs.cnh ? 'text-emerald-600' : 'text-neutral-900'}`}>Foto da CNH</span>
                        <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">{rentalForm.docs.cnh ? (typeof rentalForm.docs.cnh === 'string' ? 'CNH Já Anexada' : rentalForm.docs.cnh.name || 'CNH Selecionada') : 'OBRIGATÓRIO'}</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            setIsProcessingFiles(true);
                            const compressed = await compressImage(file);
                            setRentalForm({...rentalForm, docs: { ...rentalForm.docs, cnh: compressed }});
                          } finally { setIsProcessingFiles(false); }
                        }
                      }} />
                      {isProcessingFiles && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-[2.5rem]"><Loader2 className="animate-spin text-[#C5A059]" /></div>}
                    </label>
 
                    <label className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-500 group relative ${rentalForm.docs.residence ? 'border-emerald-500 bg-emerald-50/30' : 'border-neutral-100 bg-neutral-50 hover:border-[#C5A059]/50 hover:bg-white'}`}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${rentalForm.docs.residence ? 'bg-emerald-500 text-white animate-bounce' : 'bg-white text-neutral-300 group-hover:text-[#C5A059] group-hover:scale-110'}`}>
                        <FileText size={28} />
                      </div>
                      <div className="text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${rentalForm.docs.residence ? 'text-emerald-600' : 'text-neutral-900'}`}>Comprovante</span>
                        <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">{rentalForm.docs.residence ? (typeof rentalForm.docs.residence === 'string' ? 'Documento Já Anexado' : rentalForm.docs.residence.name || 'Comprovante Selecionado') : '(OPCIONAL)'}</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            setIsProcessingFiles(true);
                            const compressed = file.type.includes('image') ? await compressImage(file) : file;
                            setRentalForm({...rentalForm, docs: { ...rentalForm.docs, residence: compressed }});
                          } finally { setIsProcessingFiles(false); }
                        }
                      }} />
                    </label>
 
                    <label className={`p-8 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-500 group relative ${rentalForm.docs.appPrints?.length > 0 ? 'border-emerald-500 bg-emerald-50/30' : 'border-neutral-100 bg-neutral-50 hover:border-[#C5A059]/50 hover:bg-white'}`}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${rentalForm.docs.appPrints?.length > 0 ? 'bg-emerald-500 text-white animate-bounce' : 'bg-white text-neutral-300 group-hover:text-[#C5A059] group-hover:scale-110'}`}>
                        <Smartphone size={28} />
                      </div>
                      <div className="text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${rentalForm.docs.appPrints?.length > 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>Prints App</span>
                        {rentalForm.docs.appPrints?.length > 0 ? (
                          <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
                            {typeof rentalForm.docs.appPrints[0] === 'string' ? `${rentalForm.docs.appPrints.length} PRINTS JÁ CARREGADOS` : `${rentalForm.docs.appPrints.length} IMAGENS SELECIONADAS`}
                          </span>
                        ) : (
                          <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">(OBRIGATÓRIO)</span>
                        )}
                      </div>
                      <input type="file" multiple className="hidden" accept="image/*" onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length > 0) {
                          try {
                            setIsProcessingFiles(true);
                            const compressed = await Promise.all(files.map(f => compressImage(f)));
                            setRentalForm({...rentalForm, docs: { ...rentalForm.docs, appPrints: compressed }});
                          } finally { setIsProcessingFiles(false); }
                        }
                      }} />
                    </label>
                  </div>
                </div>
              </div>
              {blockStatus.blocked && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4 mt-6">
                  <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
                  <div>
                    <h5 className="text-sm font-black text-red-900 uppercase tracking-tight">Condutor Bloqueado</h5>
                    <p className="text-xs text-red-600 font-medium mt-1">
                      Este condutor possui multas pendentes de pagamento com mais de 30 dias desde a data da infração. A criação de novas locações para este condutor está bloqueada até a regularização dos débitos.
                    </p>
                  </div>
                </div>
              )}
              {!blockStatus.blocked && blockStatus.activeFinesCount > 3 && (
                <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4 mt-6">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={24} />
                  <div>
                    <h5 className="text-sm font-black text-amber-900 uppercase tracking-tight">Aviso: Alto Índice de Infrações</h5>
                    <p className="text-xs text-amber-600 font-medium mt-1">
                      Este condutor possui {blockStatus.activeFinesCount} multas pendentes no sistema. Fique atento ao acúmulo de débitos e limite de pontuação na CNH.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentRentalStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Financial Summary */}
                <div className="lg:col-span-5">
                  <div className="p-10 bg-neutral-900 rounded-[3.5rem] border border-[#C5A059]/20 shadow-2xl relative overflow-hidden flex flex-col h-full">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 blur-[100px] -mr-32 -mt-32" />
                    
                    <div className="flex items-center gap-4 mb-10 relative">
                      <div className="w-12 h-12 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center border border-[#C5A059]/20">
                        <TrendingUp size={22} className="text-[#C5A059]" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-black">Dossiê Financeiro</p>
                        <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold mt-1">Cálculo de Provisão Semanal</p>
                      </div>
                    </div>

                    <div className="space-y-6 flex-1 relative">
                      {(() => {
                        const total = parseFloat(String(rentalForm.depositTotal).replace(/\./g, '').replace(',', '.')) || 0;
                        const paid = parseFloat(String(rentalForm.depositPaid).replace(/\./g, '').replace(',', '.')) || 0;
                        const balance = total - paid;
                        const installments = parseInt(rentalForm.depositInstallments) || 1;
                        const installmentVal = balance > 0 ? balance / installments : 0;
                        
                        const baseVal = parseFloat(String(rentalForm.value).replace(/\./g, '').replace(',', '.')) || 0;
                        const tireVal = parseFloat(rentalForm.tireTax) || 0;
                        const duration = parseInt(rentalForm.durationWeeks) || 1;
                        const totalRentalContract = baseVal * duration;
                        const weeklyTotal = baseVal + tireVal + installmentVal;

                        return (
                          <>
                            <div className="flex justify-between items-center bg-[#C5A059] p-5 rounded-[1.8rem] shadow-xl shadow-[#C5A059]/10 mb-8 border border-white/20">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center">
                                  <Calendar size={18} className="text-white" />
                                </div>
                                <div>
                                  <span className="text-white text-[10px] uppercase tracking-[0.2em] font-black block">Dia de Cobrança</span>
                                  <span className="text-black/60 text-[9px] font-bold uppercase">{getDayOfWeek(rentalForm.startDate)}</span>
                                </div>
                              </div>
                              <span className="text-white text-lg font-black uppercase tracking-tighter">Sempre {getDayOfWeek(rentalForm.startDate).split('-')[0]}</span>
                            </div>

                            <div className="space-y-4">
                              <div className="flex justify-between items-center group py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-[#C5A059] transition-colors" />
                                  <span className="text-neutral-400 text-xs font-bold group-hover:text-white transition-colors uppercase tracking-widest">Aluguel Base</span>
                                </div>
                                <span className="text-white text-base font-black tracking-tight">R$ {baseVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center group py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-[#C5A059] transition-colors" />
                                  <span className="text-neutral-400 text-xs font-bold group-hover:text-white transition-colors uppercase tracking-widest">Taxa Operacional Pneus</span>
                                </div>
                                <span className="text-white text-base font-black tracking-tight">R$ {tireVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              
                              <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 mt-6 mb-6">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-neutral-500 text-[9px] uppercase tracking-widest font-black">Comprometimento Total</span>
                                  <span className="text-neutral-500 text-[8px] font-bold">{duration} semanas</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-neutral-300 text-[10px] uppercase tracking-widest font-bold opacity-40 italic">Contrato Jurídico</span>
                                  <span className="text-[#C5A059] text-xl font-black tracking-tighter">R$ {totalRentalContract.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-8 border-t border-neutral-800/50 space-y-4">
                              <div className="flex justify-between items-center group">
                                <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold group-hover:text-neutral-300 transition-colors">Garantia Caução</span>
                                <span className="text-neutral-300 text-sm font-black">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center group">
                                <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold group-hover:text-neutral-300 transition-colors">Adiantamento Pago</span>
                                <span className="text-emerald-500 text-sm font-black">R$ {paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              {balance > 0 && (
                                <div className="flex justify-between items-center p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/10 mt-4 group hover:bg-amber-500/10 transition-all">
                                  <div className="flex flex-col">
                                    <span className="text-amber-500 text-[10px] uppercase tracking-[0.2em] font-black">Parcela Semanal Caução</span>
                                    <span className="text-neutral-500 text-[8px] font-bold mt-1">Saldo restante em {installments}x</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-amber-500 text-lg font-black tracking-tighter">+ R$ {installmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-auto pt-10 border-t border-neutral-800 relative">
                              <div className="flex justify-between items-end">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-black">Total Recorrente</span>
                                  </div>
                                  <p className="text-[9px] text-neutral-600 font-medium leading-tight max-w-[140px] uppercase tracking-widest">Base + Pneus + Parcela</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[#C5A059] text-5xl font-black tracking-tighter block leading-none mb-1">
                                    {weeklyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em]">REAIS / SEMANA</span>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="lg:col-span-7 space-y-10">
                  <div className="flex justify-between items-center bg-neutral-50 p-6 rounded-[2.5rem] border border-neutral-100">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-900 font-black">Modalidade de Contrato</p>
                      <p className="text-[9px] text-neutral-400 font-medium">Define a frequência da cobrança principal</p>
                    </div>
                    <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-neutral-200">
                      <button type="button" onClick={() => setRentalForm({...rentalForm, rentalType: 'daily'})} className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all duration-300 ${rentalForm.rentalType === 'daily' ? 'bg-neutral-900 text-white shadow-xl' : 'text-neutral-400 hover:text-neutral-900'}`}>Diária</button>
                      <button type="button" onClick={() => setRentalForm({...rentalForm, rentalType: 'weekly'})} className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all duration-300 ${rentalForm.rentalType === 'weekly' ? 'bg-neutral-900 text-white shadow-xl' : 'text-neutral-400 hover:text-neutral-900'}`}>Semanal</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <Wallet size={16} className="text-[#C5A059]" />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-900">Configuração de Valores</span>
                        </div>
                        
                        <div className="space-y-3">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor Aluguel ({rentalForm.rentalType === 'weekly' ? 'Semana' : 'Dia'})</label>
                          <div className="relative group">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 font-black text-sm group-focus-within:text-[#C5A059] transition-colors">R$</span>
                            <input type="text" required value={rentalForm.value || ''} onChange={e => { let v = e.target.value.replace(/\D/g, ''); v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); setRentalForm({...rentalForm, value: v}); }} className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-black text-lg tracking-tight" placeholder="0,00" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Taxa de Pneus (Extra)</label>
                          <div className="relative group">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 font-black text-sm group-focus-within:text-[#C5A059] transition-colors">R$</span>
                            <input type="text" value={rentalForm.tireTax || ''} onChange={e => { let v = e.target.value.replace(/\D/g, ''); v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); setRentalForm({...rentalForm, tireTax: v}); }} className="w-full bg-neutral-50 border border-neutral-100 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-black text-lg tracking-tight" placeholder="0,00" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className="text-[#C5A059]" />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-900">Período e Prazos</span>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-3">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data de Início do Contrato</label>
                            <input type="date" required value={rentalForm.startDate || ''} onChange={e => setRentalForm({...rentalForm, startDate: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] focus:bg-white transition-all font-bold text-sm" />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Vigência (Nº de Semanas)</label>
                            <div className="flex items-center bg-neutral-50 rounded-2xl p-2 h-[64px] border border-neutral-100 shadow-inner">
                              <button type="button" onClick={() => setRentalForm({...rentalForm, durationWeeks: Math.max(1, (parseInt(rentalForm.durationWeeks) || 1) - 1).toString()})} className="w-12 h-12 flex items-center justify-center bg-white border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-900 hover:text-white transition-all shadow-sm">-</button>
                              <input type="text" value={rentalForm.durationWeeks || ''} onChange={e => setRentalForm({...rentalForm, durationWeeks: e.target.value.replace(/\D/g, '')})} className="flex-1 bg-transparent border-none text-center outline-none font-black text-xl text-neutral-900 tracking-tighter" />
                              <button type="button" onClick={() => setRentalForm({...rentalForm, durationWeeks: ((parseInt(rentalForm.durationWeeks) || 1) + 1).toString()})} className="w-12 h-12 flex items-center justify-center bg-white border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-900 hover:text-white transition-all shadow-sm"><Plus size={16} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="p-8 bg-neutral-50 rounded-[2.5rem] border border-neutral-100 space-y-8">
                        <div className="flex items-center gap-3">
                          <Landmark size={16} className="text-[#C5A059]" />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-900">Garantia (Caução)</span>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor Total da Caução</label>
                            <div className="relative group">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 font-black text-sm group-focus-within:text-[#C5A059] transition-colors">R$</span>
                              <input type="text" required value={rentalForm.depositTotal || ''} onChange={e => { let v = e.target.value.replace(/\D/g, ''); v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); setRentalForm({...rentalForm, depositTotal: v}); }} className="w-full bg-white border border-neutral-200 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] transition-all font-black text-lg tracking-tight" placeholder="0,00" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor de Entrada (Ato)</label>
                            <div className="relative group">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 font-black text-sm group-focus-within:text-emerald-500 transition-colors">R$</span>
                              <input type="text" required value={rentalForm.depositPaid || ''} onChange={e => { let v = e.target.value.replace(/\D/g, ''); v = (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); setRentalForm({...rentalForm, depositPaid: v}); }} className="w-full bg-white border border-neutral-200 pl-12 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-lg tracking-tight text-emerald-600" placeholder="0,00" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Parcelamento do Saldo Devedor</label>
                            <div className="relative group">
                              <input type="number" min="1" max="12" value={rentalForm.depositInstallments || ''} onChange={e => setRentalForm({...rentalForm, depositInstallments: e.target.value})} className="w-full bg-white border border-neutral-200 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] transition-all font-black text-base" />
                              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-neutral-400">Semanas</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentRentalStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right duration-500 h-full">
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-100/50">
                  <Check size={48} />
                </div>
                <div>
                  <h4 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mb-2">Tudo Pronto!</h4>
                  <p className="text-neutral-500 font-light max-w-md mx-auto">Os dados foram validados. Agora você pode gerar o contrato e finalizar o registro da locação.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                  <button 
                    type="button" 
                    onClick={() => generateRentalContract(rentalForm)}
                    className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex flex-col items-center gap-4 group hover:bg-white transition-all hover:shadow-xl w-full"
                  >
                    <FileDown size={32} className="text-[#C5A059]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Gerar Contrato Digital</span>
                    <span className="text-[8px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors">BAIXAR .DOCX</span>
                  </button>
                  <label className={`p-6 rounded-3xl border-2 border-dashed flex flex-col items-center gap-4 cursor-pointer transition-all duration-500 group ${rentalForm.docs?.signedContract ? 'border-emerald-500 bg-emerald-50/30' : 'border-neutral-100 bg-neutral-50 hover:border-[#C5A059]/50 hover:bg-white hover:shadow-xl'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${rentalForm.docs?.signedContract ? 'bg-emerald-500 text-white animate-bounce' : 'bg-white text-neutral-400 group-hover:text-[#C5A059] group-hover:scale-110'}`}>
                      <Download size={24} className={rentalForm.docs?.signedContract ? '' : 'rotate-180'} />
                    </div>
                    <div className="text-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${rentalForm.docs?.signedContract ? 'text-emerald-600' : 'text-neutral-900'}`}>Anexar Assinado</span>
                      <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">{rentalForm.docs?.signedContract ? 'CONTRATO VINCULADO' : 'PDF OU IMAGEM'}</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        try {
                          setIsProcessingFiles(true);
                          const compressed = file.type.includes('image') ? await compressImage(file) : file;
                          setRentalForm({...rentalForm, docs: { ...rentalForm.docs, signedContract: compressed }});
                        } finally { setIsProcessingFiles(false); }
                      }
                    }} />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 md:p-12 border-t border-neutral-50 bg-neutral-50/30 flex justify-between shrink-0">
          <button 
            type="button"
            onClick={() => setCurrentRentalStep(Math.max(1, currentRentalStep - 1))}
            disabled={currentRentalStep === 1}
            className={`px-10 py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black transition-all ${currentRentalStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white text-neutral-400 hover:text-neutral-900 hover:shadow-lg'}`}
          >
            Voltar
          </button>
          
          <div className="flex gap-4">
            {currentRentalStep < totalRentalSteps ? (
              <button 
                type="button"
                onClick={() => setCurrentRentalStep(currentRentalStep + 1)}
                disabled={(currentRentalStep === 1 && !rentalForm.plate) || (currentRentalStep === 2 && blockStatus.blocked)}
                className={`bg-neutral-900 text-[#C5A059] px-16 py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-[#C5A059]/10 ${(currentRentalStep === 1 && !rentalForm.plate) || (currentRentalStep === 2 && blockStatus.blocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Próximo Passo
              </button>
            ) : (
              <button 
                type="button"
                onClick={onSubmit}
                disabled={blockStatus.blocked}
                className={`bg-neutral-900 text-[#C5A059] px-16 py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-[#C5A059]/10 ${blockStatus.blocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Finalizar e Ativar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalFormModal;
