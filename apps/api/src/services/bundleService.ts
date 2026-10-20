import { prisma } from '../config/prisma';

export interface BundleComponentInput {
  componentProductId: number;
  quantity: number; // kuantitas dalam satuan dasar produk komponen
}

export class BundleService {
  /**
   * List all bundle products with component breakdown and calculated stock availability
   */
  static async listBundles() {
    const bundleProducts = await prisma.product.findMany({
      where: {
        isBundle: true,
        isActive: true,
      },
      include: {
        category: true,
        units: { orderBy: { conversionFactor: 'asc' } },
        bundleParents: {
          include: {
            componentProduct: {
              include: {
                units: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate maximum assemble-able stock for each bundle based on lowest component ratio
    return bundleProducts.map((bundle) => {
      let maxAvailablePackages = Infinity;
      let totalComponentHpp = 0;

      for (const item of bundle.bundleParents) {
        const compStock = Number(item.componentProduct.currentStock || 0);
        const reqQty = Number(item.quantity);
        const compHpp = Number(item.componentProduct.purchasePrice || 0);

        totalComponentHpp += compHpp * reqQty;

        if (reqQty > 0) {
          const possible = Math.floor(compStock / reqQty);
          if (possible < maxAvailablePackages) {
            maxAvailablePackages = possible;
          }
        }
      }

      if (maxAvailablePackages === Infinity || bundle.bundleParents.length === 0) {
        maxAvailablePackages = 0;
      }

      return {
        ...bundle,
        calculatedAvailableStock: maxAvailablePackages,
        totalComponentHpp,
      };
    });
  }

  /**
   * Get single bundle product detail with its components
   */
  static async getBundleDetail(productId: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        units: true,
        bundleParents: {
          include: {
            componentProduct: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      const error: any = new Error(`Produk dengan ID ${productId} tidak ditemukan.`);
      error.statusCode = 404;
      throw error;
    }

    let maxAvailable = Infinity;
    let totalHpp = 0;

    for (const item of product.bundleParents) {
      const compStock = Number(item.componentProduct.currentStock || 0);
      const reqQty = Number(item.quantity);
      const compHpp = Number(item.componentProduct.purchasePrice || 0);

      totalHpp += compHpp * reqQty;
      if (reqQty > 0) {
        const possible = Math.floor(compStock / reqQty);
        if (possible < maxAvailable) {
          maxAvailable = possible;
        }
      }
    }

    if (maxAvailable === Infinity || product.bundleParents.length === 0) {
      maxAvailable = 0;
    }

    return {
      ...product,
      calculatedAvailableStock: maxAvailable,
      totalComponentHpp: totalHpp,
    };
  }

  /**
   * Save / configure bundle items for a product
   */
  static async saveBundleComponents(productId: number, components: BundleComponentInput[]) {
    // 1. Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      const error: any = new Error(`Produk paket dengan ID ${productId} tidak ditemukan.`);
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate components
    if (!components || components.length === 0) {
      const error: any = new Error('Paket bundling harus memiliki minimal 1 produk komponen sembako.');
      error.statusCode = 400;
      throw error;
    }

    for (const comp of components) {
      if (comp.componentProductId === productId) {
        const error: any = new Error('Produk paket tidak boleh menjadi komponen bagi dirinya sendiri.');
        error.statusCode = 400;
        throw error;
      }

      if (comp.quantity <= 0) {
        const error: any = new Error('Kuantitas komponen paket harus lebih besar dari 0.');
        error.statusCode = 400;
        throw error;
      }
    }

    // 3. Atomically update bundle state and components
    return prisma.$transaction(async (tx) => {
      // Mark product as bundle
      await tx.product.update({
        where: { id: productId },
        data: { isBundle: true },
      });

      // Clear existing bundle items
      await tx.bundleItem.deleteMany({
        where: { bundleProductId: productId },
      });

      // Insert new bundle items
      for (const comp of components) {
        await tx.bundleItem.create({
          data: {
            bundleProductId: productId,
            componentProductId: comp.componentProductId,
            quantity: comp.quantity,
          },
        });
      }

      // Return updated bundle
      return tx.product.findUnique({
        where: { id: productId },
        include: {
          bundleParents: {
            include: { componentProduct: true },
          },
        },
      });
    });
  }

  /**
   * Disband / remove bundle status from a product
   */
  static async removeBundle(productId: number) {
    return prisma.$transaction(async (tx) => {
      await tx.bundleItem.deleteMany({
        where: { bundleProductId: productId },
      });

      return tx.product.update({
        where: { id: productId },
        data: { isBundle: false },
      });
    });
  }
}
