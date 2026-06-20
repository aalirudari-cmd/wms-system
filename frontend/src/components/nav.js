// Navigation model shared by the sidebar and the mobile bottom bar.
// `role` is the minimum role required to see the item.
export const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', role: 'worker', end: true },
  { to: '/scan', label: 'Scan', icon: 'scan', role: 'worker', primary: true },
  { to: '/inventory', label: 'Inventory', icon: 'layers', role: 'worker' },
  { to: '/products', label: 'Products', icon: 'box', role: 'worker' },
  { to: '/receiving', label: 'Receiving', icon: 'inbound', role: 'worker' },
  { to: '/shipping', label: 'Shipping', icon: 'outbound', role: 'worker' },
  { to: '/movements', label: 'Movements', icon: 'movements', role: 'worker' },
  { to: '/reports', label: 'Reports', icon: 'report', role: 'manager' },
  { to: '/users', label: 'Users', icon: 'users', role: 'admin' },
];

// Primary actions surfaced on the handheld bottom bar.
export const BOTTOM_NAV = ['/', '/inventory', '/scan', '/receiving', '/shipping'];
