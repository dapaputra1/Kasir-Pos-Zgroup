export type Role = 'OWNER' | 'ADMIN' | 'CASHIER' | 'WAREHOUSE';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}
