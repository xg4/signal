ALTER TABLE "subscriptions" RENAME COLUMN "hash" TO "device_code";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_hash_unique";