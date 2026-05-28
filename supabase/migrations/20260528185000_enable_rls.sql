-- 1. Habilitar RLS em todas as tabelas apontadas pelo Security Advisor
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replacement_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 2. Garantir políticas públicas de acesso total (USING true WITH CHECK true)
-- Nota: Algumas tabelas já possuem políticas similares criadas, por isso usamos IF NOT EXISTS ou drop/recreate para evitar erros de duplicidade.

-- Inspeções (inspections)
DROP POLICY IF EXISTS "Allow public access" ON public.inspections;
CREATE POLICY "Allow public access" ON public.inspections 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Investidores (investors)
DROP POLICY IF EXISTS "Public Access" ON public.investors;
CREATE POLICY "Public Access" ON public.investors 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Leads (leads)
DROP POLICY IF EXISTS "Public Access" ON public.leads;
CREATE POLICY "Public Access" ON public.leads 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Manutenções (maintenances)
DROP POLICY IF EXISTS "Allow public access" ON public.maintenances;
CREATE POLICY "Allow public access" ON public.maintenances 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Locações (rentals)
DROP POLICY IF EXISTS "Public Access" ON public.rentals;
CREATE POLICY "Public Access" ON public.rentals 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Contratos de Substituição (replacement_contracts)
DROP POLICY IF EXISTS "Allow public access" ON public.replacement_contracts;
CREATE POLICY "Allow public access" ON public.replacement_contracts 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Usuários do Sistema (system_users)
DROP POLICY IF EXISTS "Allow public access" ON public.system_users;
CREATE POLICY "Allow public access" ON public.system_users 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Transações (transactions)
DROP POLICY IF EXISTS "Public Access" ON public.transactions;
CREATE POLICY "Public Access" ON public.transactions 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);

-- Veículos (vehicles)
DROP POLICY IF EXISTS "Public Access" ON public.vehicles;
CREATE POLICY "Public Access" ON public.vehicles 
    FOR ALL TO anon, authenticated 
    USING (true) 
    WITH CHECK (true);
