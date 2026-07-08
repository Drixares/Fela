ALTER TABLE `transactions` ADD `import_external_id` text;--> statement-breakpoint
CREATE INDEX `tx_import_external_id_idx` ON `transactions` (`import_external_id`);