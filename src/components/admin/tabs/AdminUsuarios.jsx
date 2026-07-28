import React, { useState } from 'react';
import { Plus, User, Shield, Trash2, Edit, Check, X, Eye, EyeOff, Users, Key, Lock, ShieldCheck } from 'lucide-react';

const ALL_MODULES = [
  { id: 'bi',             label: 'Painel BI',       icon: '📊' },
  { id: 'faturamento',   label: 'Faturamento',     icon: '🧾' },
  { id: 'frota',         label: 'Frota',            icon: '🚗' },
  { id: 'leads',         label: 'Leads',            icon: '📋' },
  { id: 'locacao',       label: 'Locações',         icon: '📝' },
  { id: 'clientes',      label: 'Clientes',         icon: '👤' },
  { id: 'investidores',  label: 'Investidores',     icon: '💼' },
  { id: 'financeiro',    label: 'Financeiro',       icon: '💰' },
  { id: 'caucao',        label: 'Caução',           icon: '🔐' },
  { id: 'manutencaoAdmin', label: 'Manutenção',     icon: '🔧' },
  { id: 'vistoria',      label: 'Vistoria',         icon: '📷' },
  { id: 'multas',        label: 'Multas',           icon: '🚨' },
  { id: 'oficina',       label: 'Oficina',          icon: '🛠️' },
  { id: 'logs',          label: 'Logs do Sistema',  icon: '📜' },
];

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'funcionario',
  modules: ALL_MODULES.map(m => m.id),
};

const AdminUsuarios = ({ systemUsers = [], onAddUser, onDeleteUser, onUpdateUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [targetDeleteId, setTargetDeleteId] = useState(null);

  const handleConfirmDelete = () => {
    if (passwordInput === 'Lareferencia') {
      onDeleteUser(targetDeleteId);
      setShowPasswordModal(false);
      setPasswordInput('');
      setTargetDeleteId(null);
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setShowForm(true);
  };

  const handleOpenEdit = (user) => {
    setForm({ ...user });
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser({ ...form, id: editingUser.id });
    } else {
      onAddUser({ ...form, id: Date.now() });
    }
    setShowForm(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const toggleModule = (moduleId) => {
    setForm(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(m => m !== moduleId)
        : [...prev.modules, moduleId],
    }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-4xl font-black uppercase tracking-tighter">Usuários do Sistema</h3>
          <p className="text-neutral-400 text-sm font-light mt-1">Gerencie logins e permissões de acesso para funcionários.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-3 bg-neutral-900 text-white px-8 py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-[#C5A059] transition-all shadow-xl"
        >
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Static Admin account */}
      <div className="bg-neutral-900 rounded-[2.5rem] p-8 border border-[#C5A059]/20 flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-900 shadow-lg">
            <Shield size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#C5A059]/20 text-[#C5A059] text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded">Administrador Master</span>
            </div>
            <h4 className="text-white font-black text-lg">L.A Locação Admin</h4>
            <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Laveiculos@gmail.com</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-neutral-500">
          <Lock size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">Acesso Total — Não Editável</span>
        </div>
      </div>

      {/* Employee Users Grid */}
      {systemUsers.length === 0 && (
        <div className="text-center py-20 bg-neutral-50 rounded-[3rem] border border-neutral-100">
          <Users size={48} className="mx-auto text-neutral-200 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">Nenhum funcionário cadastrado</p>
          <p className="text-xs text-neutral-400 mt-2">Clique em "Novo Usuário" para adicionar acesso ao sistema.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {systemUsers.map(user => (
          <div key={user.id} className="bg-white rounded-[2.5rem] border border-neutral-100 p-8 shadow-sm hover:shadow-xl transition-all group relative">
            <div className="flex justify-between items-start mb-6">
              <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                user.role === 'administrador' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
              }`}>
                {user.role === 'administrador' ? 'Administrador' : 'Funcionário'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenEdit(user)} className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                  <Edit size={14} />
                </button>
                <button onClick={() => {
                  setTargetDeleteId(user.id);
                  setShowPasswordModal(true);
                }} className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-neutral-950 rounded-2xl flex items-center justify-center text-[#C5A059] font-black text-lg shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-lg font-black text-neutral-900 tracking-tight">{user.name}</h4>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{user.email}</p>
              </div>
            </div>

            {user.role === 'funcionario' && (
              <div className="space-y-3">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-400">Módulos com Acesso ({user.modules?.length || 0}/{ALL_MODULES.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_MODULES.map(mod => {
                    const hasAccess = (user.modules || []).includes(mod.id);
                    return (
                      <span key={mod.id} className={`text-[7px] font-black uppercase px-2 py-1 rounded-lg border ${
                        hasAccess ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-neutral-50 text-neutral-300 border-neutral-100 line-through'
                      }`}>
                        {mod.icon} {mod.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-[#C5A059]">
                  <User size={22} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h4>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Defina acesso e permissões</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-neutral-300 hover:text-neutral-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSubmit} id="user-form" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Nome Completo</label>
                    <input
                      type="text" required
                      value={form.name || ''}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: Maria Santos"
                      className="w-full bg-neutral-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">E-mail de Acesso</label>
                    <input
                      type="email" required
                      value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="funcionario@lalocacao.com"
                      className="w-full bg-neutral-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'} required={!editingUser}
                        value={form.password || ''}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder={editingUser ? '(Deixe em branco para manter)' : 'Senha de acesso'}
                        className="w-full bg-neutral-50 border-none p-4 pr-12 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 transition-all font-bold text-sm"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black ml-1">Tipo / Função</label>
                    <div className="flex gap-3 pt-1">
                      {[
                        { value: 'administrador', label: 'Administrador' },
                        { value: 'funcionario', label: 'Funcionário' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm({ ...form, role: opt.value })}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            form.role === opt.value
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-neutral-50 text-neutral-400 border-neutral-100 hover:border-neutral-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Module Permissions (only for funcionario) */}
                {form.role === 'funcionario' && (
                  <div className="space-y-4 bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-400 font-black">Módulos com Acesso (somente leitura)</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, modules: ALL_MODULES.map(m => m.id) }))} className="text-[8px] font-black uppercase text-[#C5A059] hover:underline">Todos</button>
                        <span className="text-neutral-300">|</span>
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, modules: [] }))} className="text-[8px] font-black uppercase text-neutral-400 hover:underline">Nenhum</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {ALL_MODULES.map(mod => {
                        const isActive = form.modules.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleModule(mod.id)}
                            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                              isActive ? 'bg-white border-emerald-200 shadow-sm' : 'bg-neutral-100 border-transparent opacity-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-all ${isActive ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-300 bg-white'}`}>
                              {isActive && <Check size={12} className="text-white" />}
                            </div>
                            <span className="text-xs font-black text-neutral-700">{mod.icon} {mod.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[8px] text-neutral-400 font-bold uppercase italic">Funcionários têm acesso de visualização apenas — sem edição ou exclusão.</p>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-neutral-50 bg-neutral-50/30 flex justify-end gap-4 shrink-0">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-all">
                Cancelar
              </button>
              <button form="user-form" type="submit" className="px-12 py-4 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#C5A059] transition-all shadow-xl">
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-4 mb-8">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">Segurança Exigida</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase mt-1">Insira a senha mestre para excluir este usuário</p>
              </div>
            </div>

            <div className="space-y-4">
              <input 
                type="password"
                placeholder="Senha Mestre"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-neutral-50 border-none p-5 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-black text-center tracking-widest"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmDelete()}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                  }}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="flex-1 py-4 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;
