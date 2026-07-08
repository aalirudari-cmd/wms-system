import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Package, Warehouse, MapPin, Inbox, MoveRight, ClipboardList,
  Box, ShieldCheck, Users, History, FileBarChart, Settings, ScrollText, PackageCheck,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: string[];
}

export const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: ['dashboard:view'] },
  { to: '/admin/inventory', label: 'Inventory', icon: Box, permission: ['inventory:view'] },
  { to: '/admin/receiving', label: 'Receiving', icon: Inbox, permission: ['receiving:view'] },
  { to: '/admin/putaway', label: 'Put Away', icon: PackageCheck, permission: ['putaway:view'] },
  { to: '/admin/transfers', label: 'Transfers', icon: MoveRight, permission: ['transfers:view'] },
  { to: '/admin/picking', label: 'Picking', icon: ClipboardList, permission: ['picking:view'] },
  { to: '/admin/packing', label: 'Packing', icon: Package, permission: ['packing:view'] },
  { to: '/admin/controlling', label: 'Cycle Counts', icon: ShieldCheck, permission: ['controlling:view'] },
  { to: '/admin/movements', label: 'Movements', icon: History, permission: ['movements:view'] },
  { to: '/admin/products', label: 'Products', icon: Package, permission: ['masterdata:view'] },
  { to: '/admin/locations', label: 'Locations', icon: MapPin, permission: ['masterdata:view'] },
  { to: '/admin/master-data', label: 'Master Data', icon: Warehouse, permission: ['masterdata:view'] },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart, permission: ['reports:view'] },
  { to: '/admin/users', label: 'Users', icon: Users, permission: ['users:view'] },
  { to: '/admin/roles', label: 'Roles & Permissions', icon: Settings, permission: ['roles:view'] },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText, permission: ['audit:view'] },
];
