// Comprehensive TypeScript interfaces for The Autoglow Sikkim ERP & CRM

export type UserRole = 'super_admin' | 'manager' | 'accountant' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar_url?: string;
  is_active: number;
  pin?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_model?: string;
  service_requested?: string;
  message?: string;
  status: string;
  created_at: string;
}

export interface BusinessSettings {
  business_name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  currency_symbol: string;
  date_format: string;
  timezone: string;
  default_gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  invoice_prefix: string;
  job_card_prefix: string;
  customer_prefix: string;
  vehicle_prefix: string;
  warranty_prefix: string;
  po_prefix: string;
}

export type CustomerCategory = 'Regular' | 'VIP' | 'Fleet' | 'Premium';
export type CustomerStatus = 'Active' | 'Inactive' | 'Blacklisted';

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  mobile: string;
  alt_mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  category: CustomerCategory;
  remarks?: string;
  status: CustomerStatus;
  total_spent: number;
  visit_count: number;
  created_at: string;
  updated_at: string;
  vehicles?: Vehicle[];
}

export type VehicleCategory = 'Hatchback' | 'Sedan' | 'SUV' | 'Luxury' | 'Premium' | 'Other';
export type FuelType = 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'CNG';

export interface Vehicle {
  id: string;
  vehicle_code: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  reg_number: string;
  make: string;
  model: string;
  variant?: string;
  category: VehicleCategory;
  color: string;
  fuel_type: FuelType;
  year: number;
  remarks?: string;
  odometer: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
}

export interface ServicePriceByCategory {
  Hatchback?: number;
  Sedan?: number;
  SUV?: number;
  Luxury?: number;
  Premium?: number;
  Other?: number;
}

export interface Service {
  id: string;
  service_code: string;
  category_id: string;
  category_name?: string;
  name: string;
  description?: string;
  standard_price: number;
  pricing_by_category?: ServicePriceByCategory;
  duration_mins: number;
  required_consumables?: Array<{ product_id: string; product_name: string; quantity: number; unit: string }>;
  warranty_duration_days: number;
  maintenance_interval_days: number;
  is_active: number;
  created_at: string;
}

export type BayStatus = 'Available' | 'Occupied' | 'Under Maintenance';
export interface ServiceBay {
  id: string;
  name: string;
  bay_type: string;
  is_active: number;
  current_status: BayStatus;
  current_job_id?: string;
  current_vehicle_reg?: string;
}

export type AppointmentStatus =
  | 'Requested'
  | 'Confirmed'
  | 'Vehicle Received'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled';

export interface Appointment {
  id: string;
  booking_code: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  vehicle_id: string;
  vehicle_reg?: string;
  vehicle_model?: string;
  bay_id?: string;
  bay_name?: string;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  appointment_date: string;
  appointment_time: string;
  expected_end_time?: string;
  estimated_amount: number;
  status: AppointmentStatus;
  customer_instructions?: string;
  remarks?: string;
  services?: Service[];
  created_at: string;
  updated_at: string;
}

export type JobCardStatus =
  | 'Vehicle Received'
  | 'Work in Progress'
  | 'Quality Check'
  | 'Completed'
  | 'Delivered'
  | 'Cancelled';

export interface JobCard {
  id: string;
  job_card_number: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  vehicle_id: string;
  vehicle_reg?: string;
  vehicle_make_model?: string;
  appointment_id?: string;
  bay_id?: string;
  bay_name?: string;
  primary_staff_id?: string;
  primary_staff_name?: string;
  status: JobCardStatus;
  odometer_in: number;
  fuel_level: string; // e.g., '1/4', '1/2', '3/4', 'Full'
  remarks?: string;
  work_notes?: string;
  estimated_completion?: string;
  actual_completion?: string;
  services?: JobCardService[];
  inspections?: VehicleInspection[];
  consumables?: StockConsumption[];
  invoice?: Invoice;
  created_at: string;
  updated_at: string;
}

export interface JobCardService {
  id: string;
  job_card_id: string;
  service_id: string;
  service_name: string;
  price: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

export interface VehicleInspection {
  id: string;
  job_card_id: string;
  inspection_type: 'intake' | 'post_service';
  scratches: string[];
  dents: string[];
  paint_condition: string;
  interior_condition: string;
  wheel_condition: string;
  glass_condition: string;
  accessories_checked: string[];
  photos: string[];
  customer_acknowledged: number;
  customer_signature?: string;
  inspector_id?: string;
  inspector_name?: string;
  notes?: string;
  created_at: string;
}

export type InvoicePaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded' | 'Cancelled';

export interface Invoice {
  id: string;
  invoice_number: string;
  job_card_id: string;
  job_card_number?: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_address?: string;
  vehicle_id: string;
  vehicle_reg?: string;
  vehicle_details?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: InvoicePaymentStatus;
  notes?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'product' | 'custom';
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Debit/Credit Card' | 'Bank Transfer' | 'Other';

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  payment_date: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export type WarrantyStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Claim Raised' | 'Claim Resolved' | 'Voided';

export interface Warranty {
  id: string;
  certificate_number: string;
  job_card_id: string;
  invoice_id: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  vehicle_id: string;
  vehicle_reg?: string;
  vehicle_details?: string;
  service_id: string;
  service_name: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  coverage_details: string;
  terms_and_conditions: string;
  status: WarrantyStatus;
  photos?: string[];
  claims?: WarrantyClaim[];
  created_at: string;
}

export interface WarrantyClaim {
  id: string;
  warranty_id: string;
  claim_date: string;
  complaint: string;
  inspection_findings?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved';
  resolution?: string;
  repair_cost: number;
  inspector_id?: string;
  inspector_name?: string;
  resolved_at?: string;
  created_at: string;
}

export type ReminderStatus = 'Upcoming' | 'Due Today' | 'Overdue' | 'Completed' | 'Snoozed';

export interface ServiceReminder {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  vehicle_id: string;
  vehicle_reg?: string;
  vehicle_details?: string;
  service_id: string;
  service_name: string;
  last_service_date: string;
  next_due_date: string;
  recommended_odometer?: number;
  reminder_type: 'time_based' | 'kms_based';
  status: ReminderStatus;
  last_notified_at?: string;
  notes?: string;
  created_at: string;
}

export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave' | 'Terminated';

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  mobile: string;
  email: string;
  designation: string;
  department: string;
  joining_date: string;
  monthly_salary: number;
  employment_type: 'Full-time' | 'Part-time' | 'Contract';
  emergency_contact?: string;
  address?: string;
  photo_url?: string;
  status: EmployeeStatus;
  created_at: string;
}

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Half Day'
  | 'Paid Leave'
  | 'Unpaid Leave'
  | 'Weekly Off'
  | 'Holiday';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  working_hours?: number;
  late_minutes?: number;
  overtime_hours?: number;
  remarks?: string;
  created_at: string;
}

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Emergency Leave' | 'Unpaid Leave';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveApplication {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  approved_by?: string;
  approval_remarks?: string;
  applied_at: string;
  decided_at?: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  leave_type: LeaveType;
  annual_entitlement: number;
  consumed_days: number;
  remaining_days: number;
}

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  supplier_id?: string;
  supplier_name?: string;
  storage_location?: string;
  batch_number?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  product_name?: string;
  transaction_type: 'Purchase' | 'Issue' | 'Consumption' | 'Adjustment' | 'Damaged' | 'Return';
  quantity: number;
  unit_price: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface StockConsumption {
  id: string;
  job_card_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  recorded_at: string;
}

export type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Maintenance Required' | 'Damaged';
export type AssetStatus = 'Available' | 'In Use' | 'Under Maintenance' | 'Damaged' | 'Retired' | 'Disposed';

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  brand: string;
  model?: string;
  serial_number?: string;
  purchase_date: string;
  purchase_price: number;
  supplier_id?: string;
  supplier_name?: string;
  warranty_expiry?: string;
  location: string;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  condition: AssetCondition;
  status: AssetStatus;
  photo_url?: string;
  created_at: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  asset_name?: string;
  maintenance_date: string;
  maintenance_type: string;
  service_provider: string;
  cost: number;
  next_service_due?: string;
  remarks?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  products_supplied?: string;
  payment_terms?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'Paid' | 'Partially Paid' | 'Unpaid';
  status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
  notes?: string;
  items?: PurchaseItem[];
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Expense {
  id: string;
  expense_number: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  vendor?: string;
  invoice_ref?: string;
  recorded_by: string;
  created_at: string;
}

export interface LoyaltyAccount {
  id: string;
  customer_id: string;
  customer_name?: string;
  points_balance: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  total_points_earned: number;
  total_points_redeemed: number;
  referral_code: string;
  referred_by_customer_id?: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: 'appointment' | 'payment' | 'inventory' | 'warranty' | 'reminder' | 'staff' | 'asset';
  link_url?: string;
  is_read: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}
