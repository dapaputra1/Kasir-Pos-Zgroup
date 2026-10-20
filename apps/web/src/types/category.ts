export interface Category {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  _count?: {
    products: number;
  };
}
