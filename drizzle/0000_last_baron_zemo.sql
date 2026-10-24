CREATE TYPE "public"."budget_tier" AS ENUM('budget', 'moderate', 'premium', 'luxury');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('planning', 'upcoming', 'ongoing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "trip_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"interests" text[] NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_preferences_trip_id_unique" UNIQUE("trip_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"destination" text NOT NULL,
	"days" integer NOT NULL,
	"travellers" integer NOT NULL,
	"budget" "budget_tier" NOT NULL,
	"status" "trip_status" DEFAULT 'planning' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "trip_preferences" ADD CONSTRAINT "trip_preferences_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;