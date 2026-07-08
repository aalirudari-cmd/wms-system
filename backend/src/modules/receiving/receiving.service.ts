import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../core/errors.js';
import { applyMovement } from '../inventory/ledger.service.js';
import { receivingRepository } from './receiving.repository.js';
import type { z } from 'zod';
import type { createGoodsReceiptSchema, createPurchaseOrderSchema, createAsnSchema, updateReceiptLineSchema } from './receiving.schema.js';

async function suggestPutAwayLocation(warehouseId: number) {
  const bins = await prisma.location.findMany({
    where: { warehouseId, type: 'BIN', status: 'ACTIVE', deletedAt: null },
    include: { _count: { select: { inventoryItems: true } } },
  });
  if (bins.length === 0) return null;
  bins.sort((a, b) => a._count.inventoryItems - b._count.inventoryItems);
  return bins[0].id;
}

export const receivingService = {
  createPurchaseOrder: (input: z.infer<typeof createPurchaseOrderSchema>) =>
    receivingRepository.createPurchaseOrder({
      poNumber: input.poNumber,
      supplierId: input.supplierId,
      expectedDate: input.expectedDate,
      notes: input.notes,
      lines: { create: input.lines.map((l) => ({ productId: l.productId, quantityOrdered: l.quantityOrdered })) },
    }),
  listPurchaseOrders: () => receivingRepository.listPurchaseOrders(),

  createAsn: (input: z.infer<typeof createAsnSchema>) =>
    receivingRepository.createAsn({
      asnNumber: input.asnNumber,
      supplierId: input.supplierId,
      purchaseOrderId: input.purchaseOrderId,
      expectedDate: input.expectedDate,
      lines: { create: input.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) },
    }),
  listAsns: () => receivingRepository.listAsns(),

  list: (params: Parameters<typeof receivingRepository.findMany>[0]) => receivingRepository.findMany(params),

  async get(id: number) {
    const receipt = await receivingRepository.findById(id);
    if (!receipt) throw new NotFoundError('Goods receipt');
    return receipt;
  },

  // "Receive with PO", "Receive with ASN" and "Receive without PO" are all
  // the same shape here — a receipt with lines, optionally anchored to a PO/ASN.
  async create(input: z.infer<typeof createGoodsReceiptSchema>, userId: number) {
    return receivingRepository.create({
      receiptNumber: input.receiptNumber,
      purchaseOrderId: input.purchaseOrderId,
      asnId: input.asnId,
      supplierId: input.supplierId,
      notes: input.notes,
      createdById: userId,
      lines: {
        create: input.lines.map((l) => ({ productId: l.productId, quantityExpected: l.quantityExpected })),
      },
    });
  },

  async start(id: number) {
    const receipt = await this.get(id);
    if (receipt.status !== 'WAITING') throw new BadRequestError('Only a waiting receipt can be started.');
    return receivingRepository.updateStatus(id, 'RECEIVING');
  },

  async updateLine(lineId: number, input: z.infer<typeof updateReceiptLineSchema>) {
    const line = await receivingRepository.findLine(lineId);
    if (!line) throw new NotFoundError('Receipt line');
    if (line.goodsReceipt.status !== 'RECEIVING' && line.goodsReceipt.status !== 'WAITING') {
      throw new BadRequestError('Receipt is not open for scanning.');
    }
    const { photoUrls, ...fields } = input;
    return receivingRepository.updateLine(lineId, {
      ...fields,
      ...(photoUrls ? { photos: { create: photoUrls.map((url) => ({ url })) } } : {}),
    });
  },

  async complete(id: number, userId: number) {
    const receipt = await this.get(id);
    if (receipt.status !== 'RECEIVING' && receipt.status !== 'WAITING') {
      throw new BadRequestError('Only a receipt in progress can be completed.');
    }

    for (const line of receipt.lines) {
      if (Number(line.quantityReceived) <= 0) continue;
      if (!line.locationId) {
        throw new BadRequestError(`Line for product ${line.product.sku} needs a staging location before completing.`);
      }
      const location = await prisma.location.findUniqueOrThrow({ where: { id: line.locationId } });

      let batchId: number | undefined;
      if (line.batchNumber) {
        const batch = await prisma.batch.upsert({
          where: { productId_batchNumber: { productId: line.productId, batchNumber: line.batchNumber } },
          update: { manufactureDate: line.manufactureDate, expiryDate: line.expiryDate, supplierId: receipt.supplierId ?? undefined },
          create: {
            productId: line.productId,
            batchNumber: line.batchNumber,
            manufactureDate: line.manufactureDate,
            expiryDate: line.expiryDate,
            supplierId: receipt.supplierId ?? undefined,
          },
        });
        batchId = batch.id;
      }

      let serialId: number | undefined;
      if (line.serialNumbers.length === 1) {
        const serial = await prisma.serialNumber.upsert({
          where: { productId_serialNumber: { productId: line.productId, serialNumber: line.serialNumbers[0] } },
          update: { status: 'IN_STOCK' },
          create: { productId: line.productId, serialNumber: line.serialNumbers[0], status: 'IN_STOCK' },
        });
        serialId = serial.id;
      }

      await applyMovement({
        type: 'RECEIPT',
        productId: line.productId,
        warehouseId: location.warehouseId,
        toLocationId: line.locationId,
        batchId,
        serialId,
        quantity: Number(line.quantityReceived),
        documentType: 'GoodsReceipt',
        documentId: receipt.id,
        reason: `Goods receipt ${receipt.receiptNumber}`,
        userId,
      });

      await prisma.putAwayTask.create({
        data: {
          goodsReceiptId: receipt.id,
          productId: line.productId,
          quantity: line.quantityReceived,
          suggestedLocationId: await suggestPutAwayLocation(location.warehouseId),
        },
      });
    }

    if (receipt.purchaseOrderId) {
      for (const line of receipt.lines) {
        await prisma.purchaseOrderLine.updateMany({
          where: { purchaseOrderId: receipt.purchaseOrderId, productId: line.productId },
          data: { quantityReceived: { increment: Number(line.quantityReceived) } },
        });
      }
    }

    return receivingRepository.updateStatus(id, 'COMPLETED', { completedAt: new Date() });
  },

  async reject(id: number) {
    const receipt = await this.get(id);
    if (receipt.status === 'COMPLETED') throw new BadRequestError('A completed receipt cannot be rejected.');
    return receivingRepository.updateStatus(id, 'REJECTED');
  },
};
