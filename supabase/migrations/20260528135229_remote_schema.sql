


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."asaas_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rental_id" "text" NOT NULL,
    "asaas_payment_id" "text" NOT NULL,
    "billing_type" "text" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "bank_slip_url" "text",
    "identification_field" "text",
    "pix_payload" "text",
    "pix_encoded_image" "text",
    "description" "text",
    "paid_at" timestamp with time zone,
    "net_value" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."asaas_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "cpf" "text",
    "address" "text",
    "cnh_number" "text",
    "cnh_category" "text",
    "cnh_expiration" "date",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "e-mail" "text",
    "cnh_validity" "date",
    "registro_cnh" "text",
    "data_de_nascimento" "date",
    "documentos" "jsonb" DEFAULT '{}'::"jsonb",
    "telefone" "text",
    "status" "text" DEFAULT 'Ativo'::"text"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vehicle_plate" "text",
    "driver_name" "text",
    "type" "text",
    "date" "date",
    "observations" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "photos" "jsonb",
    "items" "jsonb",
    "damages" "jsonb",
    "time" "text",
    "fuel_level" "text",
    "tire_condition" "text",
    "has_damages" boolean DEFAULT false,
    "video" "jsonb",
    "deductions" "jsonb",
    "total_deduction" numeric,
    "km" integer
);


ALTER TABLE "public"."inspections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investor_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "text" NOT NULL,
    "investor_name" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "reference_month" "text" NOT NULL,
    "pix_key" "text",
    "notes" "text",
    "paid_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."investor_payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "cpf" "text",
    "address" "text",
    "password" "text",
    "status" "text" DEFAULT 'Ativo'::"text",
    "bank" "text",
    "pix" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."investors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "contact" "text",
    "email" "text",
    "type" "text",
    "vehicle_model" "text",
    "vehicle_plate" "text",
    "message" "text",
    "status" "text" DEFAULT 'Novo'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "date" "text",
    "updated_by" "text"
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vehicle_plate" "text",
    "vehicle_model" "text",
    "date" "date",
    "service_type" "text",
    "value" numeric,
    "provider" "text",
    "current_km" numeric,
    "responsible" "text",
    "observations" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."maintenances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rentals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "id_veiculo" "uuid",
    "id_cliente" "uuid",
    "start_date" "date" NOT NULL,
    "value" numeric NOT NULL,
    "tire_tax" numeric DEFAULT 25,
    "status" "text" DEFAULT 'Ativo'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "cnh_register_number" "text",
    "cnh_number" "text",
    "birth_date" "text",
    "user_name" "text",
    "client_phone" "text",
    "email" "text",
    "cnh_validity" "date",
    "cnh_security_code" "text",
    "vehicle_model" "text",
    "vehicle_plate" "text",
    "rental_type" "text" DEFAULT 'weekly'::"text",
    "duration_weeks" integer DEFAULT 4,
    "deposit_total" numeric DEFAULT 0,
    "deposit_paid" numeric DEFAULT 0,
    "deposit_installments" integer DEFAULT 1,
    "late_fine" numeric DEFAULT 10,
    "daily_interest" numeric DEFAULT 1,
    "observations" "text",
    "docs" "jsonb" DEFAULT '{}'::"jsonb",
    "data_inicial" "date",
    "data_final" "date",
    "nome de usuário" "text",
    "total do depósito" numeric,
    "parcelas de depósito" integer,
    "caução_paga" numeric DEFAULT 0,
    "imposto_de_pneus" numeric DEFAULT 0,
    "multa_tardia" numeric DEFAULT 0,
    "juros_diários" numeric DEFAULT 0,
    "cnh_código_de_segurança" "text",
    "documentos" "jsonb" DEFAULT '{}'::"jsonb",
    "contrato_assinado" "text",
    "data_de_nascimento" "date",
    "telefone_do_cliente" "text",
    "registro_cnh" "text",
    "modelo" "text",
    "placa" "text",
    "tipo" "text",
    "semanas" "text",
    "e-mail" "text",
    "observações" "text",
    "id_do_veículo" "uuid",
    "id_do_cliente" "uuid",
    "valor" numeric DEFAULT 0,
    "caução" numeric DEFAULT 0,
    "end_date" "date"
);


