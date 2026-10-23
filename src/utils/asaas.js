/** Calendário de vencimentos. A integração com o Asaas foi desativada. */

export function getNextDueDate(startDate) {
  // Fallback: se não houver startDate, vence em 3 dias
  if (!startDate) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 3);
    return fallback.toISOString().split('T')[0];
  }

  // Garante que a data seja lida sem distorção de fuso horário
  const rawDate = String(startDate).substring(0, 10);
  const start = new Date(rawDate + 'T12:00:00');
  const paymentDayOfWeek = start.getDay(); // 0=Dom, 1=Seg, 2=Ter, ..., 6=Sáb

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayOfWeek = today.getDay();

  // Quantos dias faltam para o próximo dia de pagamento
  let daysUntil = paymentDayOfWeek - todayDayOfWeek;

  // Se já passou o dia de pagamento desta semana → vai para a próxima
  if (daysUntil < 0) daysUntil += 7;

  // Se hoje É o dia de pagamento → usa hoje (admin gerou no próprio dia)
  // Se quiser sempre pular para a semana seguinte, troque < 0 por <= 0

  const nextDue = new Date(today);
  nextDue.setDate(today.getDate() + daysUntil);

  return nextDue.toISOString().split('T')[0]; // YYYY-MM-DD
}

/** @deprecated Use getNextDueDate(startDate) para respeitar o ciclo do contrato */
export function formatDueDate(daysFromNow = 3) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}
