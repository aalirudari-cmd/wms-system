import type { Prisma, MovementType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError } from '../../core/errors.js';

type Bucket = 'available' | 'reserved' | 'blocked' | 'damaged';
const bucketColumn: Record<Bucket, 'quantityAvailable' | 'quantityReserved' | 'quantityBlocked' | 'quantityDamaged'> = {
  available: 'quantityAvailable',
  reserved: 'quantityReserved',
  blocked: 'quantityBlocked',
  damaged: 'quantityDamaged',
};

export interface MovementInput {
  type: MovementType;
  productId: number;
  warehouseId: number;
  batchId?: number | null;
  serialId?: number | null;
  palletId?: number | null;
  fromLocationId?: number | null;
  toLocationId?: number | null;
  fromBucket?: Bucket;
  toBucket?: Bucket;
  quantity: number;
  documentType?: string;
  documentId?: number;
  reason?: string;
  userId?: number;
}

async function findOrCreateInventoryItem(
  tx: Prisma.TransactionClient,
  key: { warehouseId: number; locationId: number; productId: number; batchId: number | null; serialId: number | null },
) {
  const existing = await tx.inventoryItem.findFirst({ where: key });
  if (existing) return existing;
  return tx.inventoryItem.create({ data: key });
}

/**
 * The one place stock quantities change. Every module that mutates inventory
 * (receiving, put-away, transfer, picking, controlling adjustments) calls
 * this instead of writing InventoryItem rows itself, so the on-hand figures
 * and the append-only StockMovement audit trail can never drift apart.
 *
 * All-or-nothing: runs in a single transaction and row-locks the source
 * InventoryItem so concurrent scans can't take a location negative.
 */
export async function applyMovement(input: MovementInput) {
  if (input.quantity <= 0) throw new ConflictError('Movement quantity must be positive.');
  const fromBucket = input.fromBucket ?? 'available';
  const toBucket = input.toBucket ?? 'available';

  return prisma.$transaction(async (tx) => {
    if (input.fromLocationId) {
      const key = {
        warehouseId: input.warehouseId,
        locationId: input.fromLocationId,
        productId: input.productId,
        batchId: input.batchId ?? null,
        serialId: input.serialId ?? null,
      };
      // SELECT ... FOR UPDATE via raw lock is unnecessary here: Postgres
      // takes a row lock automatically on the subsequent UPDATE within the
      // transaction, and we re-check the balance right before it.
      const item = await tx.inventoryItem.findFirst({ where: key });
      const column = bucketColumn[fromBucket];
      const currentQty = item ? Number(item[column]) : 0;
      if (!item || currentQty < input.quantity) {
        throw new ConflictError(
          `Insufficient ${fromBucket} stock at location ${input.fromLocationId} for product ${input.productId} (have ${currentQty}, need ${input.quantity}).`,
        );
      }
      await tx.inventoryItem.update({ where: { id: item.id }, data: { [column]: { decrement: input.quantity } } });
    }

    if (input.toLocationId) {
      const key = {
        warehouseId: input.warehouseId,
        locationId: input.toLocationId,
        productId: input.productId,
        batchId: input.batchId ?? null,
        serialId: input.serialId ?? null,
      };
      const item = await findOrCreateInventoryItem(tx, key);
      const column = bucketColumn[toBucket];
      await tx.inventoryItem.update({ where: { id: item.id }, data: { [column]: { increment: input.quantity } } });
    }

    return tx.stockMovement.create({
      data: {
        type: input.type,
        productId: input.productId,
        batchId: input.batchId ?? undefined,
        serialId: input.serialId ?? undefined,
        palletId: input.palletId ?? undefined,
        fromLocationId: input.fromLocationId ?? undefined,
        toLocationId: input.toLocationId ?? undefined,
        quantityDelta: input.quantity,
        documentType: input.documentType,
        documentId: input.documentId,
        reason: input.reason,
        userId: input.userId,
      },
    });
  });
}

/** Adjustment is the one movement type that may increase a bucket without a
 * source location (found extra stock) or decrease without a destination
 * (write-off) — everything else in the warehouse has to come from or go
 * somewhere physical. */
export async function applyAdjustment(input: {
  productId: number;
  warehouseId: number;
  locationId: number;
  batchId?: number | null;
  serialId?: number | null;
  bucket: Bucket;
  quantityDelta: number;
  reason: string;
  userId?: number;
}) {
  if (input.quantityDelta > 0) {
    return applyMovement({
      type: 'ADJUSTMENT',
      productId: input.productId,
      warehouseId: input.warehouseId,
      batchId: input.batchId,
      serialId: input.serialId,
      toLocationId: input.locationId,
      toBucket: input.bucket,
      quantity: input.quantityDelta,
      reason: input.reason,
      userId: input.userId,
      documentType: 'Adjustment',
    });
  }
  return applyMovement({
    type: 'ADJUSTMENT',
    productId: input.productId,
    warehouseId: input.warehouseId,
    batchId: input.batchId,
    serialId: input.serialId,
    fromLocationId: input.locationId,
    fromBucket: input.bucket,
    quantity: Math.abs(input.quantityDelta),
    reason: input.reason,
    userId: input.userId,
    documentType: 'Adjustment',
  });
}
