ALTER TABLE "events" ALTER COLUMN "notify_minutes" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_name_day_of_week_start_time_unique" UNIQUE("name","day_of_week","start_time");