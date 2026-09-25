CREATE TABLE `event_exceptions` (
	`series_id` text NOT NULL,
	`occurrence_date` text NOT NULL,
	CONSTRAINT `event_exceptions_pk` PRIMARY KEY(`series_id`, `occurrence_date`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `end_date` text;--> statement-breakpoint
ALTER TABLE `events` ADD `recurrence_frequency` text;--> statement-breakpoint
ALTER TABLE `events` ADD `recurrence_interval` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `recurrence_until` text;--> statement-breakpoint
ALTER TABLE `events` ADD `notified_occurrence` text;--> statement-breakpoint
UPDATE `events` SET `notified_occurrence` = `date` WHERE `notified` = 1;--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `notified`;