import React from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

// Tabs
import AdminLeads from './tabs/AdminLeads';
import AdminFrota from './tabs/AdminFrota';
import AdminLocacoes from './tabs/AdminLocacoes';
import AdminInvestidores from './tabs/AdminInvestidores';
import AdminFinanceiro from './tabs/AdminFinanceiro';
import AdminCaucao from './tabs/AdminCaucao';
import AdminBI from './tabs/AdminBI';
import AdminManutencao from './tabs/AdminManutencao';
import AdminVistoria from './tabs/AdminVistoria';
import AdminUsuarios from './tabs/AdminUsuarios';
import AdminOficina from './tabs/AdminOficina';
import AdminClientes from './tabs/AdminClientes';
import AdminFaturamento from './tabs/AdminFaturamento';

// Modals
import RentalDetailModal from './modals/RentalDetailModal';
import InspectionDetailModal from './modals/InspectionDetailModal';
import ContractClosureModal from './modals/ContractClosureModal';
import TerminationTermModal from './modals/TerminationTermModal';
import VehicleDetailModal from './modals/VehicleDetailModal';
import AdminSuccessModal from './modals/AdminSuccessModal';
import ImageViewer from '../ui/ImageViewer';

// Forms
import VehicleFormModal from './forms/VehicleFormModal';
import RentalFormModal from './forms/RentalFormModal';
import FinanceFormModal from './forms/FinanceFormModal';

// Layout components
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

// Hooks & Utils
import { AlertTriangle } from 'lucide-react';
import { useAdminState } from '../../hooks/useAdminState';
import { calculateBIStats, getDynamicAlerts } from '../../utils/adminUtils.jsx';

