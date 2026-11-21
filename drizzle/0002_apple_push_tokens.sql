CREATE TABLE `apple_push_tokens` (
	`scope` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`refresh_at` integer NOT NULL
);
