ALTER TYPE "public"."trip_status" ADD VALUE 'cancelled' BEFORE 'failed';--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "plan" jsonb;