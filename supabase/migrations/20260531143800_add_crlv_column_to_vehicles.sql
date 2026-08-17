DO $$ BEGIN ALTER TABLE "public"."vehicles" ADD COLUMN "crlv" text; EXCEPTION WHEN duplicate_column THEN END; $$;
