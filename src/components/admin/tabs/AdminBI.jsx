import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, ChevronRight, BarChart2, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

const formatBRL = (value) =>
  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 text-xs">
        <p className="font-black uppercase tracking-widest text-[#D4AF37] mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {formatBRL(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminBI = ({ stats, chartData = [], alerts, operationalData, setActiveTab }) => {
  const [activeChart, setActiveChart] = useState('receitas');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
      
      {/* Stats Grid — 4 cols on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#0a0a0a] p-6 rounded-2xl border border-neutral-800 shadow-xl shadow-black/50 hover:border-neutral-700 transition-colors hover:border-[#D4AF37]/30 transition-all group">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-bold mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-white truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Receitas vs Despesas */}
        <div className="bg-[#0a0a0a] rounded-3xl border border-neutral-800 shadow-xl shadow-black/40 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-[#D4AF37]/5 hover:border-neutral-700 group/card">
          <div className="p-6 border-b border-neutral-800/60 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-white">
              <BarChart2 size={18} className="text-[#D4AF37]" />
              Receitas vs Despesas
            </h3>
            <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">últimos 6 meses</span>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a3a3a3', textTransform: 'uppercase' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a3a3a3' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#737373' }}>{value}</span>}
                />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#f87171" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução do Saldo */}
        <div className="bg-[#0a0a0a] rounded-3xl border border-neutral-800 shadow-xl shadow-black/40 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-[#D4AF37]/5 hover:border-neutral-700 group/card">
          <div className="p-6 border-b border-neutral-800/60 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 text-white">
              <TrendingUp size={18} className="text-[#D4AF37]" />
              Evolução do Saldo
            </h3>
            <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">últimos 6 meses</span>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a3a3a3', textTransform: 'uppercase' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a3a3a3' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo Acumulado"
                  stroke="#D4AF37"
                  strokeWidth={3}
                  fill="url(#saldoGrad)"
                  dot={{ fill: '#D4AF37', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts & Operational Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0a0a0a] rounded-3xl border border-neutral-800 shadow-xl shadow-black/40 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-[#D4AF37]/5 hover:border-neutral-700 group/card">
          <div className="p-8 border-b border-neutral-50 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500" />
              Alertas Prioritários
            </h3>
            <span className="bg-red-500/10 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
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
                  className="p-6 flex items-center justify-between hover:bg-black transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.type === 'critical' ? 'bg-red-500/10 text-red-500' :
                      alert.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {alert.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-200">{alert.title}</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-medium">Revisão necessária</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-black ${
                      alert.type === 'critical' ? 'text-red-600' :
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

        {/* Operational Summary */}
        <div className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-[#D4AF37]">Resumo Operacional</h3>
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
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Resultado do Mês</p>
                <p className={`text-2xl font-black ${operationalData.netProfitRaw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  R$ {operationalData.netProfit}
                </p>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Investidores</p>
                <p className="text-2xl font-black">{operationalData.investorsCount}</p>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <p className="text-neutral-400 text-xs uppercase tracking-widest">Novos Leads</p>
                <p className="text-2xl font-black text-[#D4AF37]">{operationalData.newLeads}</p>
              </div>
            </div>
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
