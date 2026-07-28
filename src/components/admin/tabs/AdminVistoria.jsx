import React, { useState, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import InspectionList from './vistoria/InspectionList';

// Lazy-load the heavy form component — only downloaded when user clicks "Nova Vistoria"
const InspectionForm = React.lazy(() => import('./vistoria/InspectionForm'));

const AdminVistoria = ({ inspections = [], vehicles = [], rentals = [], onAddInspection, onDeleteInspection, onViewDetail, pendingInspection, onClearPendingInspection }) => {
  const [showForm, setShowForm] = useState(false);

  // Auto-open form if there's a pending inspection
  React.useEffect(() => {
    if (pendingInspection) {
      setShowForm(true);
    }
  }, [pendingInspection]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {!showForm ? (
        <InspectionList
          inspections={inspections}
          vehicles={vehicles}
          rentals={rentals}
          onDeleteInspection={onDeleteInspection}
          onViewDetail={onViewDetail}
          onNewInspection={() => setShowForm(true)}
        />
      ) : (
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={32} className="text-[#D4AF37] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Carregando formulário...</p>
          </div>
        }>
          <InspectionForm
            vehicles={vehicles}
            rentals={rentals}
            onAddInspection={onAddInspection}
            onClose={() => setShowForm(false)}
            pendingInspection={pendingInspection}
            onClearPendingInspection={onClearPendingInspection}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AdminVistoria;
