-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `customerId` INTEGER NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'TRANSFER', 'QRIS', 'TEMPO') NOT NULL DEFAULT 'CASH',
    `amountPaid` DECIMAL(15, 2) NOT NULL,
    `changeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` ENUM('COMPLETED', 'PENDING', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_invoiceNumber_key`(`invoiceNumber`),
    INDEX `orders_userId_idx`(`userId`),
    INDEX `orders_customerId_idx`(`customerId`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `productUnitId` INTEGER NULL,
    `productName` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `unitName` VARCHAR(191) NOT NULL,
    `conversionFactor` DECIMAL(10, 2) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `baseQuantity` DECIMAL(12, 2) NOT NULL,
    `costPrice` DECIMAL(15, 2) NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,

    INDEX `order_items_orderId_idx`(`orderId`),
    INDEX `order_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productUnitId_fkey` FOREIGN KEY (`productUnitId`) REFERENCES `product_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
