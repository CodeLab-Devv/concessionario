export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation';
  employeeType?: 'dealer';
  isOnService?: boolean;
  lastServiceStatusChange?: string;
  createdAt: string;
  avatar_url?: string;
  availability?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation';
  employeeType?: 'dealer';
  department: string;
  hireDate: string;
  totalSales: number;
  isOnService?: boolean;
  lastServiceStatusChange?: string;
  avatar_url?: string;
  availability?: string;
}

export interface Sale {
  id: string;
  employeeId: string;
  employeeName: string;
  itemName: string;
  carModel?: string;
  price: number;
  quantity: number;
  total: number;
  date: string;
  type: 'sale';
  category: 'concessionari';
  discountType?: 'employee' | 'collaboration';
  created_at: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  targetUserId?: string;
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, name: string) => Promise<{success: boolean, message?: string, needsEmailConfirmation?: boolean}>;

  registerOwner: (email: string, password: string, name: string, ownerKey?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUserProfile?: () => Promise<boolean>;
  updateUserRole?: (userId: string, newRole: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation') => Promise<boolean>;
  fireEmployee?: (userId: string) => Promise<boolean>;
  toggleServiceStatus?: (userId?: string) => Promise<boolean>;
  resetAllData?: () => Promise<boolean>;
  employees?: User[];
  fetchEmployeesStatus?: () => Promise<User[]>;
}
