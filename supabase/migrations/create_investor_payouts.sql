-- ============================================================
-- Tabela: investor_payouts
-- Registra cada repasse realizado aos investidores.
-- ============================================================

CREATE TABLE IF NOT EXISTS investor_payouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id      TEXT NOT NULL,
  investor_name    TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  reference_month  TEXT NOT NULL,        -- ex: "2026-05" (ano-mês de referência)
  pix_key          TEXT,                 -- chave pix usada no momento do repasse
  notes            TEXT,                 -- observações opcionais
  paid_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investor_payouts_investor_id     ON investor_payouts(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_payouts_reference_month ON investor_payouts(reference_month);

ALTER TABLE investor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access" ON investor_payouts
  FOR ALL USING (true);
