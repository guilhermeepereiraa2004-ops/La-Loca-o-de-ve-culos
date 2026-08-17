import React, { useState } from 'react';
import { Plus, Search, Calendar, Hash, Droplet, Clock, Edit2, Trash2 } from 'lucide-react';
import { parseCurrency } from '../../utils/currencyUtils';

const OficinaTrocasOleo = ({ vehicles, oilChanges = [], onAddOilChange, onUpdateOilChange, onDeleteOilChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    vehiclePlate: '',
    date: new Date().toISOString().split('T')[0],
    km: '',
    nextKm: '',
    value: '',
    observations: ''
  });

  const filteredChanges = oilChanges.filter(item => 
    item.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.observations?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateOilChange(editingItem.id, formData);
    } else {
      onAddOilChange(formData);
    }
    closeModal();
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        vehiclePlate: item.vehiclePlate,
        date: item.date,
        km: item.km,
        nextKm: item.nextKm,
        value: item.value,
        observations: item.observations || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        vehiclePlate: '',
        date: new Date().toISOString().split('T')[0],
        km: '',
        nextKm: '',
        value: '',
        observations: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
            <Droplet className="text-[#C5A059]" />
            Trocas de Óleo
          </h2>
          <p className="text-sm font-bold text-neutral-400 mt-1">Histórico de manutenções de óleo da frota</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar placa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold placeholder:font-medium"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#C5A059] text-white px-5 py-2 rounded-xl hover:bg-[#B39050] transition-colors shadow-lg shadow-[#C5A059]/20 font-bold text-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Nova Troca
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-100">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500">Data</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500">Veículo (Placa)</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500">KM Atual</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500">Próxima KM</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500">Valor (R$)</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredChanges.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-sm font-bold text-neutral-400">
                    Nenhuma troca de óleo registrada.
                  </td>
                </tr>
              ) : (
                filteredChanges.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                        <Calendar size={14} className="text-neutral-400" />
                        {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-block px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-lg text-xs font-black tracking-widest text-neutral-700">
                        {item.vehiclePlate}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-black text-neutral-700">
                      {parseInt(item.km || 0).toLocaleString()} KM
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-600">
                        <Droplet size={14} />
                        {parseInt(item.nextKm || 0).toLocaleString()} KM
                      </div>
                    </td>
                    <td className="p-4 text-sm font-black text-neutral-900">
                      {parseCurrency(item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openModal(item)}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Deseja realmente excluir este registro?')) {
                              onDeleteOilChange(item.id);
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova/Editar Troca */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                <Droplet className="text-[#C5A059]" />
                {editingItem ? 'Editar Troca de Óleo' : 'Nova Troca de Óleo'}
              </h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Data da Troca</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold"
                  />
                </div>
                
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Placa do Veículo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ABC-1234"
                    value={formData.vehiclePlate}
                    onChange={e => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-black tracking-widest uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">KM Atual</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input
                      type="number"
                      required
                      placeholder="Ex: 50000"
                      value={formData.km}
                      onChange={e => setFormData(prev => ({ ...prev, km: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Próxima Troca (KM)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input
                      type="number"
                      required
                      placeholder="Ex: 60000"
                      value={formData.nextKm}
                      onChange={e => setFormData(prev => ({ ...prev, nextKm: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-black text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Valor do Serviço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 250.00"
                  value={formData.value}
                  onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Observações (Opcional)</label>
                <textarea
                  placeholder="Especificações do óleo, filtro trocado, etc..."
                  value={formData.observations}
                  onChange={e => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-sm font-medium resize-none min-h-[100px]"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-black text-white bg-[#C5A059] hover:bg-[#B39050] shadow-lg shadow-[#C5A059]/30 rounded-xl transition-all"
                >
                  {editingItem ? 'Salvar Alterações' : 'Registrar Troca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OficinaTrocasOleo;
