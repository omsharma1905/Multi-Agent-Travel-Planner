CREATE TABLE "trip_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"user_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"scope" text NOT NULL,
	"instruction" text,
	"change_summary" jsonb,
	"snapshot" jsonb NOT NULL,
	"total_cost" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"currency_symbol" text DEFAULT '$' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "trip_versions" ADD CONSTRAINT "trip_versions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_versions" ADD CONSTRAINT "trip_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;