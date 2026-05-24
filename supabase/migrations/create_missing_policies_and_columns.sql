-- ============================================================
-- Correção de Colunas da Tabela de O.S. (service_orders) e 
-- Políticas de Acesso RLS para tabelas auxiliares.
-- ============================================================

-- 1. CORREÇÃO DA TABELA DE ORDENS DE SERVIÇO (service_orders)
-- Adiciona as colunas necessárias para a O.S. que estão faltando no banco
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS plate text,
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS parts jsonb,
ADD COLUMN IF NOT EXISTS labor_value text,
ADD COLUMN IF NOT EXISTS provider text,
ADD COLUMN IF NOT EXISTS observations text,
ADD COLUMN IF NOT EXISTS opened_at text;

-- Garante que haja uma política de acesso público para leitura/escrita em service_orders caso o RLS esteja ativo
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on service_orders" ON public.service_orders;
CREATE POLICY "Allow public read and write access on service_orders" ON public.service_orders
  FOR ALL USING (true) WITH CHECK (true);


-- 2. CORREÇÃO DE PERMISSÕES PARA AS COBRANÇAS ASAAS (asaas_payments)
-- Permite que o painel de faturamento leia e grave as cobranças geradas
ALTER TABLE public.asaas_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on asaas_payments" ON public.asaas_payments;
CREATE POLICY "Allow public read and write access on asaas_payments" ON public.asaas_payments
  FOR ALL USING (true) WITH CHECK (true);


-- 3. CORREÇÃO DE PERMISSÕES PARA REPASSES DE INVESTIDORES (investor_payouts)
-- Permite que o painel leia e grave repasses a investidores
ALTER TABLE public.investor_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on investor_payouts" ON public.investor_payouts;
CREATE POLICY "Allow public read and write access on investor_payouts" ON public.investor_payouts
  FOR ALL USING (true) WITH CHECK (true);
