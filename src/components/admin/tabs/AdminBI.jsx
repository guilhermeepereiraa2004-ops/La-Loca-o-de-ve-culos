import React from 'react';
import { TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';

const AdminBI = ({ stats, alerts, operationalData, setActiveTab }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm hover:border-[#C5A059]/30 transition-all group">
            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold mb-2">{stat.label}</p>
            <p className="text-3xl font-black text-neutral-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-neutral-50 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500" />
              Alertas Prioritários
            </h3>
            <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              {alerts.reduce((acc, curr) => acc + curr.count, 0)} Pendências
            </span>
          </div>
          <div className="divide-y divide-neutral-50">
            {alerts.map((alert) => {
              const handleAlertClick = () => {
                if (!setActiveTab) return;
                const title = (alert.title || '').toLowerCase();
                if (title.includes('preventiva') || title.includes('correia')) {
                  setActiveTab('manutencaoAdmin');
                } else if (title.includes('cnh')) {
                  setActiveTab('clientes');
                } else if (title.includes('vistoria')) {
                  setActiveTab('vistoria');
                }
              };
              return (
                <div 
                  key={alert.title} 
                  onClick={handleAlertClick}
                  className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.type === 'critical' ? 'bg-red-50 text-red-500' :
                      alert.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                      }`}>
                      {alert.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-800">{alert.title}</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-medium">Revisão necessária</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-black ${alert.type === 'critical' ? 'text-red-600' :
                      alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                      {alert.count}
                    </span>
                    <ChevronRight size={16} className="text-neutral-200 group-hover:text-neutral-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions / Summary */}
        <div className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-[#C5A059]">Resumo Operacional</h3>
            <div className="space-y-6 flex-1">
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Utilização da Frota</p>
                <p className="text-2xl font-black">{operationalData.utilizationRate}%</p>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Margem Líquida</p>
                <p className={`text-2xl font-black ${operationalData.netProfitRaw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {operationalData.profitMargin}%
                </p>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Lucro Líquido</p>
                <p className={`text-2xl font-black ${operationalData.netProfitRaw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  R$ {operationalData.netProfit}
                </p>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Parceiros Investidores</p>
                <p className="text-2xl font-black">{operationalData.investorsCount}</p>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Novos Leads</p>
                <p className="text-2xl font-black text-[#C5A059]">{operationalData.newLeads}</p>
              </div>
            </div>
            <button className="w-full mt-8 py-4 bg-[#C5A059] text-neutral-900 font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all rounded-xl">
              Gerar Relatório Detalhado
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-10 transform rotate-12 pointer-events-none">
            <TrendingUp size={200} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBI;
