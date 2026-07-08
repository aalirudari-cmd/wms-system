// Canonical permission catalog. Seeded into the `permissions` table on first
// run; roles are just named subsets of this list (see prisma/seed.ts). Adding
// a new permission here and re-seeding is how a new module plugs into RBAC.

export const PERMISSIONS = [
  ['dashboard:view', 'dashboard', 'View dashboard KPIs and activity feed'],
  ['users:view', 'users', 'View user accounts'],
  ['users:manage', 'users', 'Create, edit, deactivate user accounts'],
  ['roles:view', 'roles', 'View roles and permissions'],
  ['roles:manage', 'roles', 'Edit role permission assignments'],
  ['masterdata:view', 'masterdata', 'View products, suppliers, customers, warehouses, locations'],
  ['masterdata:manage', 'masterdata', 'Create/edit products, suppliers, customers, warehouses, locations'],
  ['inventory:view', 'inventory', 'View current stock levels'],
  ['inventory:adjust', 'inventory', 'Manually adjust stock quantities'],
  ['receiving:view', 'receiving', 'View goods receipts'],
  ['receiving:create', 'receiving', 'Create purchase orders / ASNs / goods receipts'],
  ['receiving:process', 'receiving', 'Scan and record received quantities'],
  ['receiving:complete', 'receiving', 'Complete or reject a goods receipt'],
  ['putaway:view', 'putaway', 'View put-away tasks'],
  ['putaway:confirm', 'putaway', 'Confirm put-away of received stock'],
  ['transfers:view', 'transfers', 'View internal transfers'],
  ['transfers:create', 'transfers', 'Create internal transfers'],
  ['transfers:approve', 'transfers', 'Approve internal transfers'],
  ['transfers:complete', 'transfers', 'Scan and complete internal transfers'],
  ['picking:view', 'picking', 'View picking lists and waves'],
  ['picking:create', 'picking', 'Create picking lists / waves'],
  ['picking:pick', 'picking', 'Scan and confirm picks'],
  ['packing:view', 'packing', 'View packages'],
  ['packing:pack', 'packing', 'Pack orders and close packages'],
  ['controlling:view', 'controlling', 'View cycle counts'],
  ['controlling:count', 'controlling', 'Perform stock counts'],
  ['controlling:approve', 'controlling', 'Approve or reject cycle count results'],
  ['movements:view', 'movements', 'View stock movement history'],
  ['reports:view', 'reports', 'View reports'],
  ['reports:export', 'reports', 'Export reports (CSV/Excel/PDF)'],
  ['audit:view', 'audit', 'View audit logs'],
  ['settings:manage', 'settings', 'Manage warehouse and system settings'],
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number][0];

const ALL: PermissionKey[] = PERMISSIONS.map((p) => p[0]) as PermissionKey[];
const view = (...keys: string[]) => keys as PermissionKey[];

export const ROLE_SEEDS: { name: string; description: string; permissions: PermissionKey[] }[] = [
  {
    name: 'Admin',
    description: 'Full system access.',
    permissions: ALL,
  },
  {
    name: 'Warehouse Manager',
    description: 'Runs day-to-day warehouse operations and reporting.',
    permissions: ALL.filter((p) => !p.startsWith('users:') && !p.startsWith('roles:') && p !== 'settings:manage'),
  },
  {
    name: 'Supervisor',
    description: 'Oversees floor operations; can approve transfers and counts.',
    permissions: view(
      'dashboard:view', 'masterdata:view', 'inventory:view', 'inventory:adjust',
      'receiving:view', 'receiving:create', 'receiving:process', 'receiving:complete',
      'putaway:view', 'putaway:confirm',
      'transfers:view', 'transfers:create', 'transfers:approve', 'transfers:complete',
      'picking:view', 'picking:create', 'picking:pick',
      'packing:view', 'packing:pack',
      'controlling:view', 'controlling:count', 'controlling:approve',
      'movements:view', 'reports:view', 'reports:export',
    ),
  },
  {
    name: 'Warehouse Operator',
    description: 'Receives, puts away and transfers stock on the floor.',
    permissions: view(
      'dashboard:view', 'masterdata:view', 'inventory:view',
      'receiving:view', 'receiving:create', 'receiving:process',
      'putaway:view', 'putaway:confirm',
      'transfers:view', 'transfers:create', 'transfers:complete',
      'movements:view',
    ),
  },
  {
    name: 'Picker',
    description: 'Picks orders from the picking list.',
    permissions: view('dashboard:view', 'inventory:view', 'picking:view', 'picking:pick', 'packing:view', 'packing:pack'),
  },
  {
    name: 'Controller',
    description: 'Verifies stock accuracy via cycle counts.',
    permissions: view('dashboard:view', 'inventory:view', 'controlling:view', 'controlling:count', 'controlling:approve', 'movements:view'),
  },
  {
    name: 'Viewer',
    description: 'Read-only access across the system.',
    permissions: ALL.filter((p) => p.endsWith(':view')),
  },
];
