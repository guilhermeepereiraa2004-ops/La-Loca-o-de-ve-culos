import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Receipt, ArrowRight, Car, AlertCircle,
  FileText, Loader2, Copy, ExternalLink, X, QrCode, CheckCircle2,
  Clock, AlertTriangle, RefreshCw, CalendarDays
} from 'lucide-react';
import { getDayOfWeek } from '../../../utils/adminUtils.jsx';
import { EditorialLabel } from '../../ui/EditorialLabel';
import {
  getOrCreateCustomer,
  createBoleto,
  createPix,
  getNextDueDate,
  getPaymentsForRental,
} from '../../../utils/asaas.js';

// ─── Modal de resultado do boleto/Pix ────────────────────────────────────────
const BoletoResultModal = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-neutral-900 p-8 relative">
          <button onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#C5A059]/20 rounded-2xl flex items-center justify-center">
              {result.type === 'pix' ? <QrCode size={20} className="text-[#C5A059]" /> : <Receipt size={20} className="text-[#C5A059]" />}
            </div>
            <div>
              <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">
                {result.type === 'pix' ? 'Pix Gerado' : 'Boleto Gerado'}
              </p>
              <h4 className="text-white font-black text-lg tracking-tight">
                R$ {parseFloat(result.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h4>
            </div>
          </div>
          <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">
            Vencimento: {result.dueDate ? new Date(result.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
          </p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              {result.type === 'pix' ? 'Pix gerado com sucesso no Sandbox Asaas' : 'Boleto gerado com sucesso no Sandbox Asaas'}
            </span>
          </div>

          {/* Boleto Fields */}
          {result.type === 'boleto' && (
            <>
              {result.identificationField && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Linha Digitável</p>
                  <div className="flex gap-2">
                    <input readOnly value={result.identificationField}
                      className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs font-mono text-neutral-700 outline-none" />
                    <button onClick={() => handleCopy(result.identificationField)}
                      className="shrink-0 w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center hover:bg-[#C5A059] transition-colors group">
                      {copied ? <CheckCircle2 size={14} className="text-white" /> : <Copy size={14} className="text-white" />}
                    </button>
                  </div>
                </div>
              )}
              {result.bankSlipUrl && (
                <a href={result.bankSlipUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full py-4 bg-[#C5A059] text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-neutral-900 hover:text-white transition-all flex items-center justify-center gap-2 group">
                  <FileText size={16} />
                  Visualizar PDF do Boleto
                  <ExternalLink size={12} className="opacity-60 group-hover:opacity-100" />
                </a>
              )}
            </>
          )}

          {/* Pix Fields */}
          {result.type === 'pix' && (
            <>
              {result.payload && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Copia e Cola Pix</p>
                  <div className="flex gap-2">
                    <input readOnly value={result.payload}
                      className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs font-mono text-neutral-700 outline-none" />
                    <button onClick={() => handleCopy(result.payload)}
                      className="shrink-0 w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center hover:bg-[#C5A059] transition-colors">
                      {copied ? <CheckCircle2 size={14} className="text-white" /> : <Copy size={14} className="text-white" />}
                    </button>
                  </div>
                </div>
              )}
              {result.encodedImage && (
                <div className="flex justify-center">
                  <img src={`data:image/png;base64,${result.encodedImage}`}
                    alt="QR Code Pix" className="w-48 h-48 rounded-2xl border border-neutral-100" />
                </div>
              )}
            </>
          )}

          <p className="text-[9px] text-neutral-400 text-center font-bold uppercase tracking-widest">
            ⚠ Ambiente de testes (Sandbox) — nenhum valor real é cobrado
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
// ─── Badge de status do pagamento ─────────────────────────────────────────────
const PaymentStatusBadge = ({ status }) => {
  const map = {
    RECEIVED:  { label: 'Recebido',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10} /> },
    CONFIRMED: { label: 'Confirmado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10} /> },
    PENDING:   { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: <Clock size={10} /> },
    OVERDUE:   { label: 'Vencido',   cls: 'bg-red-50 text-red-700 border-red-200',             icon: <AlertTriangle size={10} /> },
    REFUNDED:  { label: 'Estornado', cls: 'bg-neutral-50 text-neutral-500 border-neutral-200', icon: <RefreshCw size={10} /> },
  };
  const s = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
};

const AdminFaturamento = ({ rentals = [], replacementContracts = [], vehicles = [], clients = [], fines = [], onConfirmPayment }) => {
  const [search, setSearch] = useState('');
  const [lateFees, setLateFees] = useState({});
  const [generating, setGenerating] = useState({}); // rentalId → 'boleto' | 'pix' | false
  const [boletoResult, setBoletoResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [paymentHistory, setPaymentHistory] = useState({}); // rentalId → []

  const handleConfirm = (rentalId, calc) => {
    const lateFee = parseFloat(lateFees[rentalId] || 0);
    onConfirmPayment(rentalId, { ...calc, lateFee });
    alert('Pagamento confirmado e receita enviada ao financeiro!');
  };

  // Carrega histórico de pagamentos de um contrato
  const loadPaymentHistory = useCallback(async (rentalId) => {
    const payments = await getPaymentsForRental(rentalId);
    setPaymentHistory(prev => ({ ...prev, [rentalId]: payments }));
  }, []);

  // Ao montar o painel (ou quando a lista de contratos muda),
  // carrega o histórico de todos os contratos ativos em paralelo
  useEffect(() => {
    const activeRentals = (Array.isArray(rentals) ? rentals : []).filter(r => r.status === 'Ativo');
    if (activeRentals.length === 0) return;
    Promise.all(activeRentals.map(r => loadPaymentHistory(r.id)));
  }, [rentals, loadPaymentHistory]);

  const handleGenerateBoleto = async (rental, calc, type = 'boleto') => {
    setGenerating(prev => ({ ...prev, [rental.id]: type }));
    setErrors(prev => ({ ...prev, [rental.id]: null }));

    try {
      let client = (clients || []).find(c =>
        (rental.clientId && c.id === rental.clientId) ||
        (rental.id_cliente && c.id === rental.id_cliente) ||
        (rental.idCliente && c.id === rental.idCliente)
      );
      if (!client && (rental.cpf || rental.cpfCnpj)) {
        const queryCpf = rental.cpf || rental.cpfCnpj;
        client = (clients || []).find(c => c.cpf && queryCpf.replace(/\D/g, '') === c.cpf.replace(/\D/g, ''));
      }
      if (!client) {
        client = (clients || []).find(c => 
          (c.nome || c.name || '').toLowerCase() === (rental.user || rental.userName || '').toLowerCase()
        );
      }

      const customerData = {
        name: rental.user || rental.userName || 'Condutor',
        cpfCnpj: client?.cpf || rental.cpf || '',
        email: client?.email || rental.email || '',
        phone: client?.phone || client?.telefone || rental.clientPhone || '',
      };

      const customerId = await getOrCreateCustomer(customerData);

      const lateFee = parseFloat(lateFees[rental.id] || 0);
      const totalValue = parseFloat((calc.total + lateFee).toFixed(2));

      // Calcula o vencimento correto baseado no dia da semana do contrato
      const dueDate = getNextDueDate(rental.startDate || rental.date);
      let description = `Locação - ${rental.user || rental.userName} | ${rental.vehicle || rental.vehicleModel} (${rental.plate || rental.vehiclePlate})`;
      if (calc.finesDetails && calc.finesDetails.length > 0) {
        const finesDesc = calc.finesDetails.map(fd => `Multa: ${fd.infraction} (parc. ${fd.installment})`).join(', ');
        description += ` | ${finesDesc}`;
      }

      let result;
      if (type === 'pix') {
        // createPix já busca e mescla o QR Code internamente
        const payment = await createPix({ rentalId: rental.id, customerId, value: totalValue, dueDate, description });
        result = { type: 'pix', value: totalValue, dueDate, ...payment };
      } else {
        const payment = await createBoleto({ rentalId: rental.id, customerId, value: totalValue, dueDate, description });
        result = { type: 'boleto', value: totalValue, ...payment };
      }

      setBoletoResult(result);
      // Atualiza o histórico imediatamente após gerar
      await loadPaymentHistory(rental.id);
    } catch (err) {
      console.error('Erro ao gerar cobrança Asaas:', err);
      setErrors(prev => ({ ...prev, [rental.id]: err.message }));
    } finally {
      setGenerating(prev => ({ ...prev, [rental.id]: false }));
    }
  };

  const calculateBoleto = (rental) => {
    const weeklyRate = parseFloat(String(rental.value || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const dailyRate = weeklyRate / 7;

    const dueDateStr = getNextDueDate(rental.startDate || rental.date);
    if (!dueDateStr) {
      return { weeklyRate, dailyRate, daysInMaintenance: 0, abatimento: 0, replacementCharge: 0, replacementDays: 0, replacementDailyRate: 0, tireTax: 0, total: weeklyRate, activeRC: null, rcsDetails: [] };
    }

    const dueDateObj = new Date(dueDateStr + 'T12:00:00');
    
    const cycleStartObj = new Date(dueDateObj.getTime());
    cycleStartObj.setDate(dueDateObj.getDate() - 7);
    const cycleStartStr = cycleStartObj.toISOString().split('T')[0];

    const cycleEndObj = new Date(dueDateObj.getTime());
    cycleEndObj.setDate(dueDateObj.getDate() - 1);
    const cycleEndStr = cycleEndObj.toISOString().split('T')[0];

    const getDaysOverlap = (startAStr, endAStr, startBStr, endBStr) => {
      if (!startAStr || !startBStr || !endBStr) return 0;
      
      const dateAStart = new Date(startAStr.split('T')[0] + 'T00:00:00');
      const dateAEnd = endAStr 
        ? new Date(endAStr.split('T')[0] + 'T23:59:59') 
        : new Date('2099-12-31T23:59:59');
      
      const dateBStart = new Date(startBStr + 'T00:00:00');
      const dateBEnd = new Date(endBStr + 'T23:59:59');
      
      const overlapStart = new Date(Math.max(dateAStart.getTime(), dateBStart.getTime()));
      const overlapEnd = new Date(Math.min(dateAEnd.getTime(), dateBEnd.getTime()));
      
      if (overlapStart > overlapEnd) {
        return 0;
      }
      
      const diffTime = overlapEnd.getTime() - overlapStart.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const rentalPlate = rental.plate || rental.vehiclePlate;
    const rentalDriver = rental.user || rental.userName;

    const matchedRCs = Array.isArray(replacementContracts)
      ? replacementContracts.filter(rc => 
          (rc.mainVehiclePlate && rentalPlate && rc.mainVehiclePlate.toLowerCase() === rentalPlate.toLowerCase()) ||
          (rc.driverName && rentalDriver && rc.driverName.toLowerCase() === rentalDriver.toLowerCase())
        )
      : [];

    let totalDaysInMaintenance = 0;
    let totalReplacementCharge = 0;
    let rcsDetails = [];

    matchedRCs.forEach(rc => {
      const overlapDays = getDaysOverlap(rc.startDate, rc.endDate, cycleStartStr, cycleEndStr);
      if (overlapDays > 0) {
        totalDaysInMaintenance += overlapDays;
        const rate = parseFloat(rc.dailyRate) || 80;
        totalReplacementCharge += rate * overlapDays;
        
        rcsDetails.push({
          plate: rc.replacementVehiclePlate,
          days: overlapDays,
          rate,
          total: rate * overlapDays,
          status: rc.status
        });
      }
    });

    if (totalDaysInMaintenance > 7) {
      totalDaysInMaintenance = 7;
    }

    const abatimento = dailyRate * totalDaysInMaintenance;
    const tireTax = parseFloat(String(rental.tireTax || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const lateFeeVal = parseFloat(lateFees[rental.id] || 0);

    // Find matching fines for this rental/driver
    const rentalDriverName = (rental.user || rental.userName || '').trim().toLowerCase();
    const rentalClientId = rental.clientId;

    const driverFines = (fines || []).filter(f => {
      const isSameDriver = (rentalClientId && f.driverId === rentalClientId) ||
        (rentalDriverName && (f.driverName || '').trim().toLowerCase() === rentalDriverName);
      return isSameDriver && (f.status === 'Pendente' || f.status === 'Em Cobrança') && f.billingSuspended !== true;
    });

    let finesTotal = 0;
    const finesDetails = [];

    driverFines.forEach(f => {
      const paidCount = Array.isArray(f.paidInstallments) ? f.paidInstallments.length : 0;
      if (paidCount < f.installments) {
        const currentInstNum = paidCount + 1;
        const instVal = f.installmentValue || 0;
        finesTotal += instVal;
        finesDetails.push({
          id: f.id,
          infraction: f.infraction,
          installment: `${currentInstNum}/${f.installments}`,
          value: instVal
        });
      }
    });

    const baseTotal = (weeklyRate - abatimento) + totalReplacementCharge + tireTax + finesTotal;
    const total = baseTotal + lateFeeVal;

    const activeRC = matchedRCs.find(rc => rc.status === 'Ativo') || null;

    return { 
      weeklyRate, 
      dailyRate, 
      daysInMaintenance: totalDaysInMaintenance, 
      abatimento, 
      replacementCharge: totalReplacementCharge, 
      replacementDays: totalDaysInMaintenance, 
      replacementDailyRate: activeRC ? (activeRC.dailyRate || 80) : 0, 
      tireTax, 
      total, 
      activeRC,
      cycleStart: cycleStartStr,
      cycleEnd: cycleEndStr,
      rcsDetails,
      finesDetails
    };
  };

  const safeRentals = Array.isArray(rentals) ? rentals : [];
  const filtered = safeRentals.filter(r =>
    r.status === 'Ativo' &&
    (
      (r.userName || r.user || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.plate || r.vehiclePlate || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPrevisao = filtered.reduce((acc, r) => acc + calculateBoleto(r).total, 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Modal de resultado */}
      {boletoResult && <BoletoResultModal result={boletoResult} onClose={() => setBoletoResult(null)} />}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-pulse" />
            <EditorialLabel className="text-neutral-900 tracking-[0.2em]">Módulo de Receita e Cobrança</EditorialLabel>
          </div>
          <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-neutral-900 leading-none">Faturamento</h3>
          <p className="text-neutral-500 font-medium italic text-sm tracking-tight">
            Gestão individual de boletos e Pix baseada no ciclo de cada contrato.
          </p>
        </div>

        <div className="relative w-full lg:w-80 group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#C5A059] transition-colors" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar condutor ou placa..."
            className="w-full bg-white border border-neutral-200/80 py-3.5 pl-11 pr-4 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-neutral-900 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#C5A059]/5 blur-xl -mr-10 -mt-10" />
          <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-1">Previsão Semanal</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-black text-[#C5A059] tracking-tight">R$</span>
            <h4 className="text-3xl font-black text-white tracking-tighter">
              {totalPrevisao.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h4>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-1">Integração</p>
          <div>
            <h4 className="text-xl font-black text-emerald-600 tracking-tight leading-none">Asaas</h4>
            <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Sandbox Ativo ✓</p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-neutral-100 shadow-sm flex flex-col justify-between">
          <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-1">Ciclo Ativo</p>
          <div>
            <h4 className="text-3xl font-black text-neutral-900 tracking-tight leading-none">{filtered.length}</h4>
            <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider mt-1">Condutores Ativos</p>
          </div>
        </div>
      </div>

      {/* Rental Cards */}
      <div className="space-y-8">
        {filtered.length > 0 ? (
          filtered.map(rental => {
            const calc = calculateBoleto(rental);
            const isGenerating = generating[rental.id];
            const errorMsg = errors[rental.id];
            const history = paymentHistory[rental.id] || [];

            return (
              <div key={rental.id} className="bg-white rounded-3xl border border-neutral-150 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-neutral-200">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  {/* Left Section: Details (Main Info) */}
                  <div className="lg:col-span-8 p-6 md:p-8 space-y-6">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-100/80">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-neutral-900 text-[#C5A059] rounded-xl flex items-center justify-center font-black text-lg shadow-sm">
                          {(rental.userName || rental.user || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-neutral-900 uppercase tracking-tight">{rental.userName || rental.user}</h4>
                          <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                            Cobrança: {getDayOfWeek(rental.startDate || rental.date)}s
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-neutral-900 uppercase tracking-tight">{rental.vehicleModel || rental.vehicle}</span>
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200/60 uppercase">{rental.plate || rental.vehiclePlate}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-bold">Base: R$ {calc.weeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / sem</p>
                      </div>
                    </div>

                    {/* Details Sub-grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Módulo 1: Detalhamento Financeiro */}
                      <div className="p-5 rounded-2xl bg-neutral-50/50 border border-neutral-100/70 space-y-4">
                        <h6 className="text-[10px] uppercase font-black tracking-widest text-[#C5A059] border-b border-neutral-100 pb-2">Valores do Ciclo</h6>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs font-medium text-neutral-500">
                            <span>Aluguel Base</span>
                            <span className="font-bold text-neutral-800">R$ {calc.weeklyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs font-medium text-neutral-500">
                            <span>Taxa de Pneus</span>
                            <span className="font-bold text-neutral-800">R$ {calc.tireTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          {calc.daysInMaintenance > 0 && (
                            <div className="flex justify-between items-center text-xs p-2.5 bg-red-50/50 rounded-xl border border-red-100 text-red-700">
                              <div className="space-y-0.5">
                                <p className="font-black uppercase text-[8px] tracking-wider">Abatimento Oficina</p>
                                <p className="text-[8px] text-red-500 font-bold">{calc.daysInMaintenance} dias de oficina</p>
                              </div>
                              <span className="font-black">- R$ {calc.abatimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}

                          {calc.finesDetails && calc.finesDetails.length > 0 && (
                            <div className="pt-2 border-t border-neutral-200/40 space-y-2">
                              <p className="text-[8px] font-black uppercase tracking-wider text-amber-600">Multas Inclusas</p>
                              {calc.finesDetails.map((fd, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[11px] text-neutral-600 border-l-2 border-amber-400 pl-3">
                                  <div>
                                    <p className="font-bold text-neutral-800 line-clamp-1">{fd.infraction}</p>
                                    <p className="text-[8px] text-neutral-400 uppercase tracking-tighter">Parcela {fd.installment}</p>
                                  </div>
                                  <span className="font-black text-neutral-900">R$ {fd.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-3 border-t border-neutral-200/40 flex items-center justify-between">
                            <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest">Ajuste Manual</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-neutral-400">R$</span>
                              <input
                                type="number"
                                value={lateFees[rental.id] || ''}
                                onChange={e => setLateFees({ ...lateFees, [rental.id]: e.target.value })}
                                placeholder="0,00"
                                className="w-20 bg-white border border-neutral-200 rounded-lg p-1.5 text-right text-xs font-black outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Módulo 2: Carro Reserva */}
                      <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${calc.replacementCharge > 0 ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm' : 'bg-neutral-50/30 border-neutral-100/70 opacity-60'}`}>
                        <div className="w-full">
                          <h6 className={`text-[10px] uppercase font-black tracking-widest border-b pb-2 ${calc.replacementCharge > 0 ? 'text-[#C5A059] border-neutral-800' : 'text-neutral-800 border-neutral-100'}`}>Carro Reserva</h6>
                          {calc.replacementCharge > 0 ? (
                            <div className="space-y-4 pt-3">
                              {calc.rcsDetails.map((rc, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-neutral-800 rounded-lg flex items-center justify-center text-[#C5A059]"><Car size={13} /></div>
                                    <div>
                                      <p className="text-xs font-black uppercase tracking-tight">{rc.plate}</p>
                                      <p className="text-[7px] text-neutral-400 font-bold uppercase tracking-wider leading-none">
                                        {rc.days}d × R$ {rc.rate} {rc.status === 'Encerrado' && '(Finalizado)'}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-neutral-355">+ R$ {rc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center py-10 text-neutral-400">
                              <AlertCircle size={20} className="mb-2 text-neutral-300 opacity-60" />
                              <p className="text-[8px] font-black uppercase tracking-widest leading-none">Sem adicionais ativos</p>
                              <p className="text-[7px] text-neutral-400/80 font-bold uppercase mt-1">Sem carro reserva neste ciclo</p>
                            </div>
                          )}
                        </div>

                        {calc.replacementCharge > 0 && (
                          <div className="flex justify-between items-center pt-3 border-t border-neutral-800 mt-4">
                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Total Adicional</span>
                            <span className="text-sm font-black text-[#C5A059]">+ R$ {calc.replacementCharge.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Módulo 3: Histórico de Cobranças */}
                    {history.length > 0 && (
                      <div className="pt-6 border-t border-neutral-100/80">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Histórico de Cobranças (Asaas)</p>
                          <button onClick={() => loadPaymentHistory(rental.id)}
                            className="text-[8px] font-black text-neutral-400 hover:text-neutral-900 uppercase tracking-widest flex items-center gap-1 transition-colors">
                            <RefreshCw size={10} /> Atualizar status
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {history.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-neutral-50/50 border border-neutral-100 rounded-xl">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-white border border-neutral-200/60 rounded-md flex items-center justify-center text-neutral-500 shrink-0">
                                  {p.billing_type === 'PIX' ? <QrCode size={11} /> : <Receipt size={11} />}
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-neutral-800 uppercase tracking-tight">R$ {parseFloat(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  <p className="text-[7px] text-neutral-400 font-bold uppercase tracking-wider">Venc: {new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <PaymentStatusBadge status={p.status} />
                                {p.bank_slip_url && (
                                  <a href={p.bank_slip_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[8px] font-black text-[#C5A059] hover:text-neutral-900 hover:underline transition-colors">
                                    PDF
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Section: Actions & Checkout Panel */}
                  <div className="lg:col-span-4 p-6 md:p-8 bg-neutral-50/40 border-t lg:border-t-0 lg:border-l border-neutral-100 flex flex-col justify-between space-y-6">
                    {/* Invoice Summary Card */}
                    <div className="p-6 bg-neutral-900 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-2xl -mr-10 -mt-10" />
                      
                      <div className="space-y-4 relative">
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-1">Total do Ciclo</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base text-[#C5A059] font-black">R$</span>
                            <span className="text-3xl font-black text-white tracking-tighter leading-none">
                              {calc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-[7px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Aluguel + Ajustes + Reserva</p>
                        </div>
                        
                        <div className="pt-4 border-t border-neutral-800 flex items-center gap-2">
                          <CalendarDays size={12} className="text-[#C5A059] shrink-0" />
                          <div>
                            <p className="text-[7px] text-neutral-500 font-black uppercase tracking-widest">Próximo Vencimento</p>
                            <p className="text-xs font-black text-[#C5A059] uppercase tracking-tight">
                              {(() => {
                                const d = getNextDueDate(rental.startDate || rental.date);
                                return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
                                  weekday: 'short', day: '2-digit', month: '2-digit'
                                });
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Error Msg */}
                    <div className="space-y-3">
                      {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-3">
                          <p className="text-[8px] font-black text-red-600 uppercase tracking-widest">Erro: {errorMsg}</p>
                        </div>
                      )}

                      <button
                        onClick={() => handleGenerateBoleto(rental, calc, 'boleto')}
                        disabled={!!isGenerating}
                        className="w-full py-3.5 bg-[#C5A059] text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-950 hover:text-white transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating === 'boleto'
                          ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
                          : <><Receipt size={13} /> Gerar Boleto</>
                        }
                      </button>

                      <button
                        onClick={() => handleGenerateBoleto(rental, calc, 'pix')}
                        disabled={!!isGenerating}
                        className="w-full py-3.5 bg-white border border-neutral-200 text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating === 'pix'
                          ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
                          : <><QrCode size={13} /> Gerar Pix</>
                        }
                      </button>

                      <button
                        onClick={() => handleConfirm(rental.id, calc)}
                        className="w-full py-2.5 border border-neutral-200/60 text-neutral-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-50 hover:text-neutral-600 transition-all flex items-center justify-center gap-1.5"
                      >
                        Confirmar Manual <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-20 text-center bg-white border border-neutral-100 rounded-3xl shadow-sm">
            <Receipt size={32} className="mx-auto mb-4 text-neutral-200" />
            <h4 className="text-lg font-black text-neutral-900 uppercase tracking-tighter mb-1">Sem faturamento ativo</h4>
            <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Nenhum contrato ativo encontrado para este ciclo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFaturamento;
