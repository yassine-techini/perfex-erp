CREATE TABLE `allergen_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_fr` text NOT NULL,
	`icon` text,
	`severity` text DEFAULT 'high' NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `bonuses` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`payroll_period_id` text,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`is_taxable` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`reason` text,
	`notes` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cleaning_records` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`area` text NOT NULL,
	`cleaning_type` text NOT NULL,
	`scheduled_date` integer,
	`completed_date` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`products_used` text,
	`procedure` text,
	`performed_by` text,
	`verified_by` text,
	`verified_at` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_salaries` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	`base_salary` real NOT NULL,
	`hourly_rate` real,
	`payment_method` text DEFAULT 'bank_transfer' NOT NULL,
	`bank_name` text,
	`bank_account` text,
	`bank_iban` text,
	`bank_bic` text,
	`social_security_number` text,
	`tax_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_salary_components` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_salary_id` text NOT NULL,
	`component_id` text NOT NULL,
	`amount` real,
	`percentage` real,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`employee_salary_id`) REFERENCES `employee_salaries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`component_id`) REFERENCES `salary_components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `haccp_control_points` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'ccp' NOT NULL,
	`description` text,
	`hazard_type` text NOT NULL,
	`hazard_description` text,
	`control_measure` text NOT NULL,
	`critical_limit` text,
	`monitoring_procedure` text,
	`monitoring_frequency` text,
	`corrective_action` text,
	`verification_procedure` text,
	`records_required` text,
	`process_step` text,
	`location` text,
	`responsible_role` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `haccp_records` (
	`id` text PRIMARY KEY NOT NULL,
	`control_point_id` text NOT NULL,
	`record_date` integer NOT NULL,
	`record_time` text,
	`measured_value` text,
	`unit` text,
	`within_limits` integer NOT NULL,
	`deviation_details` text,
	`corrective_action_taken` text,
	`corrective_action_date` integer,
	`lot_id` text,
	`production_order_id` text,
	`recorded_by` text,
	`verified_by` text,
	`verified_at` integer,
	`notes` text,
	`attachments` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`control_point_id`) REFERENCES `haccp_control_points`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lot_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` real NOT NULL,
	`quantity_before` real NOT NULL,
	`quantity_after` real NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`from_warehouse_id` text,
	`to_warehouse_id` text,
	`reason` text,
	`performed_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`lot_number` text NOT NULL,
	`inventory_item_id` text,
	`type` text DEFAULT 'raw_material' NOT NULL,
	`supplier_id` text,
	`supplier_lot_number` text,
	`purchase_order_id` text,
	`production_order_id` text,
	`initial_quantity` real NOT NULL,
	`current_quantity` real NOT NULL,
	`unit` text NOT NULL,
	`production_date` integer,
	`reception_date` integer,
	`expiry_date` integer,
	`best_before_date` integer,
	`opened_date` integer,
	`secondary_expiry_date` integer,
	`warehouse_id` text,
	`location` text,
	`status` text DEFAULT 'available' NOT NULL,
	`quarantine_reason` text,
	`quality_status` text DEFAULT 'pending' NOT NULL,
	`quality_notes` text,
	`unit_cost` real,
	`total_cost` real,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `module_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'core' NOT NULL,
	`icon` text,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`dependencies` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organization_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`module_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`settings` text,
	`enabled_at` integer,
	`enabled_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `module_registry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `overtime_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`hours_from` real NOT NULL,
	`hours_to` real,
	`multiplier` real NOT NULL,
	`is_night` integer DEFAULT false NOT NULL,
	`is_holiday` integer DEFAULT false NOT NULL,
	`is_sunday` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payroll_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`payroll_period_id` text,
	`type` text NOT NULL,
	`declaration_date` integer NOT NULL,
	`due_date` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_amount` real,
	`file_url` text,
	`submission_reference` text,
	`submitted_at` integer,
	`submitted_by` text,
	`response_data` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payroll_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`payment_date` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_gross` real,
	`total_net` real,
	`total_employer_charges` real,
	`total_employee_charges` real,
	`employee_count` integer,
	`validated_by` text,
	`validated_at` integer,
	`paid_by` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payslip_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`payslip_id` text NOT NULL,
	`component_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`base` real,
	`rate` real,
	`quantity` real,
	`amount` real NOT NULL,
	`is_taxable` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`payslip_id`) REFERENCES `payslips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`component_id`) REFERENCES `salary_components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payslips` (
	`id` text PRIMARY KEY NOT NULL,
	`payroll_period_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`employee_salary_id` text,
	`employee_name` text NOT NULL,
	`employee_position` text,
	`department_name` text,
	`social_security_number` text,
	`standard_hours` real,
	`overtime_hours` real,
	`night_hours` real,
	`holiday_hours` real,
	`absence_hours` real,
	`paid_leave_hours` real,
	`gross_salary` real NOT NULL,
	`net_salary` real NOT NULL,
	`total_earnings` real NOT NULL,
	`total_deductions` real NOT NULL,
	`employer_contributions` real NOT NULL,
	`total_cost_to_company` real NOT NULL,
	`taxable_income` real,
	`income_tax` real,
	`status` text DEFAULT 'draft' NOT NULL,
	`payment_date` integer,
	`payment_reference` text,
	`pdf_url` text,
	`pdf_generated_at` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_salary_id`) REFERENCES `employee_salaries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_recalls` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`recall_number` text NOT NULL,
	`recall_date` integer NOT NULL,
	`reason` text NOT NULL,
	`risk_level` text NOT NULL,
	`description` text,
	`affected_products` text,
	`affected_lots` text,
	`quantity_affected` real,
	`unit` text,
	`status` text DEFAULT 'initiated' NOT NULL,
	`notifications_sent` integer DEFAULT false NOT NULL,
	`regulatory_notified` integer DEFAULT false NOT NULL,
	`actions_taken` text,
	`closed_at` integer,
	`closed_by` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `production_input_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`production_traceability_id` text NOT NULL,
	`input_lot_id` text NOT NULL,
	`quantity_used` real NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`production_traceability_id`) REFERENCES `production_traceability`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`input_lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `production_traceability` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`production_order_id` text NOT NULL,
	`recipe_id` text,
	`production_date` integer NOT NULL,
	`output_lot_id` text,
	`quantity_produced` real NOT NULL,
	`unit` text NOT NULL,
	`operator_id` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`output_lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`inventory_item_id` text,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`cost_per_unit` real,
	`total_cost` real,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_optional` integer DEFAULT false NOT NULL,
	`notes` text,
	`allergens` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_scaling` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`scale_name` text NOT NULL,
	`scale_factor` real NOT NULL,
	`adjusted_ingredients` text,
	`notes` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`step_number` integer NOT NULL,
	`title` text,
	`instructions` text NOT NULL,
	`duration` integer,
	`temperature` real,
	`temperature_unit` text DEFAULT 'C',
	`image_url` text,
	`video_url` text,
	`tips` text,
	`critical_control_point` integer DEFAULT false NOT NULL,
	`ccp_limits` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`version` integer NOT NULL,
	`changes` text,
	`snapshot` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`category_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`yield_quantity` real NOT NULL,
	`yield_unit` text NOT NULL,
	`batch_size` real,
	`prep_time` integer,
	`rest_time` integer,
	`cook_time` integer,
	`total_time` integer,
	`labor_cost_per_batch` real,
	`overhead_cost_per_batch` real,
	`calculated_cost` real,
	`selling_price` real,
	`margin_percent` real,
	`nutrition_per` text DEFAULT '100g',
	`calories` real,
	`protein` real,
	`carbohydrates` real,
	`fat` real,
	`saturated_fat` real,
	`fiber` real,
	`sugar` real,
	`salt` real,
	`allergens` text,
	`shelf_life` integer,
	`storage_conditions` text,
	`equipment_needed` text,
	`notes` text,
	`image_url` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `recipe_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `salary_components` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`calculation_type` text NOT NULL,
	`default_value` real,
	`formula` text,
	`is_taxable` integer DEFAULT true NOT NULL,
	`affects_net` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `social_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`employee_rate` real,
	`employer_rate` real,
	`ceiling` text DEFAULT 'none' NOT NULL,
	`base` text DEFAULT 'gross' NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	`mandatory` integer DEFAULT true NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tax_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	`brackets` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `temperature_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`equipment_name` text NOT NULL,
	`location` text,
	`recorded_at` integer NOT NULL,
	`temperature` real NOT NULL,
	`unit` text DEFAULT 'C' NOT NULL,
	`min_limit` real,
	`max_limit` real,
	`within_limits` integer NOT NULL,
	`alert_sent` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`recorded_by` text,
	`notes` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
