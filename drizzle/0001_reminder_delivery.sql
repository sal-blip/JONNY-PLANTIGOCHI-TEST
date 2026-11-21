CREATE TABLE `alert_devices` (
	`owner` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`test_id` text,
	`test_at` integer,
	`first_status` text,
	`second_status` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alert_devices_endpoint_unique` ON `alert_devices` (`endpoint`);--> statement-breakpoint
CREATE TABLE `alert_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `alert_receipts_expires` ON `alert_receipts` (`expires`);--> statement-breakpoint
ALTER TABLE `reminders` ADD `event_id` text;--> statement-breakpoint
ALTER TABLE `reminders` ADD `expires` integer;