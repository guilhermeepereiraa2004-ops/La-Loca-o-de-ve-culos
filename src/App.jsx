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
    currentUser, setCurrentUser, selectedImage, setSelectedImage,
    showInterestModal, setShowInterestModal, showSuccessPopup, setShowSuccessPopup,
    selectedVehicleForInterest, setSelectedVehicleForInterest,
    interestForm, setInterestForm,
    seedData,
    handleAddSystemUser, handleUpdateSystemUser, handleDeleteSystemUser,
    handleUpdateLeadStatus, handleAddRental, handleDeleteRental,
    handleUpdateRental, handleAddInvestor, handleUpdateInvestor, handleDeleteInvestor,
    handleAddVehicle, handleUpdateVehicle, handleDeleteVehicle, handleAddTransaction,
    handleAddMaintenance, handleUpdateMaintenance, handleDeleteMaintenance,
    handleCompleteClosure, handlePayCaucaoInstallment, handleConfirmPayment,
    handleAddInspection, handleDeleteInspection, handleCloseServiceOrder,
    handleInterestSubmit
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
        onConfirmPayment={handleConfirmPayment}
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
        transactions={transactions}
        vehicles={vehicles}
        onLogout={() => setView('home')}
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

  // Main Layout (Landing Page, Fleet Page, etc.)
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
    </div>
  );
};

export default App;
