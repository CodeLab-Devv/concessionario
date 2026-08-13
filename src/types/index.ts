export type PresenceStatus =
  | 'available'
  | 'inactive'
  | 'busy'
  | 'dnd'
  | 'absent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'director' | 'vice_director' | 'employee' | 'probation';
  employeeType?: 'dealer';
  isOnService?: boolean;
  presenceStatus?: PresenceStatus;
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
  presenceStatus?: PresenceStatus;
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
  userId: string | null;
  action: string;
  details: string;
  timestamp: string;
  targetUserId?: string | null;
  created_at?: string;
  tableName?: string | null;
  recordId?: string | null;
  metadata?: Record<string, unknown> | null;
  actor?: {
    id: string;
    name: string;
    role: User['role'];
    avatar_url?: string | null;
  } | null;
  target?: {
    id: string;
    name: string;
    role: User['role'];
    avatar_url?: string | null;
  } | null;
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
  setPresenceStatus?: (status: PresenceStatus) => Promise<boolean>;
  resetAllData?: () => Promise<boolean>;
  employees?: User[];
  fetchEmployeesStatus?: () => Promise<User[]>;
}
