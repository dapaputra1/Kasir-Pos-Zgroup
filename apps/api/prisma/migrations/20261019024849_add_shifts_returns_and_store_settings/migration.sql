-- AlterTable
ALTER TABLE `orders` ADD COLUMN `cashShiftId` INTEGER NULL;

-- CreateTable
CREATE TABLE `cash_shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NULL,
    `startingCash` DECIMAL(15, 2) NOT NULL,
    `expectedCash` DECIMAL(15, 2) NULL,
    `closingCash` DECIMAL(15, 2) NULL,
    `difference` DECIMAL(15, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cash_shifts_userId_idx`(`userId`),
    INDEX `cash_shifts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnNumber` VARCHAR(191) NOT NULL,
    `orderId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `refundMethod` VARCHAR(191) NOT NULL DEFAULT 'CASH',
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sale_returns_returnNumber_key`(`returnNumber`),
    INDEX `sale_returns_orderId_idx`(`orderId`),
    INDEX `sale_returns_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleReturnId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `unitName` VARCHAR(191) NOT NULL,
    `conversionFactor` DECIMAL(10, 2) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `baseQuantity` DECIMAL(12, 2) NOT NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `returnToStock` BOOLEAN NOT NULL DEFAULT true,

    INDEX `sale_return_items_saleReturnId_idx`(`saleReturnId`),
    INDEX `sale_return_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnNumber` VARCHAR(191) NOT NULL,
    `purchaseId` INTEGER NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `refundMethod` VARCHAR(191) NOT NULL DEFAULT 'DEBT_OFFSET',
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `purchase_returns_returnNumber_key`(`returnNumber`),
    INDEX `purchase_returns_purchaseId_idx`(`purchaseId`),
    INDEX `purchase_returns_supplierId_idx`(`supplierId`),
    INDEX `purchase_returns_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_return_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseReturnId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `unitName` VARCHAR(191) NOT NULL,
    `conversionFactor` DECIMAL(10, 2) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `baseQuantity` DECIMAL(12, 2) NOT NULL,
    `cost` DECIMAL(15, 2) NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,

    INDEX `purchase_return_items_purchaseReturnId_idx`(`purchaseReturnId`),
    INDEX `purchase_return_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `store_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `storeName` VARCHAR(191) NOT NULL DEFAULT 'GrosirPOS Sembako',
    `tagline` VARCHAR(191) NULL DEFAULT 'Pusat Grosir & Eceran Sembako Murah',
    `address` VARCHAR(191) NULL DEFAULT 'Jl. Raya Pasar Induk No. 88, Jakarta',
    `phone` VARCHAR(191) NULL DEFAULT '0812-3456-7890',
    `footerReceipt` TEXT NULL,
    `paperSize` VARCHAR(191) NOT NULL DEFAULT '58mm',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_cashShiftId_idx` ON `orders`(`cashShiftId`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_cashShiftId_fkey` FOREIGN KEY (`cashShiftId`) REFERENCES `cash_shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_shifts` ADD CONSTRAINT `cash_shifts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_returns` ADD CONSTRAINT `sale_returns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_return_items` ADD CONSTRAINT `sale_return_items_saleReturnId_fkey` FOREIGN KEY (`saleReturnId`) REFERENCES `sale_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_return_items` ADD CONSTRAINT `sale_return_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_purchaseReturnId_fkey` FOREIGN KEY (`purchaseReturnId`) REFERENCES `purchase_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_return_items` ADD CONSTRAINT `purchase_return_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
