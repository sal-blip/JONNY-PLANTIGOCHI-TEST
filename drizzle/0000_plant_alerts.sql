CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`endpoint` text NOT NULL,
	`due` integer NOT NULL,
	`next_try` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminders_owner_unique` ON `reminders` (`owner`);--> statement-breakpoint
CREATE INDEX `reminders_due_idx` ON `reminders` (`next_try`);