CREATE TABLE `events` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`end_time` text,
	`all_day` integer DEFAULT false NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`color` text,
	`reminder_minutes` integer,
	`notified` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_date_idx` ON `events` (`date`);