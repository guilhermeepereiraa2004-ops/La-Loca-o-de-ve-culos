-- ============================================================
-- Tabela: asaas_payments
-- Registra cada cobrança gerada via API do Asaas.
-- Atualizada automaticamente pelo webhook quando o pagamento é confirmado.
-- ============================================================

CREATE TABLE IF NOT EXISTS asaas_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id           TEXT NOT NULL,           -- ID do contrato de locação
  asaas_payment_id    TEXT UNIQUE NOT NULL,     -- ID retornado pelo Asaas (ex: pay_xxx)
  billing_type        TEXT NOT NULL,            -- BOLETO | PIX
  value               NUMERIC(10,2) NOT NULL,
  due_date            DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PENDING',
                      -- PENDING | RECEIVED | CONFIRMED | OVERDUE | REFUNDED
  bank_slip_url       TEXT,                     -- URL do PDF do boleto
  identification_field TEXT,                   -- Linha digitável
  pix_payload         TEXT,                    -- Copia e cola do Pix
  pix_encoded_image   TEXT,                    -- QR Code base64
  description         TEXT,
  paid_at             TIMESTAMPTZ,             -- Data/hora de confirmação do pagamento
  net_value           NUMERIC(10,2),           -- Valor líquido recebido (após taxas Asaas)
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_asaas_payments_rental_id       ON asaas_payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_asaas_payments_asaas_payment_id ON asaas_payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_asaas_payments_status          ON asaas_payments(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE asaas_payments ENABLE ROW LEVEL SECURITY;

-- Política: service_role tem acesso total (usado pela Edge Function)
CREATE POLICY "service_role full access" ON asaas_payments
  FOR ALL USING (true);
