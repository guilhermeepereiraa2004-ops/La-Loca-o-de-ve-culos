import { useState, useEffect } from 'react';

export const useAdminState = (currentUser) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('la_admin_active_tab');
    return savedTab || 'bi';
  });

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('la_admin_active_tab', activeTab);
    }
  }, [activeTab]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRental, setIsEditingRental] = useState(false);
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
  const [showVehicleDetailModal, setShowVehicleDetailModal] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showTerminationTerm, setShowTerminationTerm] = useState(false);
  const [finalClosureData, setFinalClosureData] = useState(null);
  const [pendingInspection, setPendingInspection] = useState(null);
  const [showAdminSuccess, setShowAdminSuccess] = useState({ show: false, title: '', message: '' });
  const [currentRentalStep, setCurrentRentalStep] = useState(1);

  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('todos');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('Todos');
  const [rentalFilter, setRentalFilter] = useState('ativas');
  const [financeFilter, setFinanceFilter] = useState('Todos');

  const [investorForm, setInvestorForm] = useState({
    name: '', email: '', phone: '', cpf: '', address: '',
    bank: '', pix: '', password: '', adminTax: '15', status: 'Ativo'
  });

  const [vehicleForm, setVehicleForm] = useState({
    model: '', plate: '', year: '', renavam: '', initialKm: '', status: 'Disponível',
    fipeValue: '', investor: '', investorId: '', adminTax: '15', investorTax: '85',
    hasProtection: false,
    protectionCompany: '',
    protectionPaymentDate: new Date().toISOString().split('T')[0],
    protectionValue: '',
    franchiseInsurance: false, 
    hasSpareKey: false, lastBeltChangeKm: '', beltChangeIntervalKm: '50000', 
    image: '', imageFile: null, imagePreview: null, weeklyRental: '', 
    investmentValue: '', preventiveMaintenance: true,
    entryDate: new Date().toISOString().split('T')[0],
    crlv: '', crlvFile: null,
    crv: '', crvFile: null
  });

  const [financeForm, setFinanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'in', val: '', desc: '', cat: 'Aluguel',
    vehiclePlate: '', responsible: 'Administradora',
    status: 'Concluído',
    investorName: ''
  });

  const [rentalForm, setRentalForm] = useState({
    user: '', clientPhone: '', email: '', cnhNumber: '', cnhRegisterNumber: '', birthDate: '', cnhValidity: '', cpf: '',
    vehicle: '', plate: '', rentalType: 'weekly', 
    value: '', tireTax: '25', durationWeeks: '4', depositTotal: '', 
    depositPaid: '', depositInstallments: '1', 
    startDate: new Date().toISOString().split('T')[0],
    lateFine: '10', dailyInterest: '1', observations: '',
    docs: { cnh: null, residence: null, appPrints: [], signedContract: null }
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdmin = !currentUser || currentUser.role === 'administrador';
  const canAccess = (moduleId) => {
    if (isAdmin) return true;
    return (currentUser?.modules || []).includes(moduleId);
  };

  useEffect(() => {
    if (currentUser && !canAccess(activeTab)) {
      const allowedTabs = [
        'bi', 'faturamento', 'frota', 'leads', 'locacao', 'clientes', 
        'investidores', 'financeiro', 'caucao', 'manutencaoAdmin', 
        'vistoria', 'multas', 'oficina', 'logs', 'usuarios'
      ];
      const firstAllowed = allowedTabs.find(tabId => canAccess(tabId));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      }
    }
  }, [currentUser, activeTab]);

  return {
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
  };
};
