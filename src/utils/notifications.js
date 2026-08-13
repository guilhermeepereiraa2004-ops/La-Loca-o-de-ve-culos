/**
 * notifications.js
 * Utilitário puro que calcula notificações/badges por módulo do painel admin.
 * Retorna um objeto com a contagem por módulo e uma lista consolidada de alertas.
 */

/**
 * Calcula os badges de notificação para cada módulo do admin.
 * @param {object} params - Todos os dados do app state
 * @returns {{ badges: object, alerts: Array }}
 */
export function computeNotifications(params = {}) {
  const {
    leads = [],
    rentals = [],
    transactions = [],
    maintenances = [],
    inspections = [],
    serviceOrders = [],
    fines = [],
  } = params;
  const badges = {};
  const alerts = [];
  const now = new Date();

  // ─── LEADS ────────────────────────────────────────────────────────────────
  const newLeads = leads.filter(l => (l.status || '').toLowerCase().trim() === 'novo');
  if (newLeads.length > 0) {
    badges.leads = newLeads.length;
    alerts.push({
      module: 'leads',
      label: 'Leads',
      count: newLeads.length,
      message: `${newLeads.length} lead${newLeads.length > 1 ? 's' : ''} novo${newLeads.length > 1 ? 's' : ''} aguardando contato`,
      color: 'emerald',
    });
  }

  // ─── FATURAMENTO ──────────────────────────────────────────────────────────
  // Pagamentos semanais pendentes (aluguéis ativos com próximo vencimento)
  const pendingPayments = rentals.filter(r => {
    if (r.status !== 'Ativo') return false;
    // Verifica se há um vencimento próximo (dentro de 3 dias)
    if (!r.nextPaymentDate) return false;
    const nextDate = new Date(r.nextPaymentDate);
    const diffDays = (nextDate - now) / (1000 * 60 * 60 * 24);
    return diffDays <= 3 && diffDays >= -1; // vence em até 3 dias ou ontem
  });

  // Também verifica cobranças confirmadas pendentes
  const unconfirmedPayments = rentals.filter(r =>
    r.status === 'Ativo' && r.paymentStatus === 'pendente'
  );

  const faturamentoCount = Math.max(pendingPayments.length, unconfirmedPayments.length);
  if (faturamentoCount > 0) {
    badges.faturamento = faturamentoCount;
    alerts.push({
      module: 'faturamento',
      label: 'Faturamento',
      count: faturamentoCount,
      message: `${faturamentoCount} pagamento${faturamentoCount > 1 ? 's' : ''} a confirmar`,
      color: 'amber',
    });
  }

  // ─── FINANCEIRO ───────────────────────────────────────────────────────────
  // Removido a pedido do usuário (não notificar lançamentos pendentes no financeiro)

  // ─── CAUÇÃO ───────────────────────────────────────────────────────────────
  // Parcelas de caução em aberto
  const openDeposits = rentals.filter(r => {
    if (!r.depositInstallments || r.status === 'Encerrado') return false;
    const paid = parseFloat(r.depositPaid || 0);
    const total = parseFloat(r.depositTotal || 0);
    return total > 0 && paid < total;
  });
  if (openDeposits.length > 0) {
    badges.caucao = openDeposits.length;
    alerts.push({
      module: 'caucao',
      label: 'Caução',
      count: openDeposits.length,
      message: `${openDeposits.length} ${openDeposits.length > 1 ? 'cauções' : 'caução'} com parcelas em aberto`,
      color: 'orange',
    });
  }

  // ─── MANUTENÇÃO ───────────────────────────────────────────────────────────
  // Manutenções programadas (próximas 7 dias) ou vencidas
  const upcomingMaint = maintenances.filter(m => {
    if (m.status === 'Concluída') return false;
    if (!m.nextDate && !m.scheduledDate) return false;
    const date = new Date(m.nextDate || m.scheduledDate);
    const diffDays = (date - now) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });
  if (upcomingMaint.length > 0) {
    badges.manutencaoAdmin = upcomingMaint.length;
    alerts.push({
      module: 'manutencaoAdmin',
      label: 'Manutenção',
      count: upcomingMaint.length,
      message: `${upcomingMaint.length} manutenção${upcomingMaint.length > 1 ? 'ões' : ''} programada${upcomingMaint.length > 1 ? 's' : ''} nos próximos 7 dias`,
      color: 'blue',
    });
  }

  // ─── VISTORIA ─────────────────────────────────────────────────────────────
  // Vistorias de entrega sem vistoria de devolução correspondente
  const normalizePlate = (p) => (p || '').replace(/-/g, '').toUpperCase();
  const entregaInspections = inspections.filter(i => i.type === 'Entrega');
  const devolucaoInspections = inspections.filter(i => i.type === 'Devolução');
  const pendingReturns = entregaInspections.filter(exit =>
    !devolucaoInspections.some(ret => ret.rentalId === exit.rentalId || normalizePlate(ret.vehiclePlate) === normalizePlate(exit.vehiclePlate))
  );

  // Aluguéis ativos sem vistoria de entrega
  const activeRentalsWithoutInspection = rentals.filter(r =>
    r.status === 'Ativo' && !entregaInspections.some(i => i.rentalId === r.id || normalizePlate(i.vehiclePlate) === normalizePlate(r.plate || r.vehiclePlate))
  );

  const vistoriaCount = pendingReturns.length + activeRentalsWithoutInspection.length;
  if (vistoriaCount > 0) {
    badges.vistoria = vistoriaCount;
    alerts.push({
      module: 'vistoria',
      label: 'Vistoria',
      count: vistoriaCount,
      message: `${vistoriaCount} vistoria${vistoriaCount > 1 ? 's' : ''} pendente${vistoriaCount > 1 ? 's' : ''}`,
      color: 'purple',
    });
  }

  // ─── OFICINA ──────────────────────────────────────────────────────────────
  // Ordens de serviço abertas
  const openOrders = (serviceOrders || []).filter(o => o.status !== 'Encerrada' && o.status !== 'Concluída');
  if (openOrders.length > 0) {
    badges.oficina = openOrders.length;
    alerts.push({
      module: 'oficina',
      label: 'Oficina',
      count: openOrders.length,
      message: `${openOrders.length} O.S. aberta${openOrders.length > 1 ? 's' : ''} aguardando resolução`,
      color: 'red',
    });
  }

  // ─── LOCAÇÃO ──────────────────────────────────────────────────────────────
  // Contratos ativos com vencimento próximo (7 dias)
  const expiringRentals = rentals.filter(r => {
    if (r.status !== 'Ativo' || !r.endDate) return false;
    const end = new Date(r.endDate);
    const diffDays = (end - now) / (1000 * 60 * 60 * 24);
    return diffDays <= 7 && diffDays >= 0;
  });
  if (expiringRentals.length > 0) {
    badges.locacao = expiringRentals.length;
    alerts.push({
      module: 'locacao',
      label: 'Locação',
      count: expiringRentals.length,
      message: `${expiringRentals.length} contrato${expiringRentals.length > 1 ? 's' : ''} vencendo em até 7 dias`,
      color: 'orange',
    });
  }

  // ─── MULTAS ───────────────────────────────────────────────────────────────
  const pendingFines = (fines || []).filter(f => f.status === 'Pendente' || f.status === 'Em Cobrança');
  if (pendingFines.length > 0) {
    badges.multas = pendingFines.length;
    alerts.push({
      module: 'multas',
      label: 'Multas',
      count: pendingFines.length,
      message: `${pendingFines.length} multa${pendingFines.length > 1 ? 's' : ''} pendente${pendingFines.length > 1 ? 's' : ''} de pagamento`,
      color: 'red',
    });
  }

  // ─── TOTAL GLOBAL ─────────────────────────────────────────────────────────
  const totalCount = Object.values(badges).reduce((sum, n) => sum + n, 0);

  return { badges, alerts, totalCount };
}

/** Mapeia a cor da notificação para classes Tailwind */
export function getAlertColorClasses(color) {
  const map = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      badge: 'bg-emerald-500',
      dot: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      badge: 'bg-amber-500',
      dot: 'bg-amber-500',
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      badge: 'bg-orange-500',
      dot: 'bg-orange-500',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badge: 'bg-blue-500',
      dot: 'bg-blue-500',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      badge: 'bg-purple-500',
      dot: 'bg-purple-500',
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      badge: 'bg-red-500',
      dot: 'bg-red-500',
    },
  };
  return map[color] || map.amber;
}