ALTER TABLE "public"."rentals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rentals"."end_date" IS 'Data em que o contrato foi encerrado formalmente';



CREATE TABLE IF NOT EXISTS "public"."replacement_contracts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "main_vehicle_plate" "text",
    "replacement_vehicle_plate" "text",
    "driver_name" "text",
    "start_date" "date",
    "end_date" "date",
    "daily_rate" numeric,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."replacement_contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vehicle_id" "uuid",
    "km" numeric,
    "date" "date" NOT NULL,
    "responsible" "text",
    "items" "jsonb",
    "total" numeric,
    "status" "text" DEFAULT 'Pendente'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "plate" "text",
    "model" "text",
    "description" "text",
    "parts" "jsonb",
    "labor_value" "text",
    "provider" "text",
    "observations" "text",
    "opened_at" "text",
    "closed_at" "text"
);


ALTER TABLE "public"."service_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_fines" (
    "id" "text" NOT NULL,
    "vehicle_plate" "text",
    "infraction" "text",
    "date" "text",
    "value" numeric,
    "location" "text",
    "driver_name" "text",
    "driver_id" "text",
    "rental_id" "text",
    "status" "text",
    "installments" integer,
    "paid_installments" "jsonb" DEFAULT '[]'::"jsonb",
    "installment_value" numeric,
    "billing_suspended" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_fines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_name" "text" NOT NULL,
    "user_email" "text" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "text",
    "description" "text" NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


ALTER TABLE "public"."system_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."system_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "role" "text",
    "password" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "modules" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."system_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text",
    "val" numeric NOT NULL,
    "cat" "text",
    "desc" "text",
    "date" "date" NOT NULL,
    "vehicle_plate" "text",
    "responsible" "text",
    "status" "text" DEFAULT 'Concluído'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['in'::"text", 'out'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "model" "text" NOT NULL,
    "plate" "text" NOT NULL,
    "year" "text",
    "renavam" "text",
    "initial_km" numeric,
    "km" numeric,
    "fipe_value" numeric,
    "investor_id" "uuid",
    "admin_tax" numeric DEFAULT 15,
    "investor_tax" numeric DEFAULT 85,
    "has_protection" boolean DEFAULT false,
    "protection_company" "text",
    "protection_value" numeric,
    "franchise_insurance" boolean DEFAULT false,
    "has_spare_key" boolean DEFAULT false,
    "last_belt_change_km" numeric,
    "belt_change_interval_km" numeric,
    "image" "text",
    "dividend" numeric,
    "weekly_rental" numeric,
    "investment_value" numeric,
    "preventive_maintenance" boolean DEFAULT false,
    "status" "text" DEFAULT 'Disponível'::"text",
    "entry_date" "date",
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "protection_payment_day" integer,
    "imposto administrativo" numeric DEFAULT 15,
    "aluguel semanal" numeric DEFAULT 0,
    "tem_proteção" boolean DEFAULT false,
    "tem_chave_reserva" boolean DEFAULT false,
    "última_troca_de_correia_km" numeric DEFAULT 0,
    "intervalo_de_troca_de_correia_km" numeric DEFAULT 50000,
    "imposto_do_investidor" numeric DEFAULT 85,
    "empresa_de_proteção" "text",
    "valor_de_proteção" numeric DEFAULT 0,
    "seguro_de_franquia" boolean DEFAULT false,
    "data_entrada" "date",
    "dividendo" numeric DEFAULT 0
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."asaas_payments"
    ADD CONSTRAINT "asaas_payments_asaas_payment_id_key" UNIQUE ("asaas_payment_id");



ALTER TABLE ONLY "public"."asaas_payments"
    ADD CONSTRAINT "asaas_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_payouts"
    ADD CONSTRAINT "investor_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenances"
    ADD CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."replacement_contracts"
    ADD CONSTRAINT "replacement_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_fines"
    ADD CONSTRAINT "system_fines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_users"
    ADD CONSTRAINT "system_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."system_users"
    ADD CONSTRAINT "system_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_plate_key" UNIQUE ("plate");



CREATE INDEX "idx_asaas_payments_asaas_payment_id" ON "public"."asaas_payments" USING "btree" ("asaas_payment_id");



CREATE INDEX "idx_asaas_payments_rental_id" ON "public"."asaas_payments" USING "btree" ("rental_id");



CREATE INDEX "idx_asaas_payments_status" ON "public"."asaas_payments" USING "btree" ("status");



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_client_id_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_id_do_cliente_fkey" FOREIGN KEY ("id_do_cliente") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_id_do_veículo_fkey" FOREIGN KEY ("id_do_veículo") REFERENCES "public"."vehicles"("id");



ALTER TABLE ONLY "public"."rentals"
    ADD CONSTRAINT "rentals_vehicle_id_fkey" FOREIGN KEY ("id_veiculo") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE SET NULL;



CREATE POLICY "Acesso Total para Todos" ON "public"."clients" USING (true);



CREATE POLICY "Allow public access" ON "public"."inspections" USING (true);



CREATE POLICY "Allow public access" ON "public"."maintenances" USING (true);



CREATE POLICY "Allow public access" ON "public"."replacement_contracts" USING (true);



CREATE POLICY "Allow public access" ON "public"."system_users" USING (true);



CREATE POLICY "Allow public read and write access" ON "public"."system_logs" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access on asaas_payments" ON "public"."asaas_payments" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access on investor_payouts" ON "public"."investor_payouts" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access on service_orders" ON "public"."service_orders" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access on system_fines" ON "public"."system_fines" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access on system_logs" ON "public"."system_logs" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access" ON "public"."clients" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access" ON "public"."investors" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access" ON "public"."leads" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access" ON "public"."rentals" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access" ON "public"."service_orders" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access" ON "public"."transactions" USING (true) WITH CHECK (true);



CREATE POLICY "Public Access" ON "public"."vehicles" USING (true) WITH CHECK (true);



ALTER TABLE "public"."asaas_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investor_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permitir tudo publico" ON "public"."investor_payouts" USING (true);



ALTER TABLE "public"."service_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role full access" ON "public"."asaas_payments" USING (true);



ALTER TABLE "public"."system_fines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."asaas_payments" TO "anon";
GRANT ALL ON TABLE "public"."asaas_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."asaas_payments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."clients" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."inspections" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."inspections" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."inspections" TO "service_role";



GRANT ALL ON TABLE "public"."investor_payouts" TO "anon";
GRANT ALL ON TABLE "public"."investor_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."investors" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."investors" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."investors" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."leads" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."maintenances" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."maintenances" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."maintenances" TO "service_role";



GRANT ALL ON TABLE "public"."rentals" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."rentals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."rentals" TO "service_role";



GRANT ALL ON TABLE "public"."replacement_contracts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."replacement_contracts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."replacement_contracts" TO "service_role";



GRANT ALL ON TABLE "public"."service_orders" TO "anon";
GRANT ALL ON TABLE "public"."service_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."service_orders" TO "service_role";



GRANT ALL ON TABLE "public"."system_fines" TO "anon";
GRANT ALL ON TABLE "public"."system_fines" TO "authenticated";
GRANT ALL ON TABLE "public"."system_fines" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."system_users" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."system_users" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."system_users" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."transactions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."vehicles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."vehicles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";



































drop extension if exists "pg_net";

revoke delete on table "public"."clients" from "authenticated";

revoke insert on table "public"."clients" from "authenticated";

revoke select on table "public"."clients" from "authenticated";

revoke update on table "public"."clients" from "authenticated";

revoke delete on table "public"."clients" from "service_role";

revoke insert on table "public"."clients" from "service_role";

revoke select on table "public"."clients" from "service_role";

revoke update on table "public"."clients" from "service_role";

revoke delete on table "public"."inspections" from "authenticated";

revoke insert on table "public"."inspections" from "authenticated";

revoke select on table "public"."inspections" from "authenticated";

revoke update on table "public"."inspections" from "authenticated";

revoke delete on table "public"."inspections" from "service_role";

revoke insert on table "public"."inspections" from "service_role";

revoke select on table "public"."inspections" from "service_role";

revoke update on table "public"."inspections" from "service_role";

revoke delete on table "public"."investors" from "authenticated";

revoke insert on table "public"."investors" from "authenticated";

revoke select on table "public"."investors" from "authenticated";

revoke update on table "public"."investors" from "authenticated";

revoke delete on table "public"."investors" from "service_role";

revoke insert on table "public"."investors" from "service_role";

revoke select on table "public"."investors" from "service_role";

revoke update on table "public"."investors" from "service_role";

revoke delete on table "public"."leads" from "authenticated";

revoke insert on table "public"."leads" from "authenticated";

revoke select on table "public"."leads" from "authenticated";

revoke update on table "public"."leads" from "authenticated";

revoke delete on table "public"."leads" from "service_role";

revoke insert on table "public"."leads" from "service_role";

revoke select on table "public"."leads" from "service_role";

revoke update on table "public"."leads" from "service_role";

revoke delete on table "public"."maintenances" from "authenticated";

revoke insert on table "public"."maintenances" from "authenticated";

revoke select on table "public"."maintenances" from "authenticated";

revoke update on table "public"."maintenances" from "authenticated";

revoke delete on table "public"."maintenances" from "service_role";

revoke insert on table "public"."maintenances" from "service_role";

revoke select on table "public"."maintenances" from "service_role";

revoke update on table "public"."maintenances" from "service_role";

revoke delete on table "public"."rentals" from "authenticated";

revoke insert on table "public"."rentals" from "authenticated";

revoke select on table "public"."rentals" from "authenticated";

revoke update on table "public"."rentals" from "authenticated";

revoke delete on table "public"."rentals" from "service_role";

revoke insert on table "public"."rentals" from "service_role";

revoke select on table "public"."rentals" from "service_role";

revoke update on table "public"."rentals" from "service_role";

revoke delete on table "public"."replacement_contracts" from "authenticated";

revoke insert on table "public"."replacement_contracts" from "authenticated";

revoke select on table "public"."replacement_contracts" from "authenticated";

revoke update on table "public"."replacement_contracts" from "authenticated";

revoke delete on table "public"."replacement_contracts" from "service_role";

revoke insert on table "public"."replacement_contracts" from "service_role";

revoke select on table "public"."replacement_contracts" from "service_role";

revoke update on table "public"."replacement_contracts" from "service_role";

revoke delete on table "public"."system_users" from "authenticated";

revoke insert on table "public"."system_users" from "authenticated";

revoke select on table "public"."system_users" from "authenticated";

revoke update on table "public"."system_users" from "authenticated";

revoke delete on table "public"."system_users" from "service_role";

revoke insert on table "public"."system_users" from "service_role";

revoke select on table "public"."system_users" from "service_role";

revoke update on table "public"."system_users" from "service_role";

revoke delete on table "public"."transactions" from "authenticated";

revoke insert on table "public"."transactions" from "authenticated";

revoke select on table "public"."transactions" from "authenticated";

revoke update on table "public"."transactions" from "authenticated";

revoke delete on table "public"."transactions" from "service_role";

revoke insert on table "public"."transactions" from "service_role";

revoke select on table "public"."transactions" from "service_role";

revoke update on table "public"."transactions" from "service_role";

revoke delete on table "public"."vehicles" from "authenticated";

revoke insert on table "public"."vehicles" from "authenticated";

revoke select on table "public"."vehicles" from "authenticated";

revoke update on table "public"."vehicles" from "authenticated";

revoke delete on table "public"."vehicles" from "service_role";

revoke insert on table "public"."vehicles" from "service_role";

revoke select on table "public"."vehicles" from "service_role";

revoke update on table "public"."vehicles" from "service_role";


  create policy "Acesso Publico"
  on "storage"."objects"
  as permissive
  for select
  to anon
using ((bucket_id = 'La-locacao'::text));



  create policy "Permitir Delecao"
  on "storage"."objects"
  as permissive
  for delete
  to anon
using ((bucket_id = 'La-locacao'::text));



  create policy "Permitir Edicao"
  on "storage"."objects"
  as permissive
  for update
  to anon
using ((bucket_id = 'La-locacao'::text));



  create policy "Permitir Uploads"
  on "storage"."objects"
  as permissive
  for insert
  to anon
with check ((bucket_id = 'La-locacao'::text));



