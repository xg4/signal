CREATE TABLE `events` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`duration_minutes` integer DEFAULT 0,
	`notify_minutes` text DEFAULT '[]' NOT NULL,
	`locations` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_name_day_of_week_start_time_unique` ON `events` (`name`,`day_of_week`,`start_time`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`auth` text NOT NULL,
	`p256dh` text NOT NULL,
	`device_code` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`nickname` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);