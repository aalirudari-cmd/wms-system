import { PrismaClient, LocationType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ROLE_SEEDS } from '../src/core/permissions.js';
import { env } from '../src/config/env.js';

const prisma = new PrismaClient();

async function seedPermissionsAndRoles() {
  for (const [key, module, description] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { module, description },
      create: { key, module, description },
    });
  }

  for (const roleSeed of ROLE_SEEDS) {
    const role = await prisma.role.upsert({
      where: { name: roleSeed.name },
      update: { description: roleSeed.description, isSystem: true },
      create: { name: roleSeed.name, description: roleSeed.description, isSystem: true },
    });

    const permissions = await prisma.permission.findMany({ where: { key: { in: roleSeed.permissions } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions and ${ROLE_SEEDS.length} roles.`);
}

async function seedAdmin() {
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } });
  const existing = await prisma.user.findUnique({ where: { username: env.seed.adminUsername } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.seed.adminPassword, 10);
  await prisma.user.create({
    data: {
      username: env.seed.adminUsername,
      email: env.seed.adminEmail,
      passwordHash,
      fullName: 'System Administrator',
      roleId: adminRole.id,
    },
  });
  console.log(`Seeded admin user "${env.seed.adminUsername}".`);
}

async function seedUnits() {
  const units = [
    ['EA', 'Each'],
    ['BOX', 'Box'],
    ['PLT', 'Pallet'],
    ['ROLL', 'Roll'],
    ['KG', 'Kilogram'],
  ];
  for (const [code, name] of units) {
    await prisma.unit.upsert({ where: { code }, update: { name }, create: { code, name } });
  }
}

async function seedDemoData() {
  if (!env.seed.demo) return;
  const productCount = await prisma.product.count();
  if (productCount > 0) return;

  const [managerRole, workerRole, pickerRole, controllerRole] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: 'Warehouse Manager' } }),
    prisma.role.findUniqueOrThrow({ where: { name: 'Warehouse Operator' } }),
    prisma.role.findUniqueOrThrow({ where: { name: 'Picker' } }),
    prisma.role.findUniqueOrThrow({ where: { name: 'Controller' } }),
  ]);

  const demoUsers = [
    ['manager', 'manager@stockhaus.local', 'manager123', 'Warehouse Manager Demo', managerRole.id],
    ['operator', 'operator@stockhaus.local', 'operator123', 'Warehouse Operator Demo', workerRole.id],
    ['picker', 'picker@stockhaus.local', 'picker123', 'Picker Demo', pickerRole.id],
    ['controller', 'controller@stockhaus.local', 'controller123', 'Controller Demo', controllerRole.id],
  ] as const;
  for (const [username, email, password, fullName, roleId] of demoUsers) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) continue;
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { username, email, passwordHash, fullName, roleId } });
  }

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH1' },
    update: {},
    create: { code: 'WH1', name: 'Main Distribution Center', address: '1 Logistics Way' },
  });

  const zone = await prisma.location.create({
    data: { warehouseId: warehouse.id, parentId: null, code: 'WH1-ZONE-A', name: 'Zone A', type: LocationType.ZONE },
  });
  const aisle = await prisma.location.create({
    data: { warehouseId: warehouse.id, parentId: zone.id, code: 'WH1-A-01', name: 'Aisle 01', type: LocationType.AISLE },
  });
  const rack = await prisma.location.create({
    data: { warehouseId: warehouse.id, parentId: aisle.id, code: 'WH1-A-01-R1', name: 'Rack 1', type: LocationType.RACK },
  });
  const bins = await Promise.all(
    ['BIN-01', 'BIN-02', 'BIN-03'].map((suffix, i) =>
      prisma.location.create({
        data: {
          warehouseId: warehouse.id,
          parentId: rack.id,
          code: `WH1-A-01-R1-${suffix}`,
          name: `Bin ${i + 1}`,
          type: LocationType.BIN,
          barcode: `WH1A01R1${suffix}`,
          capacity: 500,
        },
      }),
    ),
  );
  const receivingDock = await prisma.location.create({
    data: { warehouseId: warehouse.id, parentId: null, code: 'WH1-RECV', name: 'Receiving Dock', type: LocationType.AREA },
  });
  const shippingDock = await prisma.location.create({
    data: { warehouseId: warehouse.id, parentId: null, code: 'WH1-SHIP', name: 'Shipping Dock', type: LocationType.AREA },
  });

  const category = await prisma.category.create({ data: { name: 'General' } });
  const brand = await prisma.brand.create({ data: { name: 'Generic' } });
  const supplier = await prisma.supplier.create({
    data: { code: 'SUP-001', name: 'Acme Supply Co.', email: 'orders@acmesupply.example' },
  });
  const customer = await prisma.customer.create({
    data: { code: 'CUST-001', name: 'Retail Partner Ltd.', email: 'purchasing@retailpartner.example' },
  });
  const eaUnit = await prisma.unit.findUniqueOrThrow({ where: { code: 'EA' } });

  const productSeeds = [
    ['SKU-1001', '5012345678900', 'Heavy-Duty Pallet Wrap', 20],
    ['SKU-1002', '5012345678917', 'Corrugated Box · Medium', 100],
    ['SKU-2001', '5012345678924', 'Cordless Drill 18V', 5],
    ['SKU-2002', '5012345678931', 'Safety Helmet · Hi-Vis', 15],
    ['SKU-3001', '5012345678948', 'Thermal Label Roll', 30],
  ] as const;

  for (const [sku, barcode, name, reorderPoint] of productSeeds) {
    const product = await prisma.product.create({
      data: { sku, barcode, name, categoryId: category.id, brandId: brand.id, unitId: eaUnit.id, reorderPoint },
    });
    const bin = bins[product.id % bins.length];
    const quantity = 10 + ((product.id * 7) % 60);
    await prisma.inventoryItem.create({
      data: { warehouseId: warehouse.id, locationId: bin.id, productId: product.id, quantityAvailable: quantity },
    });
    await prisma.stockMovement.create({
      data: {
        type: 'ADJUSTMENT',
        productId: product.id,
        toLocationId: bin.id,
        quantityDelta: quantity,
        reason: 'Initial stock seed',
        documentType: 'Seed',
      },
    });
  }

  console.log('Seeded demo warehouse, locations, master data and stock.');
  void receivingDock;
  void shippingDock;
  void customer;
}

async function main() {
  await seedPermissionsAndRoles();
  await seedUnits();
  await seedAdmin();
  await seedDemoData();
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
