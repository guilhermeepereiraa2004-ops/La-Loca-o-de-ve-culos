-- ============================================================
-- Criação da Tabela de Multas (system_fines)
-- E políticas de acesso RLS para leitura e gravação livre.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_fines (
    id text NOT NULL PRIMARY KEY,
    vehicle_plate text,
    infraction text,
    date text,
    value numeric,
    location text,
    driver_name text,
    driver_id text,
    rental_id text,
    status text,
    installments integer,
    paid_installments jsonb DEFAULT '[]'::jsonb,
    installment_value numeric,
    billing_suspended boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilita RLS (Row Level Security)
ALTER TABLE public.system_fines ENABLE ROW LEVEL SECURITY;

-- Garante política de acesso público para leitura/escrita caso o RLS esteja ativo
DROP POLICY IF EXISTS "Allow public read and write access on system_fines" ON public.system_fines;
CREATE POLICY "Allow public read and write access on system_fines" ON public.system_fines
  FOR ALL USING (true) WITH CHECK (true);
