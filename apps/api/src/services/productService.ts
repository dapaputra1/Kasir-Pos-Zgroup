import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  CreateProductInput,
  UpdateProductInput,
  AdjustStockInput,
  ProductQueryInput,
} from '../validations/productValidation';

export class ProductService {
  /**
   * List products with pagination, search, category filter, stock status filter
   */
  static async listProducts(query: ProductQueryInput) {
    const {
      search,
      categoryId,
      stockStatus,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
        { barcode: { contains: term } },
        { units: { some: { barcode: { contains: term } } } },
      ];
    }

    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out_of_stock') {
        where.currentStock = { lte: 0 };
      } else if (stockStatus === 'low_stock') {
        // Stock > 0 and stock <= minStock
        where.AND = [
          { currentStock: { gt: 0 } },
          // MySQL raw or where expression; we can filter or compare
        ];
      } else if (stockStatus === 'in_stock') {
        where.currentStock = { gt: 0 };
      }
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Fetch items with relations
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: {
          select: { id: true, code: true, name: true },
        },
        units: {
          orderBy: { conversionFactor: 'asc' },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    // Client-friendly post-filtering for low stock if requested
    let resultItems = products;
    if (stockStatus === 'low_stock') {
      resultItems = products.filter(
        (p) => Number(p.currentStock) > 0 && Number(p.currentStock) <= Number(p.minStock)
      );
    }

    return {
      items: resultItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single product with units, category, and recent stock movements
   */
  static async getProductById(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        units: {
          orderBy: { conversionFactor: 'asc' },
        },
        stockMovements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!product) {
      const error: any = new Error('Produk tidak ditemukan.');
      error.statusCode = 404;
      error.code = 'PRODUCT_NOT_FOUND';
      throw error;
    }

    return product;
  }

  /**
   * Find product by SKU or Barcode (critical for POS scanner)
   */
  static async getProductByBarcodeOrSku(code: string) {
    const cleanCode = code.trim();
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: cleanCode },
          { sku: cleanCode },
          { units: { some: { barcode: cleanCode } } },
        ],
      },
      include: {
        category: true,
        units: {
          orderBy: { conversionFactor: 'asc' },
        },
      },
    });

    if (!product) {
      const error: any = new Error(`Produk dengan barcode/SKU '${cleanCode}' tidak ditemukan.`);
      error.statusCode = 404;
      error.code = 'PRODUCT_NOT_FOUND';
      throw error;
    }

    return product;
  }

  /**
   * Create new product with multi-units and initial stock movement in a single ACID transaction
   */
  static async createProduct(input: CreateProductInput, userId?: number) {
    // Validate uniqueness of SKU
    const existingSku = await prisma.product.findUnique({
      where: { sku: input.sku },
    });
    if (existingSku) {
      const error: any = new Error(`SKU '${input.sku}' sudah terdaftar.`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_SKU';
      throw error;
    }

    // Ensure category exists
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      const error: any = new Error('Kategori yang dipilih tidak valid.');
      error.statusCode = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }

    // Validate units: must have at least one base unit with factor 1
    const baseUnitInput = input.units.find(
      (u) => u.isBaseUnit || u.unitName.toUpperCase() === input.baseUnit.toUpperCase()
    );
    if (!baseUnitInput) {
      const error: any = new Error(
        `Salah satu satuan harus menjadi satuan dasar (${input.baseUnit}) dengan faktor konversi 1.`
      );
      error.statusCode = 400;
      error.code = 'MISSING_BASE_UNIT';
      throw error;
    }

    const initialStock = Number(input.initialStock) || 0;

    return prisma.$transaction(async (tx) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          sku: input.sku.toUpperCase(),
          barcode: input.barcode?.trim() || null,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          categoryId: input.categoryId,
          baseUnit: input.baseUnit.toUpperCase(),
          currentStock: initialStock,
          minStock: input.minStock,
          purchasePrice: input.purchasePrice,
        },
      });

      // 2. Create Product Units
      const unitCreateData = input.units.map((u) => {
        const isBase =
          u.isBaseUnit || u.unitName.toUpperCase() === input.baseUnit.toUpperCase();
        return {
          productId: product.id,
          unitName: u.unitName.toUpperCase(),
          conversionFactor: isBase ? 1 : u.conversionFactor,
          isBaseUnit: isBase,
          price: u.price,
          wholesalePrice: u.wholesalePrice || null,
          barcode: u.barcode?.trim() || null,
        };
      });

      await tx.productUnit.createMany({
        data: unitCreateData,
      });

      // 3. Create initial stock movement audit trail if initialStock > 0
      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'IN',
            quantity: initialStock,
            previousStock: 0,
            currentStock: initialStock,
            referenceType: 'INITIAL',
            note: 'Saldo awal pendaftaran produk',
            userId: userId || null,
          },
        });
      }

      // Return complete product with relations
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          units: {
            orderBy: { conversionFactor: 'asc' },
          },
          stockMovements: true,
        },
      });
    });
  }

  /**
   * Update product and its units atomically
   */
  static async updateProduct(id: number, input: UpdateProductInput) {
    const existing = await this.getProductById(id);

    if (input.sku && input.sku.toUpperCase() !== existing.sku) {
      const duplicate = await prisma.product.findUnique({
        where: { sku: input.sku.toUpperCase() },
      });
      if (duplicate) {
        const error: any = new Error(`SKU '${input.sku}' sudah terdaftar.`);
        error.statusCode = 409;
        error.code = 'DUPLICATE_SKU';
        throw error;
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update basic product info
      await tx.product.update({
        where: { id },
        data: {
          sku: input.sku ? input.sku.toUpperCase() : undefined,
          barcode: input.barcode !== undefined ? input.barcode?.trim() || null : undefined,
          name: input.name ? input.name.trim() : undefined,
          description:
            input.description !== undefined ? input.description?.trim() || null : undefined,
          categoryId: input.categoryId,
          baseUnit: input.baseUnit ? input.baseUnit.toUpperCase() : undefined,
          minStock: input.minStock,
          purchasePrice: input.purchasePrice,
          isActive: input.isActive,
        },
      });

      // 2. If units provided, replace or update
      if (input.units && input.units.length > 0) {
        // Delete existing units and re-create to keep consistency
        await tx.productUnit.deleteMany({
          where: { productId: id },
        });

        const targetBaseUnit = (input.baseUnit || existing.baseUnit).toUpperCase();

        const unitCreateData = input.units.map((u) => {
          const isBase =
            u.isBaseUnit || u.unitName.toUpperCase() === targetBaseUnit;
          return {
            productId: id,
            unitName: u.unitName.toUpperCase(),
            conversionFactor: isBase ? 1 : u.conversionFactor,
            isBaseUnit: isBase,
            price: u.price,
            wholesalePrice: u.wholesalePrice || null,
            barcode: u.barcode?.trim() || null,
          };
        });

        await tx.productUnit.createMany({
          data: unitCreateData,
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          units: {
            orderBy: { conversionFactor: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Adjust stock with mandatory audit trail and database transaction
   */
  static async adjustStock(productId: number, input: AdjustStockInput, userId?: number) {
    return prisma.$transaction(async (tx) => {
      // Fetch product with row locking in mind
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        const error: any = new Error('Produk tidak ditemukan.');
        error.statusCode = 404;
        error.code = 'PRODUCT_NOT_FOUND';
        throw error;
      }

      const prevStock = Number(product.currentStock);
      const qty = Number(input.quantity);
      let newStock = prevStock;

      if (input.type === 'IN' || input.type === 'RETURN') {
        newStock = prevStock + qty;
      } else if (input.type === 'OUT') {
        if (prevStock < qty) {
          const error: any = new Error(
            `Stok tidak mencukupi untuk pengurangan ini. Stok saat ini: ${prevStock} ${product.baseUnit}`
          );
          error.statusCode = 400;
          error.code = 'INSUFFICIENT_STOCK';
          throw error;
        }
        newStock = prevStock - qty;
      } else if (input.type === 'ADJUSTMENT') {
        // Direct count / Stock Opname adjustment
        newStock = qty;
      }

      // Update current stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      // Record audit movement
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: input.type,
          quantity: qty,
          previousStock: prevStock,
          currentStock: newStock,
          referenceType: input.referenceType || 'MANUAL_ADJUSTMENT',
          note: input.note,
          userId: userId || null,
        },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      return {
        product: updatedProduct,
        movement,
      };
    });
  }

  /**
   * Delete product (with safeguard against existing stock movements / sales)
   */
  static async deleteProduct(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stockMovements: true },
        },
      },
    });

    if (!product) {
      const error: any = new Error('Produk tidak ditemukan.');
      error.statusCode = 404;
      error.code = 'PRODUCT_NOT_FOUND';
      throw error;
    }

    // If product has more than 1 stock movement (e.g. sales, purchases), soft-delete instead
    if (product._count.stockMovements > 1) {
      return prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }

    // Otherwise, clean delete
    return prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      await tx.productUnit.deleteMany({ where: { productId: id } });
      return tx.product.delete({ where: { id } });
    });
  }
}
