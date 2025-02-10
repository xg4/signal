ALTER TABLE "events" ALTER COLUMN "duration_minutes" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "duration_minutes" DROP NOT NULL;