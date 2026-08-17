DO $$ BEGIN ALTER TABLE "public"."vehicles" ADD COLUMN "crv" text; EXCEPTION WHEN duplicate_column THEN END; $$;
