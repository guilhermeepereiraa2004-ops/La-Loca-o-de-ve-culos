import React from 'react';

// Components
import AdminLogin from './components/auth/AdminLogin';
import InvestorLogin from './components/auth/InvestorLogin';
import InvestorDashboard from './components/investor/InvestorDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import FleetPage from './components/fleet/FleetPage';
import LandingPage from './components/layout/LandingPage';
import Navbar from './components/layout/Navbar';
import InterestModal from './components/ui/modals/InterestModal';
import SuccessModal from './components/ui/modals/SuccessModal';
import ImageViewer from './components/ui/ImageViewer';


// Hooks
import { useAppState } from './hooks/useAppState';

const App = () => {
  const {
    view, setView,
    leads, rentals, investors, vehicles, transactions, maintenances,
    inspections, serviceOrders, systemUsers, clients, replacementContracts,
    currentUser, setCurrentUser, selectedImage, setSelectedImage, logs, isLogsDbConnected,
    fines, isFinesDbConnected,
    showInterestModal, setShowInterestModal, showSuccessPopup, setShowSuccessPopup,
    selectedVehicleForInterest, setSelectedVehicleForInterest,
    interestForm, setInterestForm,
    seedData,
    handleAddSystemUser, handleUpdateSystemUser, handleDeleteSystemUser,
    handleUpdateLeadStatus, handleDeleteLead, handleAddRental, handleDeleteRental,
    handleUpdateRental, handleRenewRental, handleAddClient, handleUpdateClient, handleDeleteClient, handleAddInvestor, handleUpdateInvestor, handleDeleteInvestor,
    handleAddVehicle, handleUpdateVehicle, handleDeleteVehicle, handleAddTransaction, handleUpdateTransactionStatus,
    handleAddMaintenance, handleUpdateMaintenance, handleDeleteMaintenance,
    handleCompleteClosure, handlePayCaucaoInstallment, handleConfirmPayment,
    handleAddInspection, handleDeleteInspection, handleCloseServiceOrder, handleUpdateServiceOrder, handleDeleteServiceOrder,
    handleInterestSubmit,
    handleAddFine, handleUpdateFine, handleDeleteFine
  } = useAppState();





  // Admin View
  if (view === 'admin') {
    return (
      <AdminDashboard
        leads={leads}
        rentals={rentals}
        clients={clients}
        investors={investors}
        vehicles={vehicles}
        transactions={transactions}
        maintenances={maintenances}
        inspections={inspections}
        onAddInspection={handleAddInspection}
        onDeleteInspection={handleDeleteInspection}
        serviceOrders={serviceOrders}
        replacementContracts={replacementContracts}
        onCloseServiceOrder={handleCloseServiceOrder}
        onUpdateServiceOrder={handleUpdateServiceOrder}
        onDeleteServiceOrder={handleDeleteServiceOrder}
        onCompleteClosure={handleCompleteClosure}
        onPayCaucaoInstallment={handlePayCaucaoInstallment}
        onAddTransaction={handleAddTransaction}
        onUpdateTransactionStatus={handleUpdateTransactionStatus}
        onUpdateStatus={handleUpdateLeadStatus}
        onDeleteLead={handleDeleteLead}
        onAddRental={handleAddRental}
        onDeleteRental={handleDeleteRental}
        onUpdateRental={handleUpdateRental}
        onRenewRental={handleRenewRental}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onDeleteClient={handleDeleteClient}
        onAddInvestor={handleAddInvestor}
        onUpdateInvestor={handleUpdateInvestor}
        onDeleteInvestor={handleDeleteInvestor}
        onAddVehicle={handleAddVehicle}
        onUpdateVehicle={handleUpdateVehicle}
        onDeleteVehicle={handleDeleteVehicle}
        onAddMaintenance={handleAddMaintenance}
        onUpdateMaintenance={handleUpdateMaintenance}
        onDeleteMaintenance={handleDeleteMaintenance}
        onConfirmPayment={handleConfirmPayment}
        currentUser={currentUser}
        systemUsers={systemUsers}
        logs={logs}
        isLogsDbConnected={isLogsDbConnected}
        fines={fines}
        isFinesDbConnected={isFinesDbConnected}
        onAddFine={handleAddFine}
        onUpdateFine={handleUpdateFine}
        onDeleteFine={handleDeleteFine}
        onAddSystemUser={handleAddSystemUser}
        onUpdateSystemUser={handleUpdateSystemUser}
        onDeleteSystemUser={handleDeleteSystemUser}
        onLogout={() => {
          localStorage.removeItem('la_admin_auth');
          localStorage.removeItem('la_admin_user');
          localStorage.removeItem('la_current_view');
          localStorage.removeItem('la_admin_active_tab');
          setCurrentUser(null);
          setView('home');
        }}
        onSeed={seedData}
        onGoHome={() => setView('home')}
        onViewVehicleDetail={(v) => setView('vehicle-' + v.id)}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
      />
    );
  }

  // Investor View
  if (view === 'investor') {
    return (
      <InvestorDashboard
        investor={currentUser}
        transactions={transactions}
        vehicles={vehicles}
        serviceOrders={serviceOrders}
        rentals={rentals}
        onLogout={() => {
          localStorage.removeItem('la_investor_auth');
          localStorage.removeItem('la_current_view');
          localStorage.removeItem('la_investor_active_tab');
          setCurrentUser(null);
          setView('home');
        }}
        onGoHome={() => setView('home')}
      />
    );
  }

  // Auth Views
  if (view === 'admin-login') {
    return (
      <AdminLogin
        onBack={() => setView('home')}
        systemUsers={systemUsers}
        onLoginSuccess={(user) => {
          const adminUser = user || { role: 'administrador', name: 'Admin Master', email: 'Laveiculos@gmail.com', modules: null };
          localStorage.setItem('la_admin_auth', 'true');
          localStorage.setItem('la_admin_user', JSON.stringify(adminUser));
          setCurrentUser(adminUser);
          setView('admin');
        }}
      />
    );
  }

  if (view === 'investor-login') {
    return (
      <InvestorLogin
        onBack={() => setView('home')}
        investors={investors}
        onLoginSuccess={(investorObj) => {
          localStorage.setItem('la_investor_auth', JSON.stringify(investorObj));
          setCurrentUser(investorObj);
          setView('investor');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      <ImageViewer image={selectedImage} onClose={() => setSelectedImage(null)} />
      
      <Navbar onSetView={setView} />

      {view === 'home' ? (
        <LandingPage 
          vehicles={vehicles} 
          onSetView={setView} 
          onInterest={(car) => {
            setSelectedVehicleForInterest(car);
            setShowInterestModal(true);
          }} 
        />
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

      <InterestModal 
        isOpen={showInterestModal}
        onClose={() => setShowInterestModal(false)}
        selectedVehicle={selectedVehicleForInterest}
        interestForm={interestForm}
        setInterestForm={setInterestForm}
        onSubmit={handleInterestSubmit}
      />

      <SuccessModal 
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
      />

      {/* Botão de WhatsApp Flutuante */}
      {(view === 'home' || view === 'fleet') && (
        <a
          href="https://wa.me/5579999094631"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:bg-[#128C7E] transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_30px_rgba(37,211,102,0.6)] flex items-center justify-center group"
          title="Fale conosco no WhatsApp"
        >
          <svg
            className="w-6 h-6 fill-current transition-transform duration-300 group-hover:rotate-[15deg]"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.455h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      )}
    </div>
  );
};

export default App;
