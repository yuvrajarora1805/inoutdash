CREATE DATABASE IF NOT EXISTS `licence_db`;
USE `licence_db`;

CREATE TABLE IF NOT EXISTS `licenses` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `product` ENUM('inout', 'koha') NOT NULL DEFAULT 'inout',
    `customer_name` VARCHAR(255) NOT NULL,
    `customer_email` VARCHAR(255) NOT NULL,
    `domain` VARCHAR(255) NOT NULL,
    `mac_address` VARCHAR(100) DEFAULT NULL,
    `license_key` TEXT NOT NULL,
    `plan` VARCHAR(50) NOT NULL DEFAULT 'Basic',
    `max_users` INT(11) DEFAULT 10,
    `expiry_date` DATE NOT NULL,
    `status` ENUM('Active', 'Expired', 'Revoked', 'Suspended') NOT NULL DEFAULT 'Active',
    `features` JSON DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `domain_product` (`domain`, `product`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admins` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `license_pings` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `license_id` INT(11) NOT NULL,
    `ip_address` VARCHAR(60) DEFAULT NULL,
    `mac_address` VARCHAR(100) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT NULL,
    `pinged_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `license_id` (`license_id`),
    FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default admin: admin / admin123 (bcrypt hash)
INSERT INTO `admins` (`username`, `password_hash`) VALUES 
('admin', '$2b$10$8KlJZBbDm7zzPBCUTZ/8yO2yLLd0nXxdRVOQiLFEHv7P6sC8JGWFq')
ON DUPLICATE KEY UPDATE id=id;
