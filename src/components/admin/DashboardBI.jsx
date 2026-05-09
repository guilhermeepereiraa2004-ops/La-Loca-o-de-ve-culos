import { AlertTriangle, ChevronRight } from 'lucide-react';

export const DashboardBI = ({ stats, alerts }) => {
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
            {alerts.map((alert) => (
              <div key={alert.title} className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer group">
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
            ))}
          </div>
        </div>

        {/* Quick Actions / Summary */}
        <div className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-[#C5A059]">Resumo Operacional</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Utilização da Frota</p>
                <p className="text-2xl font-black">75%</p>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Margem Líquida</p>
                <p className="text-2xl font-black text-emerald-400">22%</p>
              </div>
            </div>
            <button className="w-full mt-12 py-4 bg-[#C5A059] text-neutral-900 font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all">
              Gerar Relatório Completo
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-10 transform rotate-12">
            <AlertTriangle size={200} />
          </div>
        </div>
      </div>
    </div>
  );
};
