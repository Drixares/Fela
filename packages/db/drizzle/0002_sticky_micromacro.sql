CREATE TABLE `import_mappings` (
	`account_id` integer PRIMARY KEY NOT NULL,
	`date_column` integer NOT NULL,
	`amount_column` integer NOT NULL,
	`label_column` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `import_fingerprint` text;--> statement-breakpoint
CREATE INDEX `tx_import_fingerprint_idx` ON `transactions` (`import_fingerprint`);