DO $$ BEGIN ALTER TABLE "public"."vehicles" ADD COLUMN "contract_url" text; EXCEPTION WHEN duplicate_column THEN END; $$;
