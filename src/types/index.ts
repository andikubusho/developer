export type UserRole = 'admin' | 'marketing' | 'owner';

export type LeadStatus = 'no respon' | 'low' | 'medium' | 'hot';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  description: string;
  total_units: number;
  status: 'planned' | 'ongoing' | 'completed';
  created_at: string;
}

export interface Unit {
  id: string;
  project_id: string;
  unit_number: string;
  type: string;
  price: number;
  status: 'available' | 'booked' | 'sold';
  project?: Project;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  identity_number: string;
}

export interface Lead {
  id: string;
  date: string;
  name: string;
  phone: string;
  source: string;
  status: LeadStatus;
  description: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  date_time: string;
  description: string;
  status: LeadStatus;
  lead?: Lead;
}

export interface Deposit {
  id: string;
  date: string;
  name: string;
  phone: string;
  amount: number;
  payment_type: 'cash' | 'bank';
  submission: string;
  description: string;
}

export interface Promo {
  id: string;
  name: string;
  valid_until: string;
  value: number;
  description: string;
}

export interface MarketingStaff {
  id: string;
  name: string;
  address: string;
  phone: string;
  position: string;
}

export interface MarketingSchedule {
  id: string;
  staff_id: string;
  date: string;
  position?: string;
  staff?: MarketingStaff;
}

export interface MarketingDocument {
  id: string;
  type: 'pricelist' | 'siteplan' | 'denah';
  name: string;
  file_url: string;
  created_at: string;
}

export interface Sale {
  id: string;
  unit_id: string;
  customer_id: string;
  marketing_id: string;
  supervisor?: string;
  manager?: string;
  makelar?: string;
  freelance?: string;
  total_price: number;
  discount: number;
  promo_id?: string;
  final_price: number;
  booking_fee: number;
  booking_fee_date: string;
  payment_method: 'cash' | 'kpr' | 'installment';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  sale_date: string;
  unit?: Unit;
  customer?: Customer;
  marketing?: Profile;
  promo?: Promo;
}

export interface Installment {
  id: string;
  sale_id: string;
  due_date: string;
  amount: number;
  status: 'unpaid' | 'paid' | 'overdue';
  paid_at?: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  installment_id?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  proof_url?: string;
  status: 'pending' | 'verified' | 'rejected';
  sale?: Sale;
}

export interface RAB {
  id: string;
  project_id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  description?: string;
  created_at: string;
}

export interface ConstructionProgress {
  id: string;
  project_id: string;
  unit_id?: string;
  percentage: number;
  description: string;
  photo_url?: string;
  report_date: string;
  created_by: string;
}

export interface PurchaseRequest {
  id: string;
  project_id: string;
  material_id: string;
  quantity: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'ordered';
  request_date: string;
  description?: string;
}

export interface SPK {
  id: string;
  spk_number: string;
  project_id: string;
  contractor_name: string;
  work_description: string;
  total_value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ProjectOpname {
  id: string;
  date: string;
  project_id: string;
  unit_id?: string;
  spk_id?: string;
  worker_name: string;
  work_description: string;
  previous_percentage: number;
  current_percentage: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  project?: Project;
  unit?: Unit;
  spk?: SPK;
}

export interface KPRDisbursement {
  id: string;
  sale_id: string;
  bank_name: string;
  amount: number;
  disbursement_date: string;
  stage: number; // e.g., 1 for 40%, 2 for 50%, 3 for 10%
  status: 'pending' | 'received';
  sale?: Sale;
}

export interface SupplierPayment {
  id: string;
  po_id?: string;
  spk_id?: string;
  supplier_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: 'pending' | 'paid';
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference_no?: string;
  items: {
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
  }[];
  created_at: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  division: string;
  position: string;
  join_date: string;
  status: 'active' | 'inactive';
  salary: number;
  email: string;
  phone: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'leave' | 'sick';
  employee?: Employee;
}

export interface Payroll {
  id: string;
  employee_id: string;
  period: string; // e.g., "2026-03"
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_date?: string;
  status: 'pending' | 'paid';
  employee?: Employee;
}

export interface Recruitment {
  id: string;
  position: string;
  candidate_name: string;
  email: string;
  phone: string;
  status: 'applied' | 'interview' | 'offered' | 'hired' | 'rejected';
  applied_date: string;
  resume_url?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  project_id: string;
  material_id: string;
  supplier: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'shipped' | 'received' | 'cancelled';
  order_date: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  module: string;
  description: string;
  timestamp: string;
  metadata?: any;
  user?: Profile;
}

export interface AuditStockItem {
  id: string;
  material_name: string;
  system_stock: number;
  physical_stock: number;
  difference: number;
  unit: string;
  last_audit: string;
  status: 'match' | 'mismatch';
}

export interface AuditCostItem {
  id: string;
  project_name: string;
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percent: number;
  status: 'safe' | 'warning' | 'danger';
}
