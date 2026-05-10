import React, { useState, useEffect, useRef } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { 
  TrendingUp, Car, Mail, Key, Users, Wallet, Landmark, Wrench, Eye, X, Menu, 
  ChevronRight, AlertTriangle, Calendar, ClipboardList, Plus, Check, Camera, FileText
} from 'lucide-react';
import { EditorialLabel } from '../ui/EditorialLabel';
import AdminLeads from './tabs/AdminLeads';
import AdminFrota from './tabs/AdminFrota';
import AdminLocacoes from './tabs/AdminLocacoes';
import AdminInvestidores from './tabs/AdminInvestidores';
import AdminFinanceiro from './tabs/AdminFinanceiro';
import AdminCaucao from './tabs/AdminCaucao';
import AdminBI from './tabs/AdminBI';
import AdminManutencao from './tabs/AdminManutencao';
import AdminVistoria from './tabs/AdminVistoria';
import RentalDetailModal from './modals/RentalDetailModal';
import InspectionDetailModal from './modals/InspectionDetailModal';
import ContractClosureModal from './modals/ContractClosureModal';
import TerminationTermModal from './modals/TerminationTermModal';
import AdminUsuarios from './tabs/AdminUsuarios';
import AdminOficina from './tabs/AdminOficina';

const AdminDashboard = ({
  leads, rentals, investors, vehicles, transactions, onAddTransaction,
  onUpdateStatus, onAddRental, onDeleteRental, onUpdateRental,
  onAddInvestor, onUpdateInvestor, onDeleteInvestor,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
  maintenances, onAddMaintenance, onUpdateMaintenance, onDeleteMaintenance,
  inspections, onAddInspection, onDeleteInspection,
  serviceOrders, onCloseServiceOrder,
  onCompleteClosure, onPayCaucaoInstallment,
  currentUser, systemUsers, onAddSystemUser, onUpdateSystemUser, onDeleteSystemUser,
  onLogout, onGoHome, onViewVehicleDetail
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('bi');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRental, setIsEditingRental] = useState(false);

  // Permission helper
  const isAdmin = !currentUser || currentUser.role === 'administrador';
  const canAccess = (moduleId) => {
    if (isAdmin) return true;
    return (currentUser?.modules || []).includes(moduleId);
  };
  
  const [investorForm, setInvestorForm] = useState({
    name: '', email: '', phone: '', cpf: '', address: '',
    bank: '', pix: '', password: '', adminTax: '15', status: 'Ativo'
  });

  const [vehicleForm, setVehicleForm] = useState({
    model: '', 
    plate: '', 
    year: '', 
    renavam: '', 
    initialKm: '',
    fipeValue: '', 
    investor: '', 
    adminTax: '15', 
    investorTax: '85',
    protectionPaidByAdmin: false,
    protectionValue: '', 
    franchiseInsurance: false, 
    hasSpareKey: false,
    lastBeltChangeKm: '', 
    beltChangeIntervalKm: '50000', 
    image: '',
    imageFile: null,
    imagePreview: null,
    weeklyRental: '', 
    investmentValue: '',
    preventiveMaintenance: true,
    entryDate: new Date().toISOString().split('T')[0]
  });

  const [financeForm, setFinanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'in', val: '', desc: '', cat: 'Aluguel',
    vehiclePlate: '', responsible: 'Administradora'
  });

  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('todos');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('Todos');
  const [rentalFilter, setRentalFilter] = useState('ativas');
  const [financeFilter, setFinanceFilter] = useState('Todos');
  const [showFinanceForm, setShowFinanceForm] = useState(false);
  const [showDeleteAuthModal, setShowDeleteAuthModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showRentalDetailModal, setShowRentalDetailModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showInspectionDetailModal, setShowInspectionDetailModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showTerminationTerm, setShowTerminationTerm] = useState(false);
  const [finalClosureData, setFinalClosureData] = useState(null);
  const [showAdminSuccess, setShowAdminSuccess] = useState({ show: false, title: '', message: '' });
  const [currentRentalStep, setCurrentRentalStep] = useState(1);
  const totalRentalSteps = 4;

  const [rentalForm, setRentalForm] = useState({
    user: '',
    clientPhone: '',
    email: '',
    cnh: '',
    cnhValidity: '',
    cnhSecurityCode: '',
    vehicle: '',
    plate: '',
    rentalType: 'weekly', // 'daily' or 'weekly'
    value: '',
    tireTax: '25',
    durationWeeks: '4',
    depositTotal: '',
    depositPaid: '',
    depositInstallments: '1',
    startDate: new Date().toISOString().split('T')[0],
    lateFine: '10',
    dailyInterest: '1',
    observations: '',
    docs: {
      cnh: null,
      residence: null,
      appPrints: [],
      signedContract: null
    }
  });

  // Sidebar responsive logic
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetVehicleForm = () => {
    setVehicleForm({
      model: '', 
      plate: '', 
      year: '', 
      renavam: '', 
      initialKm: '',
      fipeValue: '', 
      investor: '', 
      adminTax: '15', 
      investorTax: '85',
      protectionPaidByAdmin: false,
      protectionValue: '', 
      franchiseInsurance: false, 
      hasSpareKey: false,
      lastBeltChangeKm: '', 
      beltChangeIntervalKm: '50000', 
      image: '',
      imageFile: null,
      imagePreview: null,
      weeklyRental: '', 
      investmentValue: '',
      preventiveMaintenance: true,
      entryDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    
    // Ensure the image property uses the preview URL for display
    const vehicleData = {
      ...vehicleForm,
      id: vehicleForm.id || Date.now(),
      image: vehicleForm.imagePreview || vehicleForm.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'
    };

    if (isEditing && vehicleForm.id) {
      onUpdateVehicle(vehicleData);
    } else {
      onAddVehicle(vehicleData);
    }
    setShowAddForm(false);
    resetVehicleForm();
    setIsEditing(false);
    
    setShowAdminSuccess({
      show: true,
      title: isEditing ? 'Veículo Atualizado' : 'Veículo Cadastrado',
      message: `O ${vehicleForm.model} foi ${isEditing ? 'atualizado' : 'registrado'} com sucesso na frota.`
    });
  };

  const handleSaveTransaction = (e) => {
    e.preventDefault();
    onAddTransaction({
      ...financeForm,
      val: parseFloat(financeForm.val.replace(',', '.')) * (financeForm.type === 'out' ? -1 : 1),
      status: 'Concluído'
    });
    setShowFinanceForm(false);
    setFinanceForm({
      date: new Date().toISOString().split('T')[0],
      type: 'in', val: '', desc: '', cat: 'Aluguel',
      vehiclePlate: '', responsible: 'Administradora'
    });
    setShowAdminSuccess({
      show: true,
      title: 'Lançamento Realizado',
      message: 'A transação foi registrada com sucesso no fluxo financeiro.'
    });
  };

  const handleSaveRental = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // Basic validation
    if (!rentalForm.plate || !rentalForm.user) {
      alert('Por favor, preencha os dados obrigatórios do veículo e condutor.');
      return;
    }

    const selectedVehicle = vehicles.find(v => v.plate === rentalForm.plate);
    onAddRental({
      ...rentalForm,
      id: Date.now(),
      date: rentalForm.startDate,
      period: `${rentalForm.durationWeeks} semanas`,
      vehicle: selectedVehicle ? selectedVehicle.model : rentalForm.vehicle,
      image: selectedVehicle ? selectedVehicle.image : 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80',
      status: 'Ativo',
      startDate: rentalForm.startDate
    });

    // Update vehicle status via onUpdateVehicle if available or just close
    if (onUpdateVehicle && selectedVehicle) {
      onUpdateVehicle({ ...selectedVehicle, status: 'Locado' });
    }

    setShowAddForm(false);
    setCurrentRentalStep(1);
    setRentalForm({
      user: '', clientPhone: '', email: '', cnh: '', cnhValidity: '', cnhSecurityCode: '',
      vehicle: '', plate: '', rentalType: 'weekly', value: '', tireTax: '25',
      durationWeeks: '4',
      depositTotal: '', depositPaid: '', depositInstallments: '1',
      startDate: new Date().toISOString().split('T')[0],
      lateFine: '10', dailyInterest: '1', observations: '',
      docs: { cnh: null, residence: null, appPrints: [], signedContract: null }
    });
    
    setShowAdminSuccess({
      show: true,
      title: 'Locação Registrada',
      message: `O contrato de ${rentalForm.user} foi criado e o veículo marcado como alugado.`
    });
  };

  const handleConfirmDelete = () => {
    if (deletePassword === 'Lareferencia') {
      if (deleteType === 'rental') {
        onDeleteRental(itemToDelete.id);
      } else if (deleteType === 'vehicle') {
        onDeleteVehicle(itemToDelete.id);
      } else if (deleteType === 'investor') {
        onDeleteInvestor(itemToDelete.id);
      }
      setShowDeleteAuthModal(false);
      setItemToDelete(null);
      setDeleteType(null);
      setDeletePassword('');
      
      setShowAdminSuccess({
        show: true,
        title: 'Excluído com Sucesso',
        message: 'O registro foi removido permanentemente do sistema.'
      });
    } else {
      alert('Senha incorreta. Ação não autorizada.');
    }
  };

  const payCaucaoInstallment = (rentalId, dateStr) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (rental) {
      onUpdateRental({
        ...rental,
        paidCaucaoDates: [...(rental.paidCaucaoDates || []), dateStr]
      });
    }
  };

  const calculateBIStats = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const monthlyRevenue = monthlyTransactions
      .filter(t => t.val > 0)
      .reduce((acc, t) => acc + t.val, 0);

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.val < 0)
      .reduce((acc, t) => acc + Math.abs(t.val), 0);

    const netProfit = monthlyRevenue - monthlyExpenses;
    
    const activeVehicles = vehicles.filter(v => v.status === 'Alugado').length;
    const totalVehicles = vehicles.length || 1;
    const utilizationRate = Math.round((activeVehicles / totalVehicles) * 100);

    const totalCaucao = rentals.reduce((acc, r) => {
      const val = parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0;
      return acc + val;
    }, 0);

    return {
      mainStats: [
        { label: 'Veículos Ativos', value: activeVehicles, icon: <Car size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Em Manutenção', value: vehicles.filter(v => v.status === 'Manutenção').length, icon: <Wrench size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Receita (Mês)', value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total de Caução', value: `R$ ${totalCaucao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <Landmark size={20} />, color: 'text-[#C5A059]', bg: 'bg-[#C5A059]/10' },
      ],
      operationalSummary: {
        utilizationRate,
        netProfit: netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        netProfitRaw: netProfit,
        profitMargin: monthlyRevenue > 0 ? Math.round((netProfit / monthlyRevenue) * 100) : 0,
        investorsCount: investors.length,
        newLeads: leads.filter(l => l.status === 'novo').length
      }
    };
  };

  const biData = calculateBIStats();
  const stats = biData.mainStats;

  const getDynamicAlerts = () => {
    const today = new Date();
    let preventiveCount = 0;
    let beltCount = 0;

    (vehicles || []).forEach(v => {
      // 6-month preventive maintenance alert
      const entryDate = new Date(v.entryDate);
      const monthsSinceEntry = (today.getFullYear() - entryDate.getFullYear()) * 12 + (today.getMonth() - entryDate.getMonth());
      
      if (monthsSinceEntry > 0 && monthsSinceEntry % 6 === 0 || (monthsSinceEntry + 1) % 6 === 0) {
        const recentPreventive = (maintenances || []).find(m => 
          m.vehiclePlate === v.plate && 
          (m.serviceType || '').toLowerCase().includes('preventiva') &&
          (today - new Date(m.date)) / (1000 * 60 * 60 * 24 * 30) < 2
        );
        if (!recentPreventive) preventiveCount++;
      }

      // Timing belt alert
      const currentKm = parseInt(v.km || 0);
      const lastChange = parseInt(v.lastBeltChangeKm || 0);
      const interval = parseInt(v.beltChangeIntervalKm || 60000);
      if (currentKm >= (lastChange + interval - 5000)) {
        beltCount++;
      }
    });

    return [
      { title: 'Manutenção Preventiva', count: preventiveCount, type: preventiveCount > 0 ? 'critical' : 'info', icon: <Wrench size={16} /> },
      { title: 'Troca de Correia Dentada', count: beltCount, type: beltCount > 0 ? 'critical' : 'info', icon: <Wrench size={16} /> },
      { title: 'CNH próxima do vencimento', count: 3, type: 'warning', icon: <Calendar size={16} /> },
      { title: 'Vistorias pendentes', count: 5, type: 'critical', icon: <ClipboardList size={16} /> },
    ];
  };

  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const date = new Date(dateStr + 'T00:00:00');
    return days[date.getDay()];
  };

  const handleGenerateContract = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "CONTRATO DE LOCAÇÃO DE VEÍCULO",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "LOCADOR: ", bold: true }),
              new TextRun("LA Locação de Veículos"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "LOCATÁRIO: ", bold: true }),
              new TextRun(rentalForm.user || "_________________________________"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CPF/CNH: ", bold: true }),
              new TextRun(rentalForm.cnh || "________________"),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "OBJETO DO CONTRATO",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun("O presente contrato tem como objeto a locação do veículo "),
              new TextRun({ text: rentalForm.vehicle || "[VEÍCULO]", bold: true }),
              new TextRun(", Placa: "),
              new TextRun({ text: rentalForm.plate || "[PLACA]", bold: true }),
              new TextRun("."),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "TERMOS FINANCEIROS",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Valor do Aluguel: ", bold: true }),
              new TextRun(`R$ ${rentalForm.value} por ${rentalForm.rentalType === 'weekly' ? 'semana' : 'dia'}.`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Taxa de Pneus: ", bold: true }),
              new TextRun(`R$ ${rentalForm.tireTax},00.`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Caução Total: ", bold: true }),
              new TextRun(`R$ ${rentalForm.depositTotal}.`),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: `Data de Início: ${rentalForm.startDate}`,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "_______________________________________",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: rentalForm.user || "Assinatura do Locatário",
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Contrato_${rentalForm.user || 'Locacao'}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const alerts = getDynamicAlerts();

  return (
    <div className="min-h-screen bg-neutral-50 flex animate-in fade-in duration-500 relative">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-[60] xl:hidden bg-neutral-900 text-[#C5A059] p-4 rounded-full shadow-2xl border border-neutral-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`bg-neutral-900 text-white flex flex-col fixed h-full z-50 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 opacity-0 xl:w-20 xl:translate-x-0 xl:opacity-100'}`}>
        <div className={`p-8 border-b border-neutral-800 transition-opacity duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white">LA</span>
            <span className="text-xl font-black text-[#C5A059]">LOCAÇÃO</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-4">
          <div className={`text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4 transition-opacity duration-300 ${!isSidebarOpen ? 'xl:opacity-0' : 'opacity-100'}`}>Gerenciamento</div>
          {[
                      { id: 'bi',             label: 'Business Inteligence', icon: TrendingUp },
            { id: 'frota',         label: 'Frota', icon: Car },
            { id: 'leads',         label: 'Leads', icon: Mail },
            { id: 'locacao',       label: 'Locação', icon: Key },
            { id: 'investidores',  label: 'Investidores', icon: Users },
            { id: 'financeiro',    label: 'Financeiro', icon: Wallet },
            { id: 'caucao',        label: 'Caução', icon: Landmark },
            { id: 'manutencaoAdmin', label: 'Manutenção', icon: Wrench },
            { id: 'vistoria',      label: 'Vistoria', icon: ClipboardList },
            { id: 'oficina',       label: 'Oficina', icon: Wrench },
            ...(isAdmin ? [{ id: 'usuarios', label: 'Usuários', icon: Users }] : []),
          ].filter(item => canAccess(item.id) || item.id === 'usuarios').map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1280) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 text-sm font-medium p-3 rounded-xl transition-all ${activeTab === item.id ? 'text-[#C5A059] bg-[#C5A059]/10 shadow-sm' : 'text-neutral-400 hover:text-white'}`}
              title={item.label}
            >
              <item.icon size={16} />
              <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-neutral-800 space-y-2">
          <button
            onClick={onGoHome}
            className="flex items-center gap-3 text-sm font-medium text-neutral-400 hover:text-white transition-colors w-full p-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#C5A059]/20 group-hover:text-[#C5A059] transition-all">
              <Eye size={14} />
            </div>
            <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Página Inicial</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 text-sm font-medium text-red-400 hover:text-red-300 transition-colors w-full p-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-red-400/10 flex items-center justify-center group-hover:bg-red-400/20 transition-all">
              <X size={14} />
            </div>
            <span className={`transition-all duration-300 ${!isSidebarOpen ? 'xl:hidden' : 'block'}`}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && window.innerWidth < 1280 && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-500 ${isSidebarOpen ? 'xl:ml-64' : 'xl:ml-20'}`}>
        <header className="h-20 bg-white border-b border-neutral-100 flex items-center justify-between px-6 md:px-12 shadow-sm relative z-10 shrink-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <div className="xl:hidden">
                <span className="text-xl font-black text-neutral-900">LA</span>
              </div>
            )}
            <h2 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-neutral-400 truncate max-w-[150px] md:max-w-none">
              {activeTab === 'bi' ? 'Business Inteligence' :
                activeTab === 'frota' ? 'Gestão de Frota' :
                activeTab === 'leads' ? 'Leads de Contato' :
                activeTab === 'locacao' ? 'Contratos de Locação' :
                activeTab === 'investidores' ? 'Cadastro de Investidores' :
                activeTab === 'financeiro' ? 'Controle Financeiro' :
                activeTab === 'caucao' ? 'Gestão de Caução' :
                activeTab === 'vistoria' ? 'Vistorias Técnicas' :
                activeTab === 'manutencaoAdmin' ? 'Histórico de Manutenções' : 
                activeTab === 'usuarios' ? 'Usuários do Sistema' : 
                activeTab === 'oficina' ? 'Oficina / O.S.' : 'Painel LA'}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
                          <p className="text-xs font-bold uppercase tracking-widest text-neutral-900">
              {currentUser?.name || 'Admin Principal'}
            </p>
              <p className="text-[10px] text-neutral-400 font-light">
              {currentUser ? (currentUser.role === 'administrador' ? 'Administrador' : 'Funcionário') : 'Laveiculos@gmail.com'}
              </p>
            </div>
            <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#C5A059]/30">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'LA'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          {activeTab === 'bi' && <AdminBI stats={stats} alerts={alerts} operationalData={biData.operationalSummary} />}
          {activeTab === 'leads' && (
            <AdminLeads 
              leads={leads} 
              leadSearch={leadSearch} 
              setLeadSearch={setLeadSearch}
              leadStatusFilter={leadStatusFilter}
              setLeadStatusFilter={setLeadStatusFilter}
              onUpdateStatus={onUpdateStatus}
            />
          )}
          {activeTab === 'frota' && (
            <AdminFrota 
              vehicles={vehicles}
              vehicleSearch={vehicleSearch}
              setVehicleSearch={setVehicleSearch}
              vehicleStatusFilter={vehicleStatusFilter}
              setVehicleStatusFilter={setVehicleStatusFilter}
              setShowAddForm={setShowAddForm}
              resetVehicleForm={resetVehicleForm}
              onViewVehicleDetail={onViewVehicleDetail}
              onUpdateVehicle={onUpdateVehicle}
              setVehicleForm={setVehicleForm}
              setSelectedVehicle={setSelectedVehicle}
              setIsEditing={setIsEditing}
              onDeleteVehicle={onDeleteVehicle}
              setItemToDelete={setItemToDelete}
              setDeleteType={setDeleteType}
              setShowDeleteAuthModal={setShowDeleteAuthModal}
            />
          )}
          {activeTab === 'locacao' && (
            <AdminLocacoes 
              rentals={rentals}
              rentalFilter={rentalFilter}
              setRentalFilter={setRentalFilter}
              setShowAddForm={setShowAddForm}
              resetRentalForm={() => {
                setCurrentRentalStep(1);
                setRentalForm({
                  user: '', clientPhone: '', email: '', cnh: '', cnhValidity: '', cnhSecurityCode: '',
                  vehicle: '', plate: '', rentalType: 'weekly', value: '', tireTax: '25',
                  durationWeeks: '4',
                  depositTotal: '', depositPaid: '', depositInstallments: '1',
                  startDate: new Date().toISOString().split('T')[0],
                  lateFine: '10', dailyInterest: '1', observations: '',
                  docs: { cnh: null, residence: null, appPrints: [], signedContract: null }
                });
              }}
              setSelectedRental={setSelectedRental}
              setShowRentalDetailModal={setShowRentalDetailModal}
              setIsEditingRental={setIsEditingRental}
              setItemToDelete={setItemToDelete}
              setDeleteType={setDeleteType}
              setShowDeleteAuthModal={setShowDeleteAuthModal}
            />
          )}
          {activeTab === 'investidores' && (
            <AdminInvestidores 
              investors={investors}
              investorForm={investorForm}
              setInvestorForm={setInvestorForm}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              onAddInvestor={onAddInvestor}
              onUpdateInvestor={onUpdateInvestor}
              onDeleteInvestor={onDeleteInvestor}
              setShowAdminSuccess={setShowAdminSuccess}
            />
          )}
          {activeTab === 'financeiro' && (
            <AdminFinanceiro 
              transactions={transactions}
              financeFilter={financeFilter}
              setFinanceFilter={setFinanceFilter}
              showFinanceForm={showFinanceForm}
              setShowFinanceForm={setShowFinanceForm}
              financeForm={financeForm}
              setFinanceForm={setFinanceForm}
              handleSaveTransaction={handleSaveTransaction}
              vehicles={vehicles}
            />
          )}
          {activeTab === 'caucao' && (
            <AdminCaucao 
              rentals={rentals}
              payCaucaoInstallment={onPayCaucaoInstallment}
            />
          )}
          {activeTab === 'manutencaoAdmin' && (
            <AdminManutencao 
              vehicles={vehicles}
              maintenances={maintenances}
              onAddMaintenance={isAdmin ? onAddMaintenance : undefined}
              onUpdateMaintenance={isAdmin ? onUpdateMaintenance : undefined}
              onDeleteMaintenance={isAdmin ? onDeleteMaintenance : undefined}
              setShowAdminSuccess={setShowAdminSuccess}
              isReadOnly={!isAdmin}
            />
          )}
          {activeTab === 'vistoria' && (
            <AdminVistoria 
              inspections={inspections} 
              vehicles={vehicles} 
              onAddInspection={isAdmin ? onAddInspection : undefined}
              onDeleteInspection={isAdmin ? onDeleteInspection : undefined}
              onViewDetail={(ins) => {
                setSelectedInspection(ins);
                setShowInspectionDetailModal(true);
              }}
              isReadOnly={!isAdmin}
            />
          )}
          {activeTab === 'usuarios' && isAdmin && (
            <AdminUsuarios 
              systemUsers={systemUsers}
              onAddUser={onAddSystemUser}
              onUpdateUser={onUpdateSystemUser}
              onDeleteUser={onDeleteSystemUser}
            />
          )}
          {activeTab === 'oficina' && (
            <AdminOficina
              vehicles={vehicles}
              investors={investors}
              serviceOrders={serviceOrders}
              onAddMaintenance={onAddMaintenance}
              onCloseServiceOrder={onCloseServiceOrder}
            />
          )}
        </div>
      </main>

      {/* Vehicle Form Modal */}
      {showAddForm && activeTab === 'frota' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-10 md:p-12 pb-6 border-b border-neutral-50 shrink-0 flex justify-between items-center">
              <div>
                <EditorialLabel className="text-[#C5A059] mb-1">{isEditing ? 'Gestão de Ativo' : 'Novo Ativo de Frota'}</EditorialLabel>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">
                  {isEditing ? 'Editar Veículo' : 'Cadastrar Veículo'}
                </h3>
              </div>
              <button onClick={() => setShowAddForm(false)} className="w-12 h-12 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400">
                <X size={24} />
              </button>
            </div>
            
            {/* Body */}
            <form onSubmit={handleSaveVehicle} className="flex-1 overflow-y-auto p-10 md:p-12 pt-8 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* Column 1: Basic & Technical */}
                <div className="space-y-10">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059]"><Car size={16} /></div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Identificação Técnica</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Marca / Modelo</label>
                        <input type="text" required value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="Ex: Chevrolet Onix 1.0 Turbo" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Placa (ID Único)</label>
                          <input type="text" required value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm uppercase" placeholder="ABC-1234" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Ano Fab. / Modelo</label>
                          <input type="text" required value={vehicleForm.year} onChange={e => setVehicleForm({...vehicleForm, year: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="2023/2024" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">RENAVAM</label>
                          <input type="text" required value={vehicleForm.renavam} onChange={e => setVehicleForm({...vehicleForm, renavam: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="00000000000" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">KM Inicial</label>
                          <input type="number" required value={vehicleForm.initialKm} onChange={e => setVehicleForm({...vehicleForm, initialKm: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="0" />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059]"><Users size={16} /></div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Vínculo e Investimento</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Investidor Dono</label>
                          <select required value={vehicleForm.investor} onChange={e => setVehicleForm({...vehicleForm, investor: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm">
                            <option value="">Selecione...</option>
                            {investors.map(inv => <option key={inv.id} value={inv.name}>{inv.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Divisão de Receita (%)</label>
                          <div className="grid grid-cols-2 gap-3 bg-neutral-100/50 p-2 rounded-2xl border border-neutral-100">
                            <div className="space-y-1">
                              <label className="text-[8px] uppercase font-bold text-neutral-400 ml-2">Admin</label>
                              <div className="relative">
                                <input 
                                  type="number" 
                                  value={vehicleForm.adminTax} 
                                  onChange={e => {
                                    const val = e.target.value;
                                    const invVal = 100 - (parseFloat(val) || 0);
                                    setVehicleForm({...vehicleForm, adminTax: val, investorTax: invVal.toString()});
                                  }} 
                                  className="w-full bg-white border border-neutral-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xs pr-7" 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">%</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] uppercase font-bold text-neutral-400 ml-2">Investidor</label>
                              <div className="relative">
                                <input 
                                  type="number" 
                                  value={vehicleForm.investorTax} 
                                  onChange={e => {
                                    const val = e.target.value;
                                    const admVal = 100 - (parseFloat(val) || 0);
                                    setVehicleForm({...vehicleForm, investorTax: val, adminTax: admVal.toString()});
                                  }} 
                                  className="w-full bg-white border border-neutral-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-xs pr-7" 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor do Investimento</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">R$</span>
                            <input type="text" value={vehicleForm.investmentValue} onChange={e => setVehicleForm({...vehicleForm, investmentValue: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="0,00" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor FIPE</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">R$</span>
                            <input type="text" value={vehicleForm.fipeValue} onChange={e => setVehicleForm({...vehicleForm, fipeValue: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="0,00" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Column 2: Protection & Maintenance */}
                <div className="space-y-10">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059]"><TrendingUp size={16} /></div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Custos e Operação</h4>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Valor Aluguel Semanal */}
                      <div className="p-6 bg-neutral-900 rounded-3xl border border-[#C5A059]/20 shadow-xl">
                        <label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black block mb-3">Valor Aluguel Semanal</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A059] text-[10px] font-black">R$</span>
                          <input 
                            type="text" 
                            required 
                            value={vehicleForm.weeklyRental} 
                            onChange={e => setVehicleForm({...vehicleForm, weeklyRental: e.target.value})} 
                            className="w-full bg-neutral-800 border-none pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all font-black text-white text-lg" 
                            placeholder="600,00" 
                          />
                        </div>
                        <p className="text-[8px] text-neutral-500 uppercase font-bold mt-3 italic">* Este valor será sugerido automaticamente na nova locação</p>
                      </div>

                      {/* Proteção Veicular */}
                      <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase tracking-widest text-neutral-900 font-black">Proteção Veicular</label>
                          <div className="flex bg-white p-1 rounded-xl border border-neutral-100">
                            <button type="button" onClick={() => setVehicleForm({...vehicleForm, protectionPaidByAdmin: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.protectionPaidByAdmin ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                            <button type="button" onClick={() => setVehicleForm({...vehicleForm, protectionPaidByAdmin: false, protectionValue: ''})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.protectionPaidByAdmin ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                          </div>
                        </div>
                        {vehicleForm.protectionPaidByAdmin && (
                          <div className="animate-in slide-in-from-top-2 duration-300 pt-2 border-t border-neutral-200/50">
                            <p className="text-[8px] text-neutral-400 uppercase font-bold mb-2">Valor Mensal (Debitado do Carro)</p>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] font-black">R$</span>
                              <input type="text" value={vehicleForm.protectionValue} onChange={e => setVehicleForm({...vehicleForm, protectionValue: e.target.value})} className="w-full bg-white border border-neutral-100 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="0,00" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Seguro Franquia */}
                      <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex items-center justify-between">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-neutral-900 font-black block">Seguro Franquia</label>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase mt-1">Débito de R$ 39,90/mês</p>
                        </div>
                        <div className="flex bg-white p-1 rounded-xl border border-neutral-100">
                          <button type="button" onClick={() => setVehicleForm({...vehicleForm, franchiseInsurance: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.franchiseInsurance ? 'bg-[#C5A059] text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                          <button type="button" onClick={() => setVehicleForm({...vehicleForm, franchiseInsurance: false})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.franchiseInsurance ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                        </div>
                      </div>

                      {/* Chave Reserva */}
                      <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-900 font-black">Chave Reserva</label>
                        <div className="flex bg-white p-1 rounded-xl border border-neutral-100">
                          <button type="button" onClick={() => setVehicleForm({...vehicleForm, hasSpareKey: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.hasSpareKey ? 'bg-emerald-500 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                          <button type="button" onClick={() => setVehicleForm({...vehicleForm, hasSpareKey: false})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.hasSpareKey ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059]"><Wrench size={16} /></div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Manutenção Preventiva</h4>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex items-center justify-between">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-neutral-900 font-black block">Possui Correia Dentada?</label>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase mt-1">Habilita controle de troca</p>
                        </div>
                        <div className="flex bg-white p-1 rounded-xl border border-neutral-100">
                          <button type="button" onClick={() => setVehicleForm({...vehicleForm, preventiveMaintenance: true})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${vehicleForm.preventiveMaintenance ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Sim</button>
                          <button type="button" onClick={() => setVehicleForm({...vehicleForm, preventiveMaintenance: false})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!vehicleForm.preventiveMaintenance ? 'bg-neutral-900 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-600'}`}>Não</button>
                        </div>
                      </div>

                      {vehicleForm.preventiveMaintenance && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <p className="text-[8px] text-neutral-400 uppercase font-black ml-1 tracking-widest border-l-2 border-[#C5A059] pl-3">Parâmetros de Troca</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">KM Última Troca</label>
                              <input type="number" value={vehicleForm.lastBeltChangeKm} onChange={e => setVehicleForm({...vehicleForm, lastBeltChangeKm: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="0" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Intervalo (KM)</label>
                              <input type="number" value={vehicleForm.beltChangeIntervalKm} onChange={e => setVehicleForm({...vehicleForm, beltChangeIntervalKm: e.target.value})} className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="50000" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Foto do Veículo */}
              <div className="pt-6 border-t border-neutral-100">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#C5A059]"><Camera size={16} /></div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-neutral-900">Apresentação do Ativo</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase leading-relaxed">Insira uma foto de alta qualidade do veículo. Esta imagem será exibida no dashboard administrativo e no portal do investidor.</p>
                      
                      <label className={`relative group cursor-pointer flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-[2.5rem] transition-all overflow-hidden ${vehicleForm.imageFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-neutral-200 hover:border-[#C5A059] hover:bg-neutral-50'}`}>
                        {vehicleForm.imageFile ? (
                          <>
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50">
                              <Check size={32} />
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block mb-1">Foto Carregada</span>
                              <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[200px] block">{vehicleForm.imageFile.name}</span>
                            </div>
                            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <span className="text-white text-[10px] font-black uppercase tracking-widest bg-neutral-900/80 px-6 py-3 rounded-full">Trocar Foto</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-300 group-hover:text-[#C5A059] group-hover:bg-[#C5A059]/10 transition-all">
                              <Camera size={32} />
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-black uppercase tracking-widest text-neutral-900 block mb-1">Selecionar Foto</span>
                              <span className="text-[10px] text-neutral-400 font-bold uppercase">Clique ou arraste o arquivo</span>
                            </div>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setVehicleForm({
                                  ...vehicleForm, 
                                  imageFile: file,
                                  imagePreview: reader.result,
                                  image: reader.result
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                    </div>

                    <div className="relative rounded-[2.5rem] overflow-hidden bg-neutral-100 border border-neutral-200 aspect-video flex items-center justify-center group shadow-inner">
                      {vehicleForm.imagePreview || vehicleForm.image ? (
                        <img 
                          src={vehicleForm.imagePreview || vehicleForm.image} 
                          alt="Preview" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-neutral-300">
                          <Car size={48} strokeWidth={1} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Pré-visualização</span>
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className="bg-neutral-900/80 backdrop-blur-md text-[#C5A059] text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-[#C5A059]/30">Preview Ativo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            
            {/* Footer */}
            <div className="p-10 md:p-12 border-t border-neutral-50 bg-neutral-50/30 flex justify-end shrink-0">
              <button 
                onClick={handleSaveVehicle}
                className="bg-neutral-900 text-[#C5A059] px-16 py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-[#C5A059]/10"
              >
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rental Form Modal (Multi-step) */}
      {showAddForm && activeTab === 'locacao' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-4">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white w-full max-w-7xl h-full max-h-[95vh] rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden">
            {/* Header / Steps Indicator */}
            <div className="p-10 md:p-12 pb-6 border-b border-neutral-50 shrink-0">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <EditorialLabel className="text-[#C5A059] mb-1">Passo {currentRentalStep} de {totalRentalSteps}</EditorialLabel>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">
                    {currentRentalStep === 1 ? 'Seleção do Veículo' : 
                     currentRentalStep === 2 ? 'Dados do Condutor' : 
                     currentRentalStep === 3 ? 'Termos Financeiros' : 'Gestão de Contrato'}
                  </h3>
                </div>
                <button onClick={() => setShowAddForm(false)} className="text-neutral-400 hover:text-neutral-900 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {['Veículo', 'Condutor', 'Financeiro', 'Contrato'].map((step, idx) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${currentRentalStep === idx + 1 ? 'bg-[#C5A059] text-white' : currentRentalStep > idx + 1 ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                      {currentRentalStep > idx + 1 ? <Check size={14} /> : idx + 1}
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-black ${currentRentalStep === idx + 1 ? 'text-neutral-900' : 'text-neutral-400'}`}>{step}</span>
                    {idx < 3 && <div className="w-8 h-px bg-neutral-100 mx-2" />}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-10 md:p-12 pt-8">
              {currentRentalStep === 1 && (
                <div className="animate-in fade-in slide-in-from-right duration-500">
                  <p className="text-neutral-500 font-light mb-8 italic">Selecione na frota o veículo que será vinculado a este novo contrato.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vehicles.filter(v => v.status === 'Disponível').map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setRentalForm({
                          ...rentalForm, 
                          plate: v.plate, 
                          vehicle: v.model,
                          value: v.weeklyRental || ''
                        })}
                        className={`p-6 rounded-[2rem] border-2 text-left transition-all group ${rentalForm.plate === v.plate ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-[#C5A059]/30'}`}
                      >
                        <div className="h-32 rounded-2xl overflow-hidden mb-4 bg-neutral-200">
                          <img src={v.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} alt={v.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <h4 className="font-black text-neutral-900 uppercase tracking-tight">{v.model}</h4>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">{v.plate}</p>
                          <span className="text-[10px] font-black text-[#C5A059]">
                            {(v.weeklyRental ? 
                              (typeof v.weeklyRental === 'string' ? parseFloat(v.weeklyRental.replace(/\./g, '').replace(',', '.')) : v.weeklyRental)
                                .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                              : 'Sob Consulta')} /sem
                          </span>
                        </div>
                        {rentalForm.plate === v.plate && (
                          <div className="mt-4 flex items-center gap-2 text-emerald-600">
                            <Check size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Selecionado</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentRentalStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nome Completo</label>
                      <input type="text" required value={rentalForm.user} onChange={e => setRentalForm({...rentalForm, user: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="Ex: João Silva" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">WhatsApp</label>
                      <input type="text" required value={rentalForm.clientPhone} onChange={e => setRentalForm({...rentalForm, clientPhone: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="(79) 99999-9999" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">E-mail</label>
                      <input type="email" required value={rentalForm.email} onChange={e => setRentalForm({...rentalForm, email: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="exemplo@email.com" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">CNH</label>
                        <input type="text" required value={rentalForm.cnh} onChange={e => setRentalForm({...rentalForm, cnh: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" placeholder="Número da CNH" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Cód. Seg.</label>
                        <input type="text" required value={rentalForm.cnhSecurityCode} onChange={e => setRentalForm({...rentalForm, cnhSecurityCode: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Validade CNH</label>
                      <input type="date" required value={rentalForm.cnhValidity} onChange={e => setRentalForm({...rentalForm, cnhValidity: e.target.value})} className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm" />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-50">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-black mb-6">Documentação para Anexo</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <label className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${rentalForm.docs.cnh ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                        {rentalForm.docs.cnh ? <Check size={24} className="text-emerald-500" /> : <Camera size={24} className="text-neutral-300 group-hover:text-[#C5A059]" />}
                        <div className="text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest block ${rentalForm.docs.cnh ? 'text-emerald-600' : 'text-neutral-400'}`}>Foto CNH</span>
                          {rentalForm.docs.cnh && <span className="text-[8px] text-emerald-400 font-bold truncate max-w-[100px] block">{rentalForm.docs.cnh.name}</span>}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => setRentalForm({
                            ...rentalForm, 
                            docs: { ...rentalForm.docs, cnh: e.target.files[0] }
                          })} 
                        />
                      </label>

                      <label className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${rentalForm.docs.residence ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                        {rentalForm.docs.residence ? <Check size={24} className="text-emerald-500" /> : <FileText size={24} className="text-neutral-300 group-hover:text-[#C5A059]" />}
                        <div className="text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest block ${rentalForm.docs.residence ? 'text-emerald-600' : 'text-neutral-400'}`}>Residência</span>
                          {rentalForm.docs.residence ? (
                            <span className="text-[8px] text-emerald-400 font-bold truncate max-w-[100px] block">{rentalForm.docs.residence.name}</span>
                          ) : (
                            <span className="text-[8px] text-neutral-300 uppercase font-bold">(Opcional)</span>
                          )}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => setRentalForm({
                            ...rentalForm, 
                            docs: { ...rentalForm.docs, residence: e.target.files[0] }
                          })} 
                        />
                      </label>

                      <label className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${rentalForm.docs.appPrints.length > 0 ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                        {rentalForm.docs.appPrints.length > 0 ? <Check size={24} className="text-emerald-500" /> : <Plus size={24} className="text-neutral-300 group-hover:text-[#C5A059]" />}
                        <div className="text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest block ${rentalForm.docs.appPrints.length > 0 ? 'text-emerald-600' : 'text-neutral-400'}`}>Prints App</span>
                          {rentalForm.docs.appPrints.length > 0 ? (
                            <span className="text-[8px] text-emerald-400 font-bold block">{rentalForm.docs.appPrints.length} arquivos</span>
                          ) : (
                            <span className="text-[8px] text-neutral-300 uppercase font-bold">(Opcional)</span>
                          )}
                        </div>
                        <input 
                          type="file" 
                          multiple 
                          className="hidden" 
                          onChange={(e) => setRentalForm({
                            ...rentalForm, 
                            docs: { 
                              ...rentalForm.docs, 
                              appPrints: [...rentalForm.docs.appPrints, ...Array.from(e.target.files)] 
                            }
                          })} 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {currentRentalStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Financial Summary on Top/Side */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="p-8 bg-neutral-900 rounded-[2.5rem] border border-[#C5A059]/20 shadow-2xl relative overflow-hidden">
                        {/* Background subtle glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-3xl -mr-16 -mt-16" />
                        
                        <div className="flex items-center gap-3 mb-8">
                          <div className="w-10 h-10 bg-[#C5A059]/10 rounded-full flex items-center justify-center">
                            <TrendingUp size={18} className="text-[#C5A059]" />
                          </div>
                          <p className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-black">Resumo do Financeiro</p>
                        </div>

                        <div className="space-y-4">
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
                                <div className="flex justify-between items-center bg-[#C5A059] p-4 rounded-2xl shadow-lg shadow-[#C5A059]/20 mb-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                      <Calendar size={14} className="text-white" />
                                    </div>
                                    <span className="text-white text-[10px] uppercase tracking-widest font-black">Cobrança Recorrente</span>
                                  </div>
                                  <span className="text-white text-sm font-black uppercase">{getDayOfWeek(rentalForm.startDate)}</span>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex justify-between items-center group">
                                    <span className="text-neutral-400 text-xs font-medium group-hover:text-neutral-300 transition-colors">Aluguel Semanal</span>
                                    <span className="text-white text-sm font-black">R$ {baseVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between items-center group">
                                    <span className="text-neutral-400 text-xs font-medium group-hover:text-neutral-300 transition-colors">Taxa de Pneus</span>
                                    <span className="text-white text-sm font-black">R$ {tireVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <span className="text-neutral-300 text-[10px] uppercase tracking-widest font-bold">Total do Contrato ({duration} sem)</span>
                                    <span className="text-[#C5A059] text-sm font-black">R$ {totalRentalContract.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>

                                <div className="pt-6 border-t border-neutral-800 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">Caução Total</span>
                                    <span className="text-neutral-300 text-sm font-black">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">Pago no Ato</span>
                                    <span className="text-emerald-500 text-sm font-black">R$ {paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  {balance > 0 && (
                                    <div className="flex justify-between items-center p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                      <div className="flex flex-col">
                                        <span className="text-amber-500 text-[9px] uppercase tracking-widest font-black">Parcela Caução</span>
                                        <span className="text-neutral-500 text-[8px] font-medium">{installments}x semanas</span>
                                      </div>
                                      <span className="text-amber-500 text-sm font-black">+ R$ {installmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-8 border-t border-neutral-800">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-neutral-500 text-[10px] uppercase tracking-widest font-black">Total a pagar semanalmente</span>
                                    <div className="flex items-center gap-1">
                                      <TrendingUp size={10} className="text-emerald-500" />
                                      <span className="text-emerald-500 text-[8px] font-black uppercase">Calculado</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-end">
                                    <p className="text-[10px] text-neutral-400 font-light leading-tight max-w-[150px]">Aluguel + Pneus + Parcela Caução</p>
                                    <div className="text-right">
                                      <span className="text-[#C5A059] text-3xl font-black tracking-tighter block leading-none">
                                        R$ {weeklyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">/ por semana</span>
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
                    <div className="lg:col-span-7 space-y-8">
                      {/* Rental Type Toggle */}
                      <div className="flex bg-neutral-100 p-1 rounded-2xl w-fit">
                        <button type="button" onClick={() => setRentalForm({...rentalForm, rentalType: 'daily'})} className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${rentalForm.rentalType === 'daily' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}>Diária</button>
                        <button type="button" onClick={() => setRentalForm({...rentalForm, rentalType: 'weekly'})} className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${rentalForm.rentalType === 'weekly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}>Semanal</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section: Valores de Locação */}
                        <div className="space-y-6">
                          <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Wallet size={14} className="text-[#C5A059]" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Valores de Locação</span>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Valor Aluguel / {rentalForm.rentalType === 'weekly' ? 'Semana' : 'Dia'}</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                                <input type="text" required value={rentalForm.value} onChange={e => setRentalForm({...rentalForm, value: e.target.value})} className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm" placeholder="600" />
                              </div>
                              <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest ml-1 flex items-center gap-1"><TrendingUp size={10} /> Base de cálculo investidor</p>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Taxa de Pneus</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                                <input type="text" value={rentalForm.tireTax} onChange={e => setRentalForm({...rentalForm, tireTax: e.target.value})} className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm" />
                              </div>
                              <p className="text-[8px] text-[#C5A059] font-bold uppercase tracking-widest ml-1">Fica 100% para a empresa</p>
                            </div>
                          </div>

                          {/* Section: Período */}
                          <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar size={14} className="text-[#C5A059]" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Período de Contrato</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Data Início</label>
                                <input type="date" required value={rentalForm.startDate} onChange={e => setRentalForm({...rentalForm, startDate: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-xs" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Duração (Semanas)</label>
                                <div className="flex items-center bg-white rounded-2xl p-1 h-[52px] border border-neutral-200">
                                  <button type="button" onClick={() => setRentalForm({...rentalForm, durationWeeks: Math.max(1, (parseInt(rentalForm.durationWeeks) || 1) - 1).toString()})} className="w-10 h-10 flex items-center justify-center bg-neutral-50 rounded-xl text-neutral-600 hover:text-neutral-900 transition-all">-</button>
                                  <input type="text" value={rentalForm.durationWeeks} onChange={e => setRentalForm({...rentalForm, durationWeeks: e.target.value.replace(/\D/g, '')})} className="flex-1 bg-transparent border-none text-center outline-none font-black text-sm text-neutral-900" />
                                  <button type="button" onClick={() => setRentalForm({...rentalForm, durationWeeks: ((parseInt(rentalForm.durationWeeks) || 1) + 1).toString()})} className="w-10 h-10 flex items-center justify-center bg-neutral-50 rounded-xl text-neutral-600 hover:text-neutral-900 transition-all"><Plus size={14} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {/* Section: Caução */}
                          <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Landmark size={14} className="text-[#C5A059]" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Gestão de Caução</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Caução Total</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                                  <input type="text" required value={rentalForm.depositTotal} onChange={e => setRentalForm({...rentalForm, depositTotal: e.target.value})} className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm" placeholder="1000" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Pago no Ato</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">R$</span>
                                  <input type="text" required value={rentalForm.depositPaid} onChange={e => setRentalForm({...rentalForm, depositPaid: e.target.value})} className="w-full bg-white border border-neutral-200 pl-10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm text-emerald-600" placeholder="200" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Parcelamento do Saldo</label>
                              <select value={rentalForm.depositInstallments} onChange={e => setRentalForm({...rentalForm, depositInstallments: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}x semanas</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Section: Penalidades */}
                          <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle size={14} className="text-[#C5A059]" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Atrasos e Multas</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Multa Atraso</label>
                                <div className="relative">
                                  <input type="text" value={rentalForm.lateFine} onChange={e => setRentalForm({...rentalForm, lateFine: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm pr-8" />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">%</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Juros Dia</label>
                                <div className="relative">
                                  <input type="text" value={rentalForm.dailyInterest} onChange={e => setRentalForm({...rentalForm, dailyInterest: e.target.value})} className="w-full bg-white border border-neutral-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-black text-sm pr-8" />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">%</span>
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
                <div className="animate-in fade-in slide-in-from-right duration-500 flex flex-col items-center justify-center py-12">
                  <div className="w-full max-w-2xl space-y-10">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-[#C5A059]/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                        <FileText size={32} className="text-[#C5A059]" />
                      </div>
                      <h2 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter">Finalização do Contrato</h2>
                      <p className="text-sm text-neutral-500 font-medium">Gere o documento oficial e anexe a cópia assinada para concluir o processo.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Action: Generate */}
                      <button 
                        type="button"
                        onClick={handleGenerateContract}
                        className="p-8 bg-neutral-900 rounded-[2.5rem] border border-neutral-800 hover:border-[#C5A059]/50 transition-all group text-left space-y-6 shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-3xl" />
                        <div className="w-12 h-12 bg-[#C5A059]/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus size={24} className="text-[#C5A059]" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-black block mb-2">Ação Requerida</span>
                          <h3 className="text-white text-lg font-black uppercase tracking-tight">Gerar Contrato Automático</h3>
                          <p className="text-neutral-500 text-xs mt-2 font-medium">O sistema irá preencher todos os dados em um modelo de Word pronto para impressão.</p>
                        </div>
                      </button>

                      {/* Action: Upload */}
                      <label className={`p-8 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer flex flex-col space-y-6 ${rentalForm.docs.signedContract ? 'border-emerald-500 bg-emerald-50/30' : 'border-neutral-100 hover:border-[#C5A059]/30 hover:bg-neutral-50'}`}>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => setRentalForm({
                            ...rentalForm, 
                            docs: { ...rentalForm.docs, signedContract: e.target.files[0] }
                          })}
                        />
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${rentalForm.docs.signedContract ? 'bg-emerald-500' : 'bg-neutral-100 text-neutral-400'}`}>
                          {rentalForm.docs.signedContract ? <Check size={24} className="text-white" /> : <Camera size={24} />}
                        </div>
                        <div>
                          <span className={`text-[10px] uppercase tracking-[0.2em] font-black block mb-2 ${rentalForm.docs.signedContract ? 'text-emerald-600' : 'text-neutral-400'}`}>Upload de Documento</span>
                          <h3 className={`text-lg font-black uppercase tracking-tight ${rentalForm.docs.signedContract ? 'text-emerald-700' : 'text-neutral-900'}`}>
                            {rentalForm.docs.signedContract ? 'Contrato Anexado' : 'Anexar Assinado'}
                          </h3>
                          <p className="text-neutral-500 text-xs mt-2 font-medium">
                            {rentalForm.docs.signedContract ? rentalForm.docs.signedContract.name : 'PDF ou imagem da cópia assinada pelo locatário.'}
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 flex items-start gap-4">
                      <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-1" />
                      <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                        <strong className="uppercase">Importante:</strong> Ao finalizar, o veículo será marcado como "Locado" e o financeiro será iniciado.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-10 md:p-12 pt-6 border-t border-neutral-50 bg-neutral-50/30 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => currentRentalStep > 1 && setCurrentRentalStep(prev => prev - 1)}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all ${currentRentalStep === 1 ? 'opacity-0 pointer-events-none' : 'text-neutral-400 hover:text-neutral-900 hover:bg-white'}`}
              >
                Voltar
              </button>
              
              <button 
                onClick={() => {
                  if (currentRentalStep < 4) setCurrentRentalStep(prev => prev + 1);
                  else handleSaveRental();
                }}
                className="bg-neutral-900 text-[#C5A059] px-12 py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-[#C5A059] hover:text-white transition-all shadow-xl shadow-[#C5A059]/10"
              >
                {currentRentalStep === 4 ? 'Finalizar Contrato' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Popup */}
      {showAdminSuccess.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setShowAdminSuccess({ ...showAdminSuccess, show: false })} />
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <Check size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 mb-4">{showAdminSuccess.title}</h3>
            <p className="text-neutral-500 font-light mb-10 leading-relaxed">{showAdminSuccess.message}</p>
            <button onClick={() => setShowAdminSuccess({ ...showAdminSuccess, show: false })} className="w-full py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all">Continuar</button>
          </div>
        </div>
      )}

      {/* Delete Authorization Modal */}
      {showDeleteAuthModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xl" onClick={() => setShowDeleteAuthModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={40} />
            </div>
            <div className="text-center mb-10">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 mb-4">Autorização Requerida</h3>
              <p className="text-neutral-500 text-sm font-medium leading-relaxed">Esta é uma ação irreversível. Insira a senha mestre para confirmar a exclusão do registro.</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Senha Mestre</label>
                <input 
                  type="password" 
                  autoFocus
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmDelete()}
                  className="w-full bg-neutral-50 border-2 border-neutral-100 p-5 rounded-2xl outline-none focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 transition-all font-bold text-center text-lg tracking-widest"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmDelete}
                  className="w-full py-5 bg-red-600 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20"
                >
                  Confirmar Exclusão
                </button>
                <button 
                  onClick={() => {
                    setShowDeleteAuthModal(false);
                    setDeletePassword('');
                  }}
                  className="w-full py-5 bg-neutral-100 text-neutral-400 text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-neutral-200 hover:text-neutral-900 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rental Detail Modal */}
      {showRentalDetailModal && selectedRental && (
        <RentalDetailModal 
          rental={selectedRental} 
          onClose={() => {
            setShowRentalDetailModal(false);
            setSelectedRental(null);
          }} 
        />
      )}

      {showInspectionDetailModal && selectedInspection && (
        <InspectionDetailModal 
          inspection={selectedInspection}
          onClose={() => {
            setShowInspectionDetailModal(false);
            setSelectedInspection(null);
          }}
          onCloseContract={(ins) => {
            setSelectedInspection(ins);
            setShowClosureModal(true);
          }}
        />
      )}

      {showClosureModal && selectedInspection && (
        <ContractClosureModal 
          inspection={selectedInspection}
          rental={rentals.find(r => r.plate === selectedInspection.vehiclePlate)}
          rentals={rentals}
          transactions={transactions}
          onClose={() => setShowClosureModal(false)}
          onConfirm={(closureData) => {
            const currentRental = rentals.find(r => r.plate === selectedInspection.vehiclePlate);
            if (currentRental) {
              onCompleteClosure(currentRental.id, closureData);
              setFinalClosureData(closureData);
              setShowClosureModal(false);
              setShowTerminationTerm(true);
            }
          }}
        />
      )}

      {showTerminationTerm && selectedInspection && finalClosureData && (
        <TerminationTermModal 
          inspection={selectedInspection}
          rental={rentals.find(r => r.plate === selectedInspection.vehiclePlate)}
          closureData={finalClosureData}
          onClose={() => {
            setShowTerminationTerm(false);
            setShowInspectionDetailModal(false);
            setSelectedInspection(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
