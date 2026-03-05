
export type Role = 'admin' | 'staff';

export interface Staff {
  id: string;
  name: string;
  role: string;
  password?: string;
  avatar: string;
  permissions: string[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  remarks: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  customerId: string | null;
  customerName: string;
  staffId: string;
  projectName: string;
  startTime: string; // ISO string
  startHour: number; // 8-22
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  note?: string;
}

export interface Transaction {
  id: string;
  type: 'consume' | 'recharge';
  customerId: string | null;
  customerName: string;
  amount: number;
  paymentMethod: 'balance' | 'cash' | 'wechat' | 'alipay';
  itemName: string;
  staffId?: string;
  timestamp: string;
}

export interface SystemLog {
  id: string;
  operator: string;
  action: string;
  detail: string;
  timestamp: string;
  undoData?: {
    type: 'add_customer' | 'recharge' | 'consume' | 'add_appt' | 'update_appt';
    targetId: string;
    secondaryId?: string; // 用于存放关联的 ID，如交易关联的客户 ID
    amount?: number;       // 用于财务撤销
    prevStatus?: string;   // 用于状态撤销
    paymentMethod?: string;
  };
  isRevoked?: boolean;
}
