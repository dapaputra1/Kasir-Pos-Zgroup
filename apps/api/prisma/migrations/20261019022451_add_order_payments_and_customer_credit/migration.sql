-- AlterTable
ALTER TABLE `customers` ADD COLUMN `creditLimit` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `paymentStatus` ENUM('PAID', 'UNPAID', 'PARTIAL') NOT NULL DEFAULT 'PAID';

-- CreateTable
CREATE TABLE `order_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paymentMethod` ENUM('CASH', 'TRANSFER', 'QRIS', 'TEMPO') NOT NULL DEFAULT 'CASH',
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_payments_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_paymentStatus_idx` ON `orders`(`paymentStatus`);

-- AddForeignKey
ALTER TABLE `order_payments` ADD CONSTRAINT `order_payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
