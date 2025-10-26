CREATE TABLE `languages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `languages_code_unique` ON `languages` (`code`);--> statement-breakpoint
CREATE TABLE `namespaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `namespaces_name_unique` ON `namespaces` (`name`);--> statement-breakpoint
CREATE TABLE `translation_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`namespace_id` integer,
	`key_path` text NOT NULL,
	`description` text,
	FOREIGN KEY (`namespace_id`) REFERENCES `namespaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translation_keys_key_path_unique` ON `translation_keys` (`key_path`);--> statement-breakpoint
CREATE TABLE `translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_id` integer NOT NULL,
	`language_code` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `translation_keys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action
);
