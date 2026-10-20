export type UserRole = 'OWNER' | 'ADMIN' | 'CASHIER' | 'WAREHOUSE';

export interface UserStaff {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
    purchases: number;
  };
}
