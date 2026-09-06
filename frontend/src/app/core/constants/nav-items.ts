export interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
  { label: 'Sales', icon: 'pi pi-indian-rupee', route: '/sales' },
  { label: 'Expenses', icon: 'pi pi-wallet', route: '/expenses' },
  { label: 'Purchases', icon: 'pi pi-shopping-cart', route: '/purchases' },
  { label: 'Dealers', icon: 'pi pi-truck', route: '/dealers' },
  { label: 'Staff', icon: 'pi pi-users', route: '/staff' },
  { label: 'Attendance', icon: 'pi pi-calendar-check', route: '/attendance' },
  { label: 'Salary', icon: 'pi pi-money-bill', route: '/salary' },
  { label: 'Reports', icon: 'pi pi-chart-bar', route: '/reports' },
  { label: 'Daily Closing', icon: 'pi pi-lock', route: '/daily-closing' },
  { label: 'Settings', icon: 'pi pi-cog', route: '/settings', adminOnly: true }
];
