ALTER TABLE "trips" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "origin_canonical" jsonb;