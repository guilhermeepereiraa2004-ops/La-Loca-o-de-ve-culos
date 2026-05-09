import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Car, Mail, Key, Users, Wallet, Landmark, Wrench, Eye, X, Menu, 
  ChevronRight, AlertTriangle, Calendar, ClipboardList, Plus
} from 'lucide-react';
import AdminLeads from './tabs/AdminLeads';
import AdminFrota from './tabs/AdminFrota';
import AdminLocacoes from './tabs/AdminLocacoes';
import AdminInvestidores from './tabs/AdminInvestidores';
import AdminFinanceiro from './tabs/AdminFinanceiro';
import AdminCaucao from './tabs/AdminCaucao';
import AdminBI from './tabs/AdminBI';

const AdminDashboard = ({
  leads, rentals, investors, vehicles, transactions, onAddTransaction,
  onUpdateStatus, onAddRental, onDeleteRental, onUpdateRental,
  onAddInvestor, onUpdateInvestor, onDeleteInvestor,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
  onLogout, onGoHome, onViewVehicleDetail
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('bi');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRental, setIsEditingRental] = useState(false);
  
  const [investorForm, setInvestorForm] = useState({
    name: '', email: '', phone: '', cpf: '', address: '',
    bank: '', pix: '', password: '', adminTax: '15', status: 'Ativo'
  });

  const [vehicleForm, setVehicleForm] = useState({
    model: '', plate: '', year: '', renavam: '', initialKm: '',
    fipeValue: '', investor: '', adminTax: '15', protectionPaidByAdmin: false,
    protectionValue: '', franchiseInsurance: false, hasSpareKey: false,
    lastBeltChangeKm: '', beltChangeIntervalKm: '', image: '',
    dividend: '', weeklyRental: '', investmentValue: '',
    preventiveMaintenance: false, crlvFile: null,
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
  const [showRentalDetailModal, setShowRentalDetailModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [showAdminSuccess, setShowAdminSuccess] = useState({ show: false, title: '', message: '' });

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
      model: '', plate: '', year: '', renavam: '', initialKm: '',
      fipeValue: '', investor: '', adminTax: '15', protectionPaidByAdmin: false,
      protectionValue: '', franchiseInsurance: false, hasSpareKey: false,
      lastBeltChangeKm: '', beltChangeIntervalKm: '', image: '',
      dividend: '', weeklyRental: '', investmentValue: '',
      preventiveMaintenance: false, crlvFile: null
    });
  };

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    if (isEditing && vehicleForm.id) {
      onUpdateVehicle(vehicleForm);
    } else {
      onAddVehicle(vehicleForm);
    }
    setShowAddForm(false);
    resetVehicleForm();
    setIsEditing(false);
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

  const payCaucaoInstallment = (rentalId, dateStr) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (rental) {
      onUpdateRental({
        ...rental,
        paidCaucaoDates: [...(rental.paidCaucaoDates || []), dateStr]
      });
    }
  };

  const stats = [
    { label: 'Veículos Ativos', value: vehicles.filter(v => v.status === 'Alugado').length, icon: <Car size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Em Manutenção', value: vehicles.filter(v => v.status === 'Manutenção').length, icon: <Wrench size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Faturamento Mensal', value: `R$ ${transactions.reduce((acc, t) => acc + t.val, 0).toLocaleString('pt-BR')}`, icon: <TrendingUp size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total de Caução', value: `R$ ${rentals.reduce((acc, r) => acc + (parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <Landmark size={20} />, color: 'text-[#C5A059]', bg: 'bg-[#C5A059]/10' },
  ];

  const alerts = [
    { title: 'CNH próxima do vencimento', count: 3, type: 'warning', icon: <Calendar size={16} /> },
    { title: 'Vistorias pendentes', count: 5, type: 'critical', icon: <ClipboardList size={16} /> },
    { title: 'Manutenção preventiva', count: 2, type: 'info', icon: <Wrench size={16} /> },
  ];

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
            { id: 'bi', label: 'Business Inteligence', icon: TrendingUp },
            { id: 'frota', label: 'Frota', icon: Car },
            { id: 'leads', label: 'Leads', icon: Mail },
            { id: 'locacao', label: 'Locação', icon: Key },
            { id: 'investidores', label: 'Investidores', icon: Users },
            { id: 'financeiro', label: 'Financeiro', icon: Wallet },
            { id: 'caucao', label: 'Caução', icon: Landmark },
            { id: 'manutencaoAdmin', label: 'Manutenção', icon: Wrench },
          ].map((item) => (
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
                activeTab === 'manutencaoAdmin' ? 'Histórico de Manutenções' : 'Painel LA'}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-900">Admin Principal</p>
              <p className="text-[10px] text-neutral-400 font-light">Laveiculos@gmail.com</p>
            </div>
            <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#C5A059]/30">
              LA
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          {activeTab === 'bi' && <AdminBI stats={stats} alerts={alerts} />}
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
              setVehicleForm={setVehicleForm}
              setIsEditing={setIsEditing}
              onDeleteVehicle={onDeleteVehicle}
            />
          )}
          {activeTab === 'locacao' && (
            <AdminLocacoes 
              rentals={rentals}
              rentalFilter={rentalFilter}
              setRentalFilter={setRentalFilter}
              setShowAddForm={setShowAddForm}
              resetRentalForm={() => {}} // TODO
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
              payCaucaoInstallment={payCaucaoInstallment}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
