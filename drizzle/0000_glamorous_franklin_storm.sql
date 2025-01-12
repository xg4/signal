CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"duration_minutes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"auth" text NOT NULL,
	"p256dh" text NOT NULL,
	"hash" text NOT NULL,
	CONSTRAINT "subscriptions_hash_unique" UNIQUE("hash")
);
