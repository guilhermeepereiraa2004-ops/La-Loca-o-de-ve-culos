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
    showInterestModal, setShowInterestModal, showSuccessPopup, setShowSuccessPopup,
    selectedVehicleForInterest, setSelectedVehicleForInterest,
    interestForm, setInterestForm,
    seedData,
    handleAddSystemUser, handleUpdateSystemUser, handleDeleteSystemUser,
    handleUpdateLeadStatus, handleAddRental, handleDeleteRental,
    handleUpdateRental, handleUpdateClient, handleAddInvestor, handleUpdateInvestor, handleDeleteInvestor,
    handleAddVehicle, handleUpdateVehicle, handleDeleteVehicle, handleAddTransaction, handleUpdateTransactionStatus,
    handleAddMaintenance, handleUpdateMaintenance, handleDeleteMaintenance,
    handleCompleteClosure, handlePayCaucaoInstallment, handleConfirmPayment,
    handleAddInspection, handleDeleteInspection, handleCloseServiceOrder,
    handleInterestSubmit
  } = useAppState();



  React.useEffect(() => {
    const savedInvestor = localStorage.getItem('la_investor_auth');
    if (savedInvestor) {
      try {
        const parsed = JSON.parse(savedInvestor);
        if (parsed) {
          setCurrentUser(parsed);
          setView('investor');
        }
      } catch (e) {
        console.error("Error parsing saved investor auth:", e);
      }
    }
  }, [setCurrentUser, setView]);

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
        onUpdateTransactionStatus={handleUpdateTransactionStatus}
        onUpdateStatus={handleUpdateLeadStatus}
        onAddRental={handleAddRental}
        onDeleteRental={handleDeleteRental}
        onUpdateRental={handleUpdateRental}
        onUpdateClient={handleUpdateClient}
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
        investor={currentUser}
        transactions={transactions}
        vehicles={vehicles}
        onLogout={() => {
          localStorage.removeItem('la_investor_auth');
          setCurrentUser(null);
          setView('home');
        }}
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
    </div>
  );
};

export default App;
