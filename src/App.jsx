import React, { useState, useEffect, useRef } from 'react';
import AdminLogin from './components/auth/AdminLogin';
import InvestorLogin from './components/auth/InvestorLogin';
import InvestorDashboard from './components/investor/InvestorDashboard';
import RentalDetailModal from './components/admin/modals/RentalDetailModal';
import RentalSuccessModal from './components/admin/modals/RentalSuccessModal';
import { EditorialLabel } from './components/ui/EditorialLabel';
import { RevealSection } from './components/ui/RevealSection';
import { DashboardBI } from './components/admin/DashboardBI';
import { useScrollReveal } from './hooks/useScrollReveal';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowDown, ArrowDownLeft, ArrowUpRight, Instagram, Facebook, MapPin, Phone, Mail, Menu, X, ShieldCheck, Car, Star, Wrench, TrendingUp, Wallet, AlertTriangle, Calendar, ClipboardList, Plus, Camera, Search, Tag, Key, FileText, User, Users, Landmark, CreditCard, Eye, Pencil, Trash2, Check, Download, FileCheck, Power, PowerOff, Clock } from 'lucide-react';
import AdminDashboard from './components/admin/AdminDashboard';
import FleetPage from './components/fleet/FleetPage';

const App = () => {
  const [view, setView] = useState('home');
  const [leads, setLeads] = useState([
    {
      id: 1,
      name: 'João Silva',
      contact: '(79) 99999-0000',
      type: 'locacao',
      vehicleModel: 'Porsche 911 Carrera',
      vehiclePlate: 'LA-9110',
      vehicleImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80',
      status: 'novo',
      date: '09/05/2026',
      message: 'Tenho interesse em alugar para o próximo final de semana.'
    }
  ]);
  const [rentals, setRentals] = useState([]);
  const [investors, setInvestors] = useState([
    {
      id: 1,
      name: 'Ricardo Santana',
      email: 'ricardo@email.com',
      phone: '(79) 99999-0001',
      cpf: '123.456.789-00',
      address: 'Rua das Palmeiras, 123 - Jardins, Aracaju/SE',
      bank: 'Nubank / 0001 / 12345-6',
      pix: 'ricardo@email.com',
      password: 'invest123',
      adminTax: '15',
      status: 'Ativo'
    },
    {
      id: 2,
      name: 'Guilherme Pereira',
      email: 'guilherme@email.com',
      phone: '(79) 99999-0002',
      cpf: '987.654.321-00',
      address: 'Av. Beira Mar, 456 - Centro, Aracaju/SE',
      bank: 'Itaú / 0341 / 98765-4',
      pix: '987.654.321-00',
      password: 'invest456',
      adminTax: '12',
      status: 'Ativo'
    }
  ]);
  const [vehicles, setVehicles] = useState([
    {
      id: 1, model: 'Porsche 911 Carrera', plate: 'LA-9110', year: '2023/2023', renavam: '12345678901',
      initialKm: '5000', km: '15000', fipeValue: '850000', investor: 'Ricardo Santana', adminTax: '15',
      protectionPaidByAdmin: true, protectionValue: '120', franchiseInsurance: true, hasSpareKey: true,
      lastBeltChangeKm: '10000', beltChangeIntervalKm: '80000', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80', dividend: '3500',
      weeklyRental: '2500', investmentValue: '850000', preventiveMaintenance: true, status: 'Alugado',
      entryDate: '2024-01-15', crlvFile: null, isFavorite: true
    },
    {
      id: 2, model: 'Audi RS6 Avant', plate: 'LA-0066', year: '2022/2023', renavam: '98765432100',
      initialKm: '12000', km: '28000', fipeValue: '720000', investor: 'Guilherme Pereira', adminTax: '12',
      protectionPaidByAdmin: false, protectionValue: '150', franchiseInsurance: true, hasSpareKey: false,
      lastBeltChangeKm: '20000', beltChangeIntervalKm: '60000', image: 'https://images.unsplash.com/photo-1600712242805-5f5666b0b4e9?auto=format&fit=crop&q=80', dividend: '4200',
      weeklyRental: '2000', investmentValue: '720000', preventiveMaintenance: false, status: 'Disponível',
      entryDate: '2024-03-10', crlvFile: null, isFavorite: true
    }
  ]);
  const [transactions, setTransactions] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedVehicleForInterest, setSelectedVehicleForInterest] = useState(null);
  const [interestForm, setInterestForm] = useState({ name: '', phone: '', email: '', observation: '' });

  const handleAddSystemUser = (user) => setSystemUsers(prev => [...prev, user]);
  const handleUpdateSystemUser = (updated) => setSystemUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  const handleDeleteSystemUser = (id) => setSystemUsers(prev => prev.filter(u => u.id !== id));

  const handleAddLead = (lead) => {
    setLeads(prev => [{ ...lead, id: Date.now(), status: 'novo', date: new Date().toLocaleDateString('pt-BR') }, ...prev]);
  };

  const handleUpdateLeadStatus = (id, status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const handleAddRental = (rental) => {
    setRentals(prev => [{ ...rental, id: Date.now() }, ...prev]);
    setVehicles(prev => prev.map(v => v.id === rental.vehicleId ? { ...v, status: 'Alugado' } : v));
  };

  const handleDeleteRental = (id) => {
    const rental = rentals.find(r => r.id === id);
    if (rental) {
      setVehicles(prev => prev.map(v => v.id === rental.vehicleId ? { ...v, status: 'Disponível' } : v));
    }
    setRentals(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRental = (updatedRental) => {
    setRentals(prev => prev.map(r => r.id === updatedRental.id ? updatedRental : r));
  };

  const handleAddInvestor = (investor) => {
    setInvestors(prev => [{ ...investor, id: Date.now() }, ...prev]);
  };

  const handleUpdateInvestor = (updatedInvestor) => {
    setInvestors(prev => prev.map(i => i.id === updatedInvestor.id ? updatedInvestor : i));
  };

  const handleDeleteInvestor = (id) => {
    setInvestors(prev => prev.filter(i => i.id !== id));
  };

  const handleAddVehicle = (vehicle) => {
    setVehicles(prev => [{ ...vehicle, id: Date.now(), status: 'Disponível', km: vehicle.initialKm || '0' }, ...prev]);
  };

  const handleUpdateVehicle = (updatedVehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  };

  const handleDeleteVehicle = (id) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const handleAddTransaction = (transaction) => {
    setTransactions(prev => [{ ...transaction, id: Date.now() }, ...prev]);
  };

  const handleAddMaintenance = (maintenance) => {
    setMaintenances(prev => [{ ...maintenance, id: Date.now() }, ...prev]);
  };

  const handleUpdateMaintenance = (updatedMaintenance) => {
    setMaintenances(prev => prev.map(m => m.id === updatedMaintenance.id ? updatedMaintenance : m));
  };

  const handleDeleteMaintenance = (id) => {
    setMaintenances(prev => prev.filter(m => m.id !== id));
  };
  const handleCompleteClosure = (rentalId, closureData) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    // 1. Update Rental Status
    setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, status: 'Encerrado', endDate: new Date().toLocaleDateString('pt-BR') } : r));
    
    // 2. Update Vehicle Status
    setVehicles(prev => prev.map(v => v.id === rental.vehicleId ? { ...v, status: 'Disponível' } : v));

    // 3. Register Financial Transaction
    handleAddTransaction({
      date: new Date().toISOString().split('T')[0],
      type: closureData.type === 'return' ? 'out' : 'in',
      val: closureData.balance,
      desc: `Liquidação de Caução - Contrato ${rental.plate} - ${rental.user}`,
      cat: closureData.type === 'return' ? 'Caução a devolver' : 'Boleto Avulso',
      vehiclePlate: rental.plate,
      responsible: 'Administradora'
    });
  };

  const handlePayCaucaoInstallment = (rentalId, installmentNumber, value) => {
    setRentals(prev => prev.map(r => {
      if (r.id === rentalId) {
        const paidInstallments = [...(r.paidInstallments || []), installmentNumber];
        const depositReceived = (parseFloat(String(r.depositReceived || 0).replace(/\./g, '').replace(',', '.')) || 0) + value;
        
        // Format back to string if needed, or keep as number
        return { 
          ...r, 
          paidInstallments, 
          depositReceived: depositReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        };
      }
      return r;
    }));

    // Add to financeiro
    const rental = rentals.find(r => r.id === rentalId);
    handleAddTransaction({
      date: new Date().toISOString().split('T')[0],
      type: 'in',
      val: value,
      desc: `Caução - Parcela ${installmentNumber} - ${rental?.user}`,
      cat: 'Caução',
      vehiclePlate: rental?.plate,
      responsible: 'Administradora'
    });
  };

  const handleAddInspection = (inspection) => {
    setInspections(prev => [{ ...inspection, id: Date.now() }, ...prev]);
  };

  const handleDeleteInspection = (id) => {
    setInspections(prev => prev.filter(ins => ins.id !== id));
  };

  const handleCloseServiceOrder = (os, mode) => {
    if (mode === 'open') {
      setServiceOrders(prev => [{ ...os, status: 'Aberta' }, ...prev]);
      return;
    }
    // Close OS
    setServiceOrders(prev => prev.map(o => o.id === os.id ? { ...o, status: 'Concluída', closedAt: new Date().toISOString() } : o));
    // 1. Log maintenance history
    handleAddMaintenance({
      vehiclePlate: os.plate,
      vehicleModel: os.model,
      date: os.date,
      serviceType: os.description,
      value: os.total,
      provider: os.provider,
      currentKm: os.km,
      responsible: os.responsible,
      observations: `O.S. #${os.id?.toString().slice(-6)} — Fechada via Oficina`,
    });
    // 2. Log financial transaction
    handleAddTransaction({
      date: new Date().toISOString().split('T')[0],
      type: 'out',
      val: os.total,
      desc: `O.S. Oficina — ${os.model} (${os.plate}) — ${os.description.slice(0, 40)}`,
      cat: 'Manutenção',
      vehiclePlate: os.plate,
      responsible: os.responsible,
      sourceOS: os.id,
    });
  };

  if (view === 'admin') {
    return (
      <AdminDashboard
        leads={leads}
        rentals={rentals}
        investors={investors}
        vehicles={vehicles}
        transactions={transactions}
        maintenances={maintenances}
        inspections={inspections}
        onAddInspection={handleAddInspection}
        onDeleteInspection={handleDeleteInspection}
        serviceOrders={serviceOrders}
        onCloseServiceOrder={handleCloseServiceOrder}
        onCompleteClosure={handleCompleteClosure}
        onPayCaucaoInstallment={handlePayCaucaoInstallment}
        onAddTransaction={handleAddTransaction}
        onUpdateStatus={handleUpdateLeadStatus}
        onAddRental={handleAddRental}
        onDeleteRental={handleDeleteRental}
        onUpdateRental={handleUpdateRental}
        onAddInvestor={handleAddInvestor}
        onUpdateInvestor={handleUpdateInvestor}
        onDeleteInvestor={handleDeleteInvestor}
        onAddVehicle={handleAddVehicle}
        onUpdateVehicle={handleUpdateVehicle}
        onDeleteVehicle={handleDeleteVehicle}
        onAddMaintenance={handleAddMaintenance}
        onUpdateMaintenance={handleUpdateMaintenance}
        onDeleteMaintenance={handleDeleteMaintenance}
        currentUser={currentUser}
        systemUsers={systemUsers}
        onAddSystemUser={handleAddSystemUser}
        onUpdateSystemUser={handleUpdateSystemUser}
        onDeleteSystemUser={handleDeleteSystemUser}
        onLogout={() => {
          localStorage.removeItem('la_admin_auth');
          setCurrentUser(null);
          setView('home');
        }}
        onGoHome={() => setView('home')}
        onViewVehicleDetail={(v) => setView('vehicle-' + v.id)}
      />
    );
  }

  if (view === 'investor') {
    return (
      <InvestorDashboard
        transactions={transactions}
        onLogout={() => setView('home')}
      />
    );
  }


  if (view === 'admin-login') {
    return (
      <AdminLogin
        onBack={() => setView('home')}
        systemUsers={systemUsers}
        onLoginSuccess={(user) => {
          localStorage.setItem('la_admin_auth', 'true');
          setCurrentUser(user || { role: 'administrador', modules: null });
          setView('admin');
        }}
      />
    );
  }

  if (view === 'investor-login') {
    return (
      <InvestorLogin
        onBack={() => setView('home')}
        onLoginSuccess={() => setView('investor')}
      />
    );
  }


  // Landing Page
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {selectedImage && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-full object-contain rounded-2xl" alt="Visualização" />
          <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all" onClick={() => setSelectedImage(null)}>
            <X size={24} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => setView('home')}>
            <span className="text-2xl font-black uppercase tracking-tighter text-neutral-900">LA</span>
            <span className="text-2xl font-black uppercase tracking-tighter text-[#C5A059] ml-1">Locação</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            {['Frota', 'Serviços', 'Investidores', 'Contato'].map(item => (
              <button 
                key={item} 
                onClick={() => {
                  if (item === 'Frota') {
                    setView('fleet');
                    window.scrollTo(0, 0);
                  } else {
                    setView('home');
                    setTimeout(() => {
                      document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }
                }}
                className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView('admin-login')} className="text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-900 transition-colors hidden md:block">
              Admin
            </button>
            <button
              onClick={() => setView('investor-login')}
              className="px-6 py-3 bg-neutral-950 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-[#C5A059] transition-all shadow-lg"
            >
              Portal Investidor
            </button>
          </div>
        </div>
      </nav>

      {view === 'home' ? (
        <>
          {/* Hero */}
          <section className="min-h-screen relative overflow-hidden flex items-center justify-center pt-20">
            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/hero-bg-new.png')" }}
            />
            {/* Dark overlays for text readability */}
            <div className="absolute inset-0 bg-neutral-950/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-neutral-950/50" />

            {/* Content — fully centered */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 py-28 flex flex-col items-center text-center">
              {/* Label */}
              <div className="inline-flex items-center gap-3 mb-8">
                <div className="w-8 h-[1px] bg-[#C5A059]" />
                <span className="text-[#C5A059] text-[10px] uppercase tracking-[0.4em] font-black">Locação Profissional de Veículos</span>
                <div className="w-8 h-[1px] bg-[#C5A059]" />
              </div>

              {/* Main title */}
              <h1 className="font-black uppercase tracking-tighter leading-none mb-6">
                <span className="block text-7xl md:text-[9rem] lg:text-[11rem] text-white drop-shadow-2xl">LA</span>
                <span className="block text-7xl md:text-[9rem] lg:text-[11rem] text-[#C5A059] drop-shadow-2xl" style={{ textShadow: '0 0 80px rgba(197,160,89,0.3)' }}>LOCAÇÃO</span>
              </h1>

              {/* Divider */}
              <div className="w-24 h-[2px] bg-[#C5A059]/40 mb-8" />

              {/* Description */}
              <p className="text-neutral-300 font-light text-base md:text-lg max-w-xl mb-12 leading-relaxed">
                Plataforma premium de gestão de frota e locação de veículos em Aracaju.
                <span className="text-[#C5A059] font-semibold"> Conduza seus sonhos com excelência.</span>
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <a
                  href="#contato"
                  className="px-10 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white transition-all shadow-2xl shadow-[#C5A059]/30 min-w-[180px] text-center"
                >
                  Alugar Agora
                </a>
                <button
                  onClick={() => {
                    setView('fleet');
                    window.scrollTo(0, 0);
                  }}
                  className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white/20 transition-all border border-white/20 min-w-[180px] text-center"
                >
                  Ver Frota
                </button>
              </div>

              {/* Scroll hint */}
              <div className="mt-20 flex flex-col items-center gap-2 animate-bounce opacity-50">
                <span className="text-[8px] uppercase tracking-[0.3em] text-white font-bold">Explorar</span>
                <ChevronDown size={16} className="text-[#C5A059]" />
              </div>
            </div>
          </section>

      {/* Frota */}
      <section id="frota" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-20">
            <EditorialLabel className="text-[#C5A059] mb-4">Nossa Frota</EditorialLabel>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neutral-900 mb-6">
              Veículos<br/>Exclusivos
            </h2>
            <p className="text-neutral-500 font-light max-w-xl text-lg">
              Conheça nossa seleção de veículos premium em destaque na nossa frota.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {vehicles.filter(v => v.isFavorite).length === 0 && (
              <div className="col-span-3 text-center py-24 bg-neutral-50 rounded-[3rem] border border-neutral-100">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Nenhum veículo em destaque no momento</p>
              </div>
            )}
            {vehicles.filter(v => v.isFavorite).map(car => (
              <div key={car.id} className="group relative bg-neutral-50 rounded-[3rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                  <img 
                    src={car.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={car.model}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {car.status === 'Alugado' && (
                    <div className="absolute top-6 right-6 bg-neutral-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/20">
                      Locado
                    </div>
                  )}
                </div>
                <div className="p-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-black mb-2">{car.year}</p>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-neutral-900">{car.model}</h3>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-200 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Valor Semanal</p>
                        <p className="text-xl font-black text-neutral-900">R$ {car.weeklyRental || '550,00'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedVehicleForInterest(car);
                        setShowInterestModal(true);
                      }}
                      disabled={car.status === 'Alugado'}
                      className={`w-full py-4 text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl transition-all ${
                        car.status === 'Alugado' 
                        ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed' 
                        : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-900 hover:text-white'
                      }`}
                    >
                      {car.status === 'Alugado' ? 'Indisponível' : 'Tenho Interesse'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 flex justify-center">
            <button 
              onClick={() => {
                setView('fleet');
                window.scrollTo(0, 0);
              }}
              className="group relative px-12 py-5 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.4em] font-black rounded-full hover:bg-[#C5A059] transition-all shadow-2xl flex items-center gap-4"
            >
              Ver toda a frota
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-black/20 transition-all">
                <ChevronRight size={14} />
              </div>
            </button>
          </div>
        </div>
      </section>


      {/* Investidores */}
      <section id="investidores" className="py-32 bg-neutral-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950/90 to-neutral-950" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1">
            <EditorialLabel className="text-[#C5A059] mb-4">Seja um Parceiro</EditorialLabel>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-8">
              Programa de<br/><span className="text-[#C5A059]">Investidores</span>
            </h2>
            <p className="text-neutral-400 font-light text-lg mb-10 leading-relaxed max-w-xl">
              Rentabilize seu patrimônio com segurança. Coloque seu veículo na nossa frota e receba dividendos semanais enquanto nós cuidamos de toda a gestão, manutenção e locação.
            </p>
            <ul className="space-y-6 mb-12">
              {[
                'Gestão 100% profissional e transparente',
                'Rendimentos pagos pontualmente toda semana',
                'Seguro total e rastreamento veicular',
                'Portal exclusivo para acompanhar resultados'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 text-white font-bold text-sm">
                  <div className="w-8 h-8 rounded-full bg-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                    <Check size={16} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contato" className="inline-flex px-10 py-5 bg-[#C5A059] text-neutral-950 text-[10px] uppercase tracking-[0.3em] font-black rounded-full hover:bg-white transition-all shadow-2xl shadow-[#C5A059]/20">
              Quero ser Investidor
            </a>
          </div>
          <div className="flex-1 w-full relative">
            <div className="aspect-[4/5] bg-neutral-900 rounded-[3rem] overflow-hidden relative border border-white/10 shadow-2xl">
               <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80" alt="Investimentos" className="w-full h-full object-cover opacity-80" />
               <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
               <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                 <p className="text-[#C5A059] text-[10px] uppercase tracking-[0.3em] font-black mb-2">Transparência Total</p>
                 <p className="text-white font-bold text-lg">Acompanhe seus rendimentos em tempo real através do Portal do Investidor.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-32 bg-neutral-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-20">
          <EditorialLabel className="text-[#C5A059] mb-4">O que oferecemos</EditorialLabel>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-neutral-900 mb-6">
            Nossos Serviços
          </h2>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Car size={32}/>, title: "Locação Premium", desc: "Veículos de alto padrão revisados e higienizados para uma experiência impecável." },
            { icon: <ShieldCheck size={32}/>, title: "Proteção Total", desc: "Seguro completo e assistência 24h para você rodar com total tranquilidade." },
            { icon: <Wrench size={32}/>, title: "Manutenção em Dia", desc: "Oficinas especializadas cuidando de cada detalhe preventivo da nossa frota." }
          ].map((srv, i) => (
            <div key={i} className="bg-white p-12 rounded-[3rem] shadow-xl shadow-neutral-200/50 hover:-translate-y-2 transition-transform duration-500 border border-neutral-100">
              <div className="w-16 h-16 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center text-[#C5A059] mb-8">
                {srv.icon}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-neutral-900 mb-4">{srv.title}</h3>
              <p className="text-neutral-500 font-light leading-relaxed">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-32 bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <div className="w-24 h-24 bg-[#C5A059] rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-[#C5A059]/30">
            <Phone size={40} className="text-neutral-950" />
          </div>
          <EditorialLabel className="text-[#C5A059] mb-4">Entre em Contato</EditorialLabel>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-6">Fale Conosco</h2>
          <p className="text-neutral-400 font-light mb-12 text-xl">Pronto para acelerar? Entre em contato e reserve seu veículo ou agende uma reunião para conhecer o modelo de investimento.</p>
          <a
            href="https://wa.me/5579999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 px-12 py-6 bg-[#C5A059] text-neutral-950 text-[12px] uppercase tracking-[0.4em] font-black rounded-full hover:bg-white transition-all shadow-2xl shadow-[#C5A059]/30"
          >
            <Phone size={20} /> Whatsapp LA Locação
          </a>
        </div>
      </section>

      <footer className="bg-neutral-950 border-t border-neutral-900 py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="text-2xl font-black uppercase tracking-tighter text-white">LA</span>
            <span className="text-2xl font-black uppercase tracking-tighter text-[#C5A059] ml-1">Locação</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">© 2026 LA Locação de Veículos. Aracaju, Sergipe.</p>
          <div className="flex gap-4">
            <a href="#" className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:bg-[#C5A059] hover:text-neutral-950 transition-colors">
              <Instagram size={20} />
            </a>
            <a href="#" className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:bg-[#C5A059] hover:text-neutral-950 transition-colors">
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </footer>
        </>
      ) : view === 'fleet' ? (
        <FleetPage 
          vehicles={vehicles}
          onBack={() => setView('home')}
          onInterest={(car) => {
            setSelectedVehicleForInterest(car);
            setShowInterestModal(true);
          }}
        />
      ) : null}
      {/* Interest Lead Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setShowInterestModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 md:p-12 shadow-2xl animate-in zoom-in duration-300">
            <button 
              onClick={() => setShowInterestModal(false)}
              className="absolute top-8 right-8 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X size={24} />
            </button>
            
            <EditorialLabel className="text-[#C5A059] mb-4">Tenho Interesse</EditorialLabel>
            <h3 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mb-2">
              {selectedVehicleForInterest?.model}
            </h3>
            <p className="text-neutral-500 font-light mb-10">
              Preencha seus dados abaixo e nossa equipe entrará em contato em breve.
            </p>

            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              handleAddLead({
                name: interestForm.name,
                contact: interestForm.phone,
                email: interestForm.email,
                type: 'locacao',
                vehicleModel: selectedVehicleForInterest?.model,
                vehiclePlate: selectedVehicleForInterest?.plate,
                vehicleImage: selectedVehicleForInterest?.image,
                message: `Obs: ${interestForm.observation || 'Sem observações'}`
              });
              setShowInterestModal(false);
              setInterestForm({ name: '', phone: '', email: '', observation: '' });
              setShowSuccessPopup(true);
            }}>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Seu Nome</label>
                <input 
                  type="text" 
                  required
                  value={interestForm.name}
                  onChange={e => setInterestForm({...interestForm, name: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Seu Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  required
                  value={interestForm.phone}
                  onChange={e => setInterestForm({...interestForm, phone: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                  placeholder="(79) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Seu E-mail</label>
                <input 
                  type="email" 
                  required
                  value={interestForm.email}
                  onChange={e => setInterestForm({...interestForm, email: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                  placeholder="exemplo@email.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black ml-1">Observação (Opcional)</label>
                <textarea 
                  value={interestForm.observation}
                  onChange={e => setInterestForm({...interestForm, observation: e.target.value})}
                  className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-light text-sm resize-none"
                  rows="3"
                  placeholder="Alguma dúvida ou horário de preferência?"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl mt-4"
              >
                Enviar Interesse
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setShowSuccessPopup(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <Check size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 mb-4">Sucesso!</h3>
            <p className="text-neutral-500 font-light mb-10 leading-relaxed">
              Sua solicitação foi enviada com sucesso. Nossa equipe entrará em contato em breve.
            </p>
            <button 
              onClick={() => setShowSuccessPopup(false)}
              className="w-full py-4 bg-neutral-900 text-white text-[10px] uppercase tracking-[0.3em] font-black rounded-2xl hover:bg-[#C5A059] transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