const AdminDashboard = ({
  leads, rentals, clients, investors, vehicles, transactions, onAddTransaction,
  onUpdateStatus, onAddRental, onDeleteRental, onUpdateRental, onUpdateClient,
  onAddInvestor, onUpdateInvestor, onDeleteInvestor,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
  maintenances, onAddMaintenance, onUpdateMaintenance, onDeleteMaintenance,
  inspections, onAddInspection, onDeleteInspection,
  serviceOrders, replacementContracts, onCloseServiceOrder,
  onCompleteClosure, onPayCaucaoInstallment, onConfirmPayment,
  currentUser, systemUsers, onAddSystemUser, onUpdateSystemUser, onDeleteSystemUser,
  onLogout, onSeed, onGoHome, onViewVehicleDetail,
  selectedImage, setSelectedImage
}) => {
  const {
    isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab,
    showAddForm, setShowAddForm, isEditing, setIsEditing,
    isEditingRental, setIsEditingRental, showFinanceForm, setShowFinanceForm,
    showDeleteAuthModal, setShowDeleteAuthModal, itemToDelete, setItemToDelete,
    deleteType, setDeleteType, deletePassword, setDeletePassword,
    showRentalDetailModal, setShowRentalDetailModal, selectedRental, setSelectedRental,
    selectedVehicle, setSelectedVehicle, showInspectionDetailModal, setShowInspectionDetailModal,
    selectedInspection, setSelectedInspection, showVehicleDetailModal, setShowVehicleDetailModal,
    selectedVehicleForDetail, setSelectedVehicleForDetail, showClosureModal, setShowClosureModal,
    showTerminationTerm, setShowTerminationTerm, finalClosureData, setFinalClosureData,
    pendingInspection, setPendingInspection, showAdminSuccess, setShowAdminSuccess,
    currentRentalStep, setCurrentRentalStep, leadSearch, setLeadSearch,
    leadStatusFilter, setLeadStatusFilter, vehicleSearch, setVehicleSearch,
    vehicleStatusFilter, setVehicleStatusFilter, rentalFilter, setRentalFilter,
    financeFilter, setFinanceFilter, investorForm, setInvestorForm,
    vehicleForm, setVehicleForm, financeForm, setFinanceForm,
    rentalForm, setRentalForm, isAdmin, canAccess
  } = useAdminState(currentUser);

  const totalRentalSteps = 4;

  const resetVehicleForm = () => {
    setVehicleForm({
      model: '', plate: '', year: '', renavam: '', initialKm: '', status: 'Disponível',
      fipeValue: '', investor: '', adminTax: '15', investorTax: '85',
      hasProtection: false,
      protectionCompany: '',
      protectionPaymentDay: '10',
      protectionValue: '',
      franchiseInsurance: false, 
      hasSpareKey: false, lastBeltChangeKm: '', beltChangeIntervalKm: '50000', 
      image: '', imageFile: null, imagePreview: null, weeklyRental: '', 
      investmentValue: '', preventiveMaintenance: true,
      entryDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    
    // Sanatiza valores numéricos que podem estar formatados como string (ex: "1.250,00")
    const cleanNumeric = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const clean = val.toString().replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    const vehicleData = {
      ...vehicleForm,
      id: vehicleForm.id || Date.now(),
      weeklyRental: cleanNumeric(vehicleForm.weeklyRental),
      fipeValue: cleanNumeric(vehicleForm.fipeValue),
      investmentValue: cleanNumeric(vehicleForm.investmentValue),
      protectionValue: cleanNumeric(vehicleForm.protectionValue),
      initialKm: parseFloat(vehicleForm.initialKm) || 0,
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
    const cleanNumeric = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const clean = val.toString().replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    onAddTransaction({
      ...financeForm,
      val: cleanNumeric(financeForm.val) * (financeForm.type === 'out' ? -1 : 1),
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
    if (!rentalForm.plate || !rentalForm.user) {
      alert('Por favor, preencha os dados obrigatórios do veículo e condutor.');
      return;
    }

    const cleanNumeric = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      const clean = val.toString().replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    const selectedVehicle = vehicles.find(v => v.plate === rentalForm.plate);
    onAddRental({
      ...rentalForm,
      value: cleanNumeric(rentalForm.value),
      depositTotal: cleanNumeric(rentalForm.depositTotal),
      tireTax: cleanNumeric(rentalForm.tireTax),
      id: Date.now(),
      vehicleId: selectedVehicle ? selectedVehicle.id : rentalForm.vehicleId,
      date: rentalForm.startDate,
      period: `${rentalForm.durationWeeks} semanas`,
      vehicle: selectedVehicle ? selectedVehicle.model : rentalForm.vehicle,
      image: selectedVehicle ? selectedVehicle.image : 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80',
      status: 'Ativo',
      startDate: rentalForm.startDate
    });

    setShowAddForm(false);
    setCurrentRentalStep(1);
    setRentalForm({
      user: '', clientPhone: '', email: '', cnhNumber: '', cnhRegisterNumber: '', birthDate: '', cnhValidity: '',
      vehicle: '', plate: '', vehicleId: '', rentalType: 'weekly', value: '', tireTax: '25',
      durationWeeks: '4', depositTotal: '', depositPaid: '', depositInstallments: '1',
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
      if (deleteType === 'rental') onDeleteRental(itemToDelete.id);
      else if (deleteType === 'vehicle') onDeleteVehicle(itemToDelete.id);
      else if (deleteType === 'investor') onDeleteInvestor(itemToDelete.id);
      
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

  const biData = calculateBIStats(transactions, vehicles, rentals, investors, leads);
  const alerts = getDynamicAlerts(vehicles, maintenances, inspections);

  return (
    <div className="min-h-screen xl:h-screen bg-neutral-50 flex animate-in fade-in duration-500 relative xl:overflow-hidden">
      <AdminSidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={isAdmin} 
        canAccess={canAccess} 
        onGoHome={onGoHome} 
        onLogout={onLogout} 
      />

      <main className={`flex-1 flex flex-col h-screen xl:h-screen overflow-hidden transition-all duration-500 ${isSidebarOpen ? 'xl:ml-64' : 'xl:ml-20'}`}>
        <AdminHeader 
          activeTab={activeTab} 
          currentUser={currentUser} 
          isSidebarOpen={isSidebarOpen} 
          onSeed={onSeed}
          hasData={vehicles.length > 0}
        />

        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          {activeTab === 'bi' && <AdminBI stats={biData.mainStats} alerts={alerts} operationalData={biData.operationalSummary} />}
          {activeTab === 'leads' && (
            <AdminLeads 
              leads={leads} leadSearch={leadSearch} setLeadSearch={setLeadSearch}
              leadStatusFilter={leadStatusFilter} setLeadStatusFilter={setLeadStatusFilter}
              onUpdateStatus={onUpdateStatus} currentUser={currentUser}
            />
          )}
          {activeTab === 'frota' && (
            <AdminFrota 
              vehicles={vehicles} inspections={inspections} vehicleSearch={vehicleSearch} 
              setVehicleSearch={setVehicleSearch} vehicleStatusFilter={vehicleStatusFilter}
              setVehicleStatusFilter={setVehicleStatusFilter} setShowAddForm={setShowAddForm}
              resetVehicleForm={resetVehicleForm} 
              onViewVehicleDetail={(v) => { setSelectedVehicleForDetail(v); setShowVehicleDetailModal(true); }}
              onUpdateVehicle={onUpdateVehicle} setVehicleForm={setVehicleForm}
              setSelectedVehicle={setSelectedVehicle} setIsEditing={setIsEditing}
              onDeleteVehicle={onDeleteVehicle} setItemToDelete={setItemToDelete}
              setDeleteType={setDeleteType} setShowDeleteAuthModal={setShowDeleteAuthModal}
              onGoToVistorias={(data) => { if (data) setPendingInspection(data); setActiveTab('vistoria'); }}
            />
          )}
          {activeTab === 'locacao' && (
            <AdminLocacoes 
              rentals={rentals} inspections={inspections} rentalFilter={rentalFilter}
              setRentalFilter={setRentalFilter} setShowAddForm={setShowAddForm}
              resetRentalForm={() => {
                setCurrentRentalStep(1);
                setRentalForm({
                  user: '', clientPhone: '', email: '', cnhNumber: '', cnhValidity: '',
                  vehicle: '', plate: '', rentalType: 'weekly', value: '', tireTax: '25',
                  durationWeeks: '4', depositTotal: '', depositPaid: '', depositInstallments: '1',
                  startDate: new Date().toISOString().split('T')[0],
                  lateFine: '10', dailyInterest: '1', observations: '',
                  docs: { cnh: null, residence: null, appPrints: [], signedContract: null }
                });
              }}
              setSelectedRental={setSelectedRental} setShowRentalDetailModal={setShowRentalDetailModal}
              setIsEditingRental={setIsEditingRental} setItemToDelete={setItemToDelete}
              setDeleteType={setDeleteType} setShowDeleteAuthModal={setShowDeleteAuthModal}
              onGoToVistorias={(data) => { if (data) setPendingInspection(data); setActiveTab('vistoria'); }}
            />
          )}
          {activeTab === 'clientes' && <AdminClientes clients={clients} onUpdateClient={onUpdateClient} />}
          {activeTab === 'faturamento' && <AdminFaturamento rentals={rentals} replacementContracts={replacementContracts} vehicles={vehicles} onConfirmPayment={onConfirmPayment} />}
          {activeTab === 'investidores' && (
            <AdminInvestidores 
              investors={investors} investorForm={investorForm} setInvestorForm={setInvestorForm}
              isEditing={isEditing} setIsEditing={setIsEditing} onAddInvestor={onAddInvestor}
              onUpdateInvestor={onUpdateInvestor} onDeleteInvestor={onDeleteInvestor}
              setShowAdminSuccess={setShowAdminSuccess}
            />
          )}
          {activeTab === 'financeiro' && (
            <AdminFinanceiro 
              transactions={transactions} financeFilter={financeFilter} setFinanceFilter={setFinanceFilter}
              showFinanceForm={showFinanceForm} setShowFinanceForm={setShowFinanceForm}
              financeForm={financeForm} setFinanceForm={setFinanceForm}
              handleSaveTransaction={handleSaveTransaction} vehicles={vehicles}
            />
          )}
          {activeTab === 'caucao' && <AdminCaucao rentals={rentals} payCaucaoInstallment={onPayCaucaoInstallment} />}
          {activeTab === 'manutencaoAdmin' && (
            <AdminManutencao 
              vehicles={vehicles} maintenances={maintenances}
              onAddMaintenance={isAdmin ? onAddMaintenance : undefined}
              onUpdateMaintenance={isAdmin ? onUpdateMaintenance : undefined}
              onDeleteMaintenance={isAdmin ? onDeleteMaintenance : undefined}
              setShowAdminSuccess={setShowAdminSuccess} isReadOnly={!isAdmin}
            />
          )}
          {activeTab === 'vistoria' && (
            <AdminVistoria 
              inspections={inspections} vehicles={vehicles} rentals={rentals} 
              onAddInspection={async (ins) => {
                await onAddInspection(ins);
                setShowAdminSuccess({
                  show: true,
                  title: 'Vistoria Registrada',
                  message: `O dossiê de ${ins.type} do veículo ${ins.vehiclePlate} foi salvo com sucesso no banco de dados.`
                });
              }}
              onDeleteInspection={isAdmin ? onDeleteInspection : undefined}
              onViewDetail={(ins) => { setSelectedInspection(ins); setShowInspectionDetailModal(true); }}
              pendingInspection={pendingInspection} onClearPendingInspection={() => setPendingInspection(null)}
              isReadOnly={!isAdmin}
            />
          )}
          {activeTab === 'usuarios' && isAdmin && (
            <AdminUsuarios 
              systemUsers={systemUsers} onAddUser={onAddSystemUser}
              onUpdateUser={onUpdateSystemUser} onDeleteUser={onDeleteSystemUser}
            />
          )}
          {activeTab === 'oficina' && (
            <AdminOficina
              vehicles={vehicles} investors={investors} rentals={rentals}
              serviceOrders={serviceOrders} replacementContracts={replacementContracts}
              onAddMaintenance={onAddMaintenance} onCloseServiceOrder={onCloseServiceOrder}
            />
          )}
        </div>
      </main>

      <VehicleFormModal 
        isOpen={showAddForm && activeTab === 'frota'} onClose={() => setShowAddForm(false)}
        isEditing={isEditing} vehicleForm={vehicleForm} setVehicleForm={setVehicleForm}
        investors={investors} onSubmit={handleSaveVehicle}
      />

      <RentalFormModal 
        isOpen={showAddForm && activeTab === 'locacao'} onClose={() => setShowAddForm(false)}
        currentRentalStep={currentRentalStep} setCurrentRentalStep={setCurrentRentalStep}
        totalRentalSteps={totalRentalSteps} rentalForm={rentalForm} setRentalForm={setRentalForm}
        vehicles={vehicles} onSubmit={handleSaveRental}
      />

      <FinanceFormModal 
        isOpen={showFinanceForm} onClose={() => setShowFinanceForm(false)}
        financeForm={financeForm} setFinanceForm={setFinanceForm}
        vehicles={vehicles} onSubmit={handleSaveTransaction}
      />

      {/* Delete Auth Modal */}
      {showDeleteAuthModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={() => setShowDeleteAuthModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-neutral-900 mb-2">Ação Restrita</h3>
            <p className="text-neutral-500 text-xs font-light mb-8">Esta operação requer a Senha Master para confirmar a exclusão permanente.</p>
            <input 
              type="password" 
              autoFocus
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="w-full bg-neutral-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-bold text-center mb-6"
              placeholder="••••••••"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteAuthModal(false)} className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black text-neutral-400 hover:text-neutral-600 transition-colors">Cancelar</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-4 bg-red-500 text-white text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRentalDetailModal && (
        <RentalDetailModal 
          rental={selectedRental} 
          isOpen={showRentalDetailModal} 
          onClose={() => setShowRentalDetailModal(false)} 
          onUpdate={async (data) => {
            const result = await onUpdateRental(data);
            if (result?.success) {
              setShowAdminSuccess({
                show: true,
                title: 'Contrato Anexado',
                message: 'O contrato assinado foi enviado e vinculado \u00e0 loca\u00e7\u00e3o com sucesso.'
              });
            }
          }} 
          onPayCaucao={onPayCaucaoInstallment} 
          setSelectedImage={setSelectedImage}
          inspections={inspections}
          onGoToVistorias={(data) => {
            if (data) setPendingInspection(data);
            setActiveTab('vistoria');
            setShowRentalDetailModal(false);
          }}
        />
      )}
      {showInspectionDetailModal && <InspectionDetailModal inspection={selectedInspection} isOpen={showInspectionDetailModal} onClose={() => setShowInspectionDetailModal(false)} />}
      {showVehicleDetailModal && (
        <VehicleDetailModal 
          vehicle={selectedVehicleForDetail} 
          inspections={inspections}
          maintenances={maintenances}
          rentals={rentals}
          isOpen={showVehicleDetailModal} 
          onClose={() => setShowVehicleDetailModal(false)} 
        />
      )}
      {showAdminSuccess.show && <AdminSuccessModal data={showAdminSuccess} onClose={() => setShowAdminSuccess({ ...showAdminSuccess, show: false })} />}
      <ImageViewer image={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
};

export default AdminDashboard;
