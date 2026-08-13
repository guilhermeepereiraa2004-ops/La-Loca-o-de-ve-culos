import React, { useState } from 'react';
import AdminOficina from '../admin/tabs/AdminOficina';
import OficinaAgenda from './OficinaAgenda';
import OficinaSidebar from './OficinaSidebar';
import OficinaHeader from './OficinaHeader';
import OficinaOrcamentos from './OficinaOrcamentos';
import OficinaEstoque from './OficinaEstoque';
import OficinaFinanceiro from './OficinaFinanceiro';

const OficinaDashboard = (props) => {
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' or 'os'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingAppointments = props.appointments?.filter(a => a.date === todayStr && a.status === 'Agendado') || [];

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 font-sans">
      <OficinaSidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={props.onLogout}
      />
      
      <main className="flex-1 flex flex-col relative min-w-0 xl:ml-16 transition-all duration-300 print:ml-0 print:p-0">
        <OficinaHeader 
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          pendingAppointments={pendingAppointments}
        />
        
        <div className="flex-1 overflow-y-auto bg-neutral-50">
          {activeTab === 'agenda' && (
            <OficinaAgenda 
              appointments={props.appointments}
              clients={props.clients}
              vehicles={props.vehicles}
              onAddAppointment={props.onAddAppointment}
              onUpdateAppointment={props.onUpdateAppointment}
            />
          )}
          {activeTab === 'os' && (
            <div className="p-4 md:p-5 xl:p-6 2xl:p-8">
              <AdminOficina {...props} />
            </div>
          )}
          {activeTab === 'orcamentos' && (
            <div className="p-4 md:p-5 xl:p-6 2xl:p-8 h-full">
              <OficinaOrcamentos {...props} />
            </div>
          )}
          {activeTab === 'estoque' && (
            <div className="p-4 md:p-5 xl:p-6 2xl:p-8 h-full">
              <OficinaEstoque {...props} />
            </div>
          )}
          {activeTab === 'financeiro' && (
            <div className="p-4 md:p-5 xl:p-6 2xl:p-8 h-full">
              <OficinaFinanceiro {...props} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OficinaDashboard;
