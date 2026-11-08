import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'autoglow.db');

// Global DB instance for Next.js hot reload safety
declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: Database.Database | undefined;
}

function getDatabase(): Database.Database {
  if (!global.__dbInstance) {
    global.__dbInstance = new Database(dbPath);
    global.__dbInstance.pragma('journal_mode = WAL');
    global.__dbInstance.pragma('foreign_keys = ON');
    initSchema(global.__dbInstance);
  }
  return global.__dbInstance;
}

export const db = getDatabase();

function initSchema(database: Database.Database) {
  database.exec(`
    -- 1. Users & Roles
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      phone TEXT,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      password_hash TEXT,
      pin TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions_json TEXT
    );

    -- 2. Business Settings
    CREATE TABLE IF NOT EXISTS business_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 3. Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      alt_mobile TEXT,
      email TEXT,
      address TEXT,
      city TEXT DEFAULT 'Gangtok',
      category TEXT DEFAULT 'Regular',
      remarks TEXT,
      status TEXT DEFAULT 'Active',
      total_spent REAL DEFAULT 0,
      visit_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 4. Vehicles
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      vehicle_code TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      reg_number TEXT UNIQUE NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT,
      category TEXT NOT NULL DEFAULT 'SUV',
      color TEXT NOT NULL,
      fuel_type TEXT DEFAULT 'Petrol',
      year INTEGER,
      remarks TEXT,
      odometer INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    -- 5. Service Categories & Services
    CREATE TABLE IF NOT EXISTS service_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      service_code TEXT UNIQUE NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      standard_price REAL NOT NULL DEFAULT 0,
      pricing_by_category_json TEXT,
      duration_mins INTEGER DEFAULT 120,
      required_consumables_json TEXT,
      warranty_duration_days INTEGER DEFAULT 0,
      maintenance_interval_days INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES service_categories(id)
    );

    -- 6. Service Bays
    CREATE TABLE IF NOT EXISTS service_bays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bay_type TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      current_status TEXT DEFAULT 'Available',
      current_job_id TEXT,
      current_vehicle_reg TEXT
    );

    -- 7. Appointments / Bookings
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      booking_code TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      bay_id TEXT,
      assigned_staff_id TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      expected_end_time TEXT,
      estimated_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Confirmed',
      customer_instructions TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (bay_id) REFERENCES service_bays(id)
    );

    CREATE TABLE IF NOT EXISTS appointment_services (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      price REAL DEFAULT 0,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    -- 8. Job Cards
    CREATE TABLE IF NOT EXISTS job_cards (
      id TEXT PRIMARY KEY,
      job_card_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      appointment_id TEXT,
      bay_id TEXT,
      primary_staff_id TEXT,
      status TEXT DEFAULT 'Vehicle Received',
      odometer_in INTEGER DEFAULT 0,
      fuel_level TEXT DEFAULT '1/2',
      remarks TEXT,
      work_notes TEXT,
      estimated_completion TEXT,
      actual_completion TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (bay_id) REFERENCES service_bays(id)
    );

    CREATE TABLE IF NOT EXISTS job_card_services (
      id TEXT PRIMARY KEY,
      job_card_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      price REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      notes TEXT,
      FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS job_assignments (
      id TEXT PRIMARY KEY,
      job_card_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      role_in_job TEXT DEFAULT 'Detailer',
      assigned_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicle_inspections (
      id TEXT PRIMARY KEY,
      job_card_id TEXT NOT NULL,
      inspection_type TEXT DEFAULT 'intake',
      scratches_json TEXT,
      dents_json TEXT,
      paint_condition TEXT DEFAULT 'Fair',
      interior_condition TEXT DEFAULT 'Clean',
      wheel_condition TEXT DEFAULT 'Good',
      glass_condition TEXT DEFAULT 'Good',
      accessories_checked_json TEXT,
      photos_json TEXT,
      customer_acknowledged INTEGER DEFAULT 1,
      customer_signature TEXT,
      inspector_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE
    );

    -- 9. Billing, Invoices & Payments
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      job_card_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      taxable_value REAL NOT NULL DEFAULT 0,
      gst_rate REAL DEFAULT 18,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'Unpaid',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_card_id) REFERENCES job_cards(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      item_type TEXT DEFAULT 'service',
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT UNIQUE NOT NULL,
      invoice_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_ref TEXT,
      payment_date TEXT NOT NULL,
      notes TEXT,
      recorded_by TEXT DEFAULT 'Staff',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS payment_adjustments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      adjustment_type TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      authorized_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    -- 10. Warranties & Claims
    CREATE TABLE IF NOT EXISTS warranties (
      id TEXT PRIMARY KEY,
      certificate_number TEXT UNIQUE NOT NULL,
      job_card_id TEXT,
      invoice_id TEXT,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      service_id TEXT,
      service_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_months INTEGER DEFAULT 12,
      coverage_details TEXT,
      terms_and_conditions TEXT,
      status TEXT DEFAULT 'Active',
      photos_json TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_card_id) REFERENCES job_cards(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS warranty_claims (
      id TEXT PRIMARY KEY,
      warranty_id TEXT NOT NULL,
      claim_date TEXT NOT NULL,
      complaint TEXT NOT NULL,
      inspection_findings TEXT,
      status TEXT DEFAULT 'Pending',
      resolution TEXT,
      repair_cost REAL DEFAULT 0,
      inspector_id TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (warranty_id) REFERENCES warranties(id) ON DELETE CASCADE
    );

    -- 11. Service Reminders
    CREATE TABLE IF NOT EXISTS service_reminders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      last_service_date TEXT NOT NULL,
      next_due_date TEXT NOT NULL,
      recommended_odometer INTEGER,
      reminder_type TEXT DEFAULT 'time_based',
      status TEXT DEFAULT 'Upcoming',
      last_notified_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    -- 12. Employees, Attendance & Leave
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      joining_date TEXT NOT NULL,
      monthly_salary REAL DEFAULT 0,
      employment_type TEXT DEFAULT 'Full-time',
      emergency_contact TEXT,
      address TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      attendance_date TEXT NOT NULL,
      status TEXT DEFAULT 'Present',
      check_in TEXT,
      check_out TEXT,
      working_hours REAL DEFAULT 8.0,
      late_minutes INTEGER DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(employee_id, attendance_date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leave_applications (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      approved_by TEXT,
      approval_remarks TEXT,
      applied_at TEXT DEFAULT (datetime('now', 'localtime')),
      decided_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leave_balances (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      annual_entitlement INTEGER DEFAULT 12,
      consumed_days INTEGER DEFAULT 0,
      remaining_days INTEGER DEFAULT 12,
      UNIQUE(employee_id, year, leave_type),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- 13. Inventory & Stock
    CREATE TABLE IF NOT EXISTS inventory_products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      unit TEXT DEFAULT 'bottle',
      purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      current_stock REAL DEFAULT 0,
      min_stock_level REAL DEFAULT 5,
      supplier_id TEXT,
      storage_location TEXT,
      batch_number TEXT,
      expiry_date TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS stock_transactions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL DEFAULT 0,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      recorded_by TEXT DEFAULT 'Admin',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (product_id) REFERENCES inventory_products(id)
    );

    CREATE TABLE IF NOT EXISTS stock_consumptions (
      id TEXT PRIMARY KEY,
      job_card_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      recorded_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (job_card_id) REFERENCES job_cards(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES inventory_products(id)
    );

    -- 14. Fixed Assets & Maintenance
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      asset_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT,
      serial_number TEXT,
      purchase_date TEXT NOT NULL,
      purchase_price REAL DEFAULT 0,
      supplier_id TEXT,
      warranty_expiry TEXT,
      location TEXT DEFAULT 'Shop Floor',
      assigned_employee_id TEXT,
      condition TEXT DEFAULT 'Good',
      status TEXT DEFAULT 'Available',
      photo_url TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS asset_maintenance (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      maintenance_date TEXT NOT NULL,
      maintenance_type TEXT NOT NULL,
      service_provider TEXT NOT NULL,
      cost REAL DEFAULT 0,
      next_service_due TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS asset_movements (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      from_location TEXT,
      to_location TEXT,
      from_employee_id TEXT,
      to_employee_id TEXT,
      movement_date TEXT NOT NULL,
      remarks TEXT,
      recorded_by TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );

    -- 15. Suppliers & Purchase Orders
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      supplier_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      address TEXT,
      gstin TEXT,
      products_supplied TEXT,
      payment_terms TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'Unpaid',
      status TEXT DEFAULT 'Received',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES inventory_products(id)
    );

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_ref TEXT,
      payment_date TEXT NOT NULL,
      notes TEXT,
      recorded_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- 16. Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT UNIQUE NOT NULL,
      expense_date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      vendor TEXT,
      invoice_ref TEXT,
      recorded_by TEXT DEFAULT 'Staff',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 17. Loyalty & Retention
    CREATE TABLE IF NOT EXISTS loyalty_accounts (
      id TEXT PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL,
      points_balance INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'Silver',
      total_points_earned INTEGER DEFAULT 0,
      total_points_redeemed INTEGER DEFAULT 0,
      referral_code TEXT UNIQUE,
      referred_by_customer_id TEXT,
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      type TEXT NOT NULL,
      points INTEGER NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      discount_type TEXT DEFAULT 'percentage',
      discount_value REAL NOT NULL,
      min_spend REAL DEFAULT 0,
      max_discount REAL DEFAULT 1000,
      valid_from TEXT,
      valid_to TEXT,
      usage_limit INTEGER DEFAULT 100,
      times_used INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    -- 18. Communications & Notifications
    CREATE TABLE IF NOT EXISTS customer_communications (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      template_type TEXT NOT NULL,
      channel TEXT DEFAULT 'whatsapp',
      recipient TEXT NOT NULL,
      message_content TEXT NOT NULL,
      status TEXT DEFAULT 'Sent',
      sent_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL,
      link_url TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      vehicle_model TEXT,
      service_requested TEXT,
      message TEXT,
      status TEXT DEFAULT 'New',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Check if initial seeding is needed
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedInitialData(database);
  }
}

function seedInitialData(database: Database.Database) {
  // Business Settings
  const defaultSettings: [string, string][] = [
    ['business_name', 'The Autoglow Sikkim'],
    ['tagline', 'Premium Detailing & Surface Protection Studio'],
    ['address', 'National Highway 10, Near Deorali'],
    ['city', 'Gangtok'],
    ['state', 'Sikkim'],
    ['pincode', '737101'],
    ['phone', '+91 98320 12345'],
    ['email', 'operations@theautoglow.in'],
    ['website', 'https://theautoglow.in'],
    ['gstin', '11AAACT9876E1Z5'],
    ['currency_symbol', '₹'],
    ['date_format', 'DD-MM-YYYY'],
    ['timezone', 'Asia/Kolkata'],
    ['default_gst_rate', '18'],
    ['cgst_rate', '9'],
    ['sgst_rate', '9'],
    ['invoice_prefix', 'INV-AGS-'],
    ['job_card_prefix', 'JC-AGS-'],
    ['customer_prefix', 'CUST-'],
    ['vehicle_prefix', 'VEH-'],
    ['warranty_prefix', 'WAR-AGS-'],
    ['po_prefix', 'PO-AGS-'],
    ['super_admin_pin', '4656'],
    ['super_admin_name', 'Abhinay'],
    ['manager_pin', '1111'],
    ['manager_name', 'Workshop Manager'],
    ['contact_phone', '+91 98320 12345'],
    ['contact_whatsapp', '+91 98320 12345'],
    ['contact_email', 'info@theautoglow.in'],
    ['contact_address', 'National Highway 10, Near Deorali, Gangtok, Sikkim - 737101'],
    ['working_hours', 'Monday – Saturday: 9:00 AM – 7:30 PM (Sunday Closed)']
  ];

  const insertSetting = database.prepare('INSERT OR REPLACE INTO business_settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }

  // Users: Exactly 2 users: Super Admin (Abhinay, PIN 4656) and Manager (PIN 1111)
  const insertUser = database.prepare(`
    INSERT INTO users (id, name, email, role, phone, pin, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insertUser.run('usr-1', 'Abhinay', 'abhinay@theautoglow.in', 'super_admin', '+91 98320 12345', '4656');
  insertUser.run('usr-2', 'Workshop Manager', 'manager@theautoglow.in', 'manager', '+91 98321 22334', '1111');

  // Service Bays
  const insertBay = database.prepare(`
    INSERT INTO service_bays (id, name, bay_type, is_active, current_status)
    VALUES (?, ?, ?, 1, ?)
  `);
  insertBay.run('bay-1', 'Bay 1 - Decon & Foam Wash Bay', 'Washing', 'Available');
  insertBay.run('bay-2', 'Bay 2 - Paint Correction & Rubbing', 'Detailing', 'Occupied');
  insertBay.run('bay-3', 'Bay 3 - Ceramic & PPF Clean Room (Dust-Free)', 'Coating/PPF', 'Occupied');
  insertBay.run('bay-4', 'Bay 4 - Interior Deep Steam Spa', 'Interior', 'Available');

  // Service Categories
  const insertCat = database.prepare(`
    INSERT INTO service_categories (id, name, slug, description, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertCat.run('cat-1', 'Ceramic & Graphene Coating', 'coatings', 'High solid quartz & graphene permanent protection', 1);
  insertCat.run('cat-2', 'Paint Protection Film (PPF)', 'ppf', 'Ultra gloss self-healing anti-chip polyurethane film', 2);
  insertCat.run('cat-3', 'Paint Correction & Polishing', 'paint-correction', 'Multi-stage scratch, swirl and oxidation removal', 3);
  insertCat.run('cat-4', 'Interior Deep Spa & Sanitization', 'interior-spa', 'High pressure steam sanitization & leather rejuvenation', 4);
  insertCat.run('cat-5', 'Himalayan Shield Packages', 'himalayan-packages', 'Specialized underbody anti-rust & all-weather protection', 5);
  insertCat.run('cat-6', 'Maintenance Washes & Touch-ups', 'maintenance', 'pH neutral foam decontamination and ceramic top-up', 6);

  // Services
  const insertService = database.prepare(`
    INSERT INTO services (
      id, service_code, category_id, name, description, standard_price,
      pricing_by_category_json, duration_mins, required_consumables_json,
      warranty_duration_days, maintenance_interval_days, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertService.run(
    'srv-1',
    'SRV-CER-01',
    'cat-1',
    '9H Matrix Ceramic Coating (3 Years Warranty)',
    'Full multi-stage decontamination, 3-stage compound polishing, and 2-layer 9H Matrix Quartz coating with hydrophobic topcoat.',
    24000,
    JSON.stringify({ Hatchback: 18000, Sedan: 22000, SUV: 26000, Luxury: 32000, Premium: 35000, Other: 24000 }),
    480,
    JSON.stringify([
      { product_id: 'prod-1', product_name: 'CarPro Cquartz 9H 50ml', quantity: 1, unit: 'bottle' },
      { product_id: 'prod-5', product_name: 'Maxshine Edgeless Microfiber Towels', quantity: 4, unit: 'pcs' },
      { product_id: 'prod-6', product_name: 'Ceramic Coating Applicator Block', quantity: 1, unit: 'pcs' }
    ]),
    1095, // 3 years
    180   // 6 months maintenance interval
  );

  insertService.run(
    'srv-2',
    'SRV-PPF-01',
    'cat-2',
    'Full Body Self-Healing TPU PPF (5 Years Warranty)',
    'STEK DYNOshield 8mil thermo-plastic polyurethane full exterior wrap with self-healing, stain resistance, and high gloss optical clarity.',
    125000,
    JSON.stringify({ Hatchback: 85000, Sedan: 105000, SUV: 130000, Luxury: 160000, Premium: 180000, Other: 125000 }),
    1440,
    JSON.stringify([
      { product_id: 'prod-4', product_name: 'STEK DYNOshield PPF Roll (15m)', quantity: 1, unit: 'roll' },
      { product_id: 'prod-7', product_name: 'PPF Slip Solution 500ml', quantity: 1, unit: 'bottle' }
    ]),
    1825, // 5 years
    180
  );

  insertService.run(
    'srv-3',
    'SRV-PC-01',
    'cat-3',
    '3-Stage Ultra Gloss Paint Correction',
    'Heavy cut compounding, refining polish, and jewel finishing to eliminate 90%+ swirls and water spots, finished with synthetic sealant.',
    8500,
    JSON.stringify({ Hatchback: 6500, Sedan: 7500, SUV: 9500, Luxury: 12000, Premium: 14000, Other: 8500 }),
    300,
    JSON.stringify([
      { product_id: 'prod-2', product_name: 'Koch Chemie H9.01 Heavy Cut 1L', quantity: 0.2, unit: 'bottle' },
      { product_id: 'prod-3', product_name: 'Koch Chemie M3.02 Micro Cut 1L', quantity: 0.2, unit: 'bottle' },
      { product_id: 'prod-5', product_name: 'Maxshine Edgeless Microfiber Towels', quantity: 2, unit: 'pcs' }
    ]),
    90,
    90
  );

  insertService.run(
    'srv-4',
    'SRV-INT-01',
    'cat-4',
    'Deep Interior Steam Spa & Ozone Sanitization',
    'Roof lining dry clean, hot extraction for upholstery, leather nourishment, AC duct ozone fumigation, and germ barrier treatment.',
    4500,
    JSON.stringify({ Hatchback: 3500, Sedan: 4200, SUV: 5200, Luxury: 6800, Premium: 7500, Other: 4500 }),
    240,
    JSON.stringify([
      { product_id: 'prod-8', product_name: 'Koch Chemie Pol Star Interior Cleaner 1L', quantity: 0.2, unit: 'bottle' },
      { product_id: 'prod-9', product_name: 'Leather Conditioner Balm 250ml', quantity: 0.1, unit: 'bottle' }
    ]),
    30,
    45
  );

  insertService.run(
    'srv-5',
    'SRV-HIM-01',
    'cat-5',
    'Himalayan Anti-Rust Underbody Seal & Silencer Coat',
    'Heavy salt and snow slush protection using high-build rubberized asphalt undercoating with zinc heat-resistant silencer coat.',
    5500,
    JSON.stringify({ Hatchback: 4000, Sedan: 4500, SUV: 6000, Luxury: 7500, Premium: 8500, Other: 5500 }),
    180,
    JSON.stringify([
      { product_id: 'prod-10', product_name: 'Rubberized Anti-Rust Canister 1L', quantity: 3, unit: 'can' }
    ]),
    365,
    365
  );

  insertService.run(
    'srv-6',
    'SRV-WSH-01',
    'cat-6',
    'Signature Foam Decon Wash & Spray Wax',
    'Two-bucket wash, wheel iron remover, snow foam soak, compressed air drying, and hybrid ceramic sealant spray.',
    1600,
    JSON.stringify({ Hatchback: 1200, Sedan: 1500, SUV: 1900, Luxury: 2400, Premium: 2800, Other: 1600 }),
    75,
    JSON.stringify([
      { product_id: 'prod-11', product_name: "Meguiar's Hyper Wash 3.78L", quantity: 0.1, unit: 'can' }
    ]),
    0,
    15
  );

  // Employees
  const insertEmp = database.prepare(`
    INSERT INTO employees (
      id, employee_code, name, mobile, email, designation, department,
      joining_date, monthly_salary, employment_type, emergency_contact, address, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
  `);
  insertEmp.run('emp-1', 'EMP-001', 'Christopher Basumatary', '+91 98320 12345', 'chris@theautoglow.in', 'Managing Director', 'Management', '2023-01-10', 85000, 'Full-time', '+91 98320 00000', 'Development Area, Gangtok');
  insertEmp.run('emp-2', 'EMP-002', 'Tashi Lepcha', '+91 98321 22334', 'tashi@theautoglow.in', 'Workshop Manager', 'Operations', '2023-03-01', 45000, 'Full-time', '+91 98321 99999', 'Tadong, Gangtok');
  insertEmp.run('emp-3', 'EMP-003', 'Pema Bhutia', '+91 98322 33445', 'pema@theautoglow.in', 'Finance & Billing Executive', 'Finance', '2023-04-15', 38000, 'Full-time', '+91 98322 88888', 'Deorali, Gangtok');
  insertEmp.run('emp-4', 'EMP-004', 'Karma Namgyal', '+91 98323 44556', 'karma@theautoglow.in', 'Lead PPF & Ceramic Specialist', 'Detailing Floor', '2023-02-15', 35000, 'Full-time', '+91 98323 77777', 'Ranipool, Gangtok');
  insertEmp.run('emp-5', 'EMP-005', 'Mingma Sherpa', '+91 98324 55667', 'mingma@theautoglow.in', 'Senior Paint Correction Specialist', 'Detailing Floor', '2023-06-10', 30000, 'Full-time', '+91 98324 66666', 'Burtuk, Gangtok');
  insertEmp.run('emp-6', 'EMP-006', 'Sonam Wangchuk', '+91 98325 66778', 'sonam@theautoglow.in', 'Interior Detailing Technician', 'Detailing Floor', '2023-08-01', 25000, 'Full-time', '+91 98325 55555', 'Sichey, Gangtok');

  // Leave Balances for 2026
  const insertLeaveBal = database.prepare(`
    INSERT INTO leave_balances (id, employee_id, year, leave_type, annual_entitlement, consumed_days, remaining_days)
    VALUES (?, ?, 2026, ?, ?, ?, ?)
  `);
  ['emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6'].forEach((eid, idx) => {
    insertLeaveBal.run(`lb-${idx}-1`, eid, 'Casual Leave', 12, 2, 10);
    insertLeaveBal.run(`lb-${idx}-2`, eid, 'Sick Leave', 8, 1, 7);
    insertLeaveBal.run(`lb-${idx}-3`, eid, 'Earned Leave', 15, 0, 15);
  });

  // Suppliers
  const insertSupp = database.prepare(`
    INSERT INTO suppliers (
      id, supplier_code, name, contact_person, mobile, email, address, gstin, products_supplied, payment_terms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSupp.run('sup-1', 'SUP-001', 'Detailing Geek Hub India', 'Amitabh Roy', '+91 98300 44321', 'sales@detailinggeek.in', 'Park Circus, Kolkata, WB', '19AABCA7766K1ZU', 'CarPro Ceramic Coatings, Rupes Polishers, Koch Chemie Compounds', 'Net 15 Days');
  insertSupp.run('sup-2', 'SUP-002', 'STEK Protective Films India', 'Rajiv Mehra', '+91 98111 88990', 'contact@stekindia.com', 'Okhla Industrial Phase 3, New Delhi', '07AAACS5544B1ZX', 'STEK DYNOshield PPF Rolls, PPF Slip Solutions', 'Net 30 Days');
  insertSupp.run('sup-3', 'SUP-003', 'Himalayan Industrial Supplies', 'Birendra Pradhan', '+91 98320 77889', 'birendra@himsupplies.in', '3rd Mile, Sevoke Road, Siliguri', '19AAGCP9911C1ZT', 'Underbody Rubber Seal, Microfiber Towels, Masking Tapes, Nitrile Gloves', 'Immediate / Cash');

  // Inventory Products
  const insertProd = database.prepare(`
    INSERT INTO inventory_products (
      id, sku, name, category, brand, unit, purchase_price, selling_price,
      current_stock, min_stock_level, supplier_id, storage_location, batch_number, expiry_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProd.run('prod-1', 'CP-CQ-50', 'CarPro Cquartz 9H 50ml', 'Coatings', 'CarPro', 'bottle', 4200, 7500, 14, 5, 'sup-1', 'Cabinet A - Temperature Controlled', 'CP2026-B1', '2028-12-31');
  insertProd.run('prod-2', 'KC-H9-1L', 'Koch Chemie H9.01 Heavy Cut 1L', 'Compounds', 'Koch Chemie', 'bottle', 2400, 3600, 8, 3, 'sup-1', 'Shelf B1', 'KC-H9-88', '2027-10-15');
  insertProd.run('prod-3', 'KC-M3-1L', 'Koch Chemie M3.02 Micro Cut 1L', 'Polishes', 'Koch Chemie', 'bottle', 2300, 3500, 9, 3, 'sup-1', 'Shelf B1', 'KC-M3-91', '2027-10-15');
  insertProd.run('prod-4', 'ST-DS-15M', 'STEK DYNOshield PPF Roll (15m)', 'PPF Film', 'STEK', 'roll', 48000, 75000, 3, 2, 'sup-2', 'PPF Clean Bay Rack', 'STK-2026-09', '2030-05-30');
  insertProd.run('prod-5', 'MS-MF-12', 'Maxshine Edgeless Microfiber Towels', 'Accessories', 'Maxshine', 'pcs', 110, 180, 48, 20, 'sup-3', 'Laundry Bins Clean', 'MS-MF-400', '2032-01-01');
  insertProd.run('prod-6', 'AP-BLK-01', 'Ceramic Coating Applicator Block', 'Accessories', 'Detailers Guild', 'pcs', 80, 150, 24, 10, 'sup-1', 'Cabinet A', 'DG-AP-01', '2030-01-01');
  insertProd.run('prod-7', 'SL-SOL-500', 'PPF Slip Solution 500ml', 'Chemicals', 'STEK', 'bottle', 850, 1400, 6, 3, 'sup-2', 'PPF Clean Bay Rack', 'SL-500-11', '2027-08-30');
  insertProd.run('prod-8', 'KC-PS-1L', 'Koch Chemie Pol Star Interior Cleaner 1L', 'Chemicals', 'Koch Chemie', 'bottle', 1600, 2400, 11, 4, 'sup-1', 'Shelf C2', 'KC-PS-33', '2027-11-20');
  insertProd.run('prod-9', 'LT-BLM-250', 'Leather Conditioner Balm 250ml', 'Care', 'Colourlock', 'bottle', 1400, 2200, 7, 3, 'sup-1', 'Shelf C3', 'CL-LT-25', '2028-04-10');
  insertProd.run('prod-10', 'UB-RST-1L', 'Rubberized Anti-Rust Canister 1L', 'Coatings', '3M', 'can', 850, 1400, 18, 10, 'sup-3', 'Wash Bay Dry Cabinet', '3M-UB-77', '2029-01-10');
  insertProd.run('prod-11', 'MG-HW-4L', "Meguiar's Hyper Wash 3.78L", 'Soaps', "Meguiar's", 'can', 3200, 4800, 5, 2, 'sup-1', 'Wash Bay Dispenser', 'MG-HW-99', '2028-06-15');

  // Fixed Assets
  const insertAsset = database.prepare(`
    INSERT INTO assets (
      id, asset_code, name, category, brand, model, serial_number, purchase_date,
      purchase_price, supplier_id, warranty_expiry, location, condition, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAsset.run('ast-1', 'AST-001', 'High Pressure Washer Unit 1', 'Pressure Washers', 'Kranzle', 'K1152 TST', 'KRZ-889102', '2023-02-10', 88000, 'sup-1', '2025-02-10', 'Bay 1 - Washing', 'Excellent', 'In Use');
  insertAsset.run('ast-2', 'AST-002', 'Dual Action Rotary Polisher 1', 'Polishers', 'Rupes', 'BigFoot LHR 21 Mark III', 'RUP-992144', '2023-04-12', 46000, 'sup-1', '2025-04-12', 'Bay 2 - Detailing', 'Excellent', 'In Use');
  insertAsset.run('ast-3', 'AST-003', 'Commercial Steam Cleaning Generator', 'Steam Extractors', 'Karcher', 'SG 4/4 Pro', 'KRC-554109', '2023-05-18', 74000, 'sup-3', '2025-05-18', 'Bay 4 - Interior', 'Good', 'Available');
  insertAsset.run('ast-4', 'AST-004', 'Dust-Free Clean Room Air Scrubber & Ionizer', 'Air Filtration', 'Honeywell Commercial', 'H-9000 HEPA', 'HON-772199', '2023-03-20', 115000, 'sup-3', '2026-03-20', 'Bay 3 - Ceramic Studio', 'Excellent', 'In Use');
  insertAsset.run('ast-5', 'AST-005', 'Silent Oil-Free Air Compressor 50L', 'Compressors', 'Bambi', 'Silent Air VT200D', 'BMB-330111', '2023-03-01', 62000, 'sup-3', '2025-03-01', 'Plant Room', 'Fair', 'Under Maintenance');

  // Asset Maintenance
  database.prepare(`
    INSERT INTO asset_maintenance (id, asset_id, maintenance_date, maintenance_type, service_provider, cost, next_service_due, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('mnt-1', 'ast-5', '2026-10-15', 'Pressure Valve Calibration & Filter Swap', 'Sikkim Hydraulic Works', 3500, '2027-04-15', 'Intake filter replaced, cylinder head tightened.');

  // Customers
  const insertCust = database.prepare(`
    INSERT INTO customers (
      id, customer_code, name, mobile, alt_mobile, email, address, city, category,
      remarks, status, total_spent, visit_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCust.run('cust-1', 'CUST-001', 'Dawa Dorjee Lepcha', '+91 98000 11223', '+91 98000 11224', 'dawa.lepcha@gmail.com', 'Development Area, Upper Sichey', 'Gangtok', 'VIP', 'Prefers Saturday pickups. Long time detailing enthusiast.', 'Active', 68000, 3);
  insertCust.run('cust-2', 'CUST-002', 'Dr. Ananya Sharma', '+91 98001 22334', null, 'dr.ananya.s@aiims.edu.in', 'STNM Hospital Quarters, Sochakgang', 'Gangtok', 'Regular', 'Maintains hospital commute SUV.', 'Active', 26000, 1);
  insertCust.run('cust-3', 'CUST-003', 'Bikash Pradhan', '+91 98002 33445', '+91 98002 99887', 'bikash.pradhan@sikkim.gov.in', 'Tadong Housing Colony', 'Gangtok', 'VIP', 'Very particular about PPF edge tucking and clean glass.', 'Active', 135000, 2);
  insertCust.run('cust-4', 'CUST-004', 'Kinzang Topgay Bhutia', '+91 98003 44556', null, 'topgay.b@outlook.com', 'Ravangla Road, Deorali', 'Gangtok', 'Regular', 'Frequent offroader in North Sikkim.', 'Active', 12500, 2);
  insertCust.run('cust-5', 'CUST-005', 'Pooja Agarwal', '+91 98004 55667', null, 'pooja.agarwal@gmail.com', 'MG Marg, Near Titanic Park', 'Gangtok', 'Regular', 'First time ceramic customer.', 'Active', 22000, 1);

  // Vehicles
  const insertVeh = database.prepare(`
    INSERT INTO vehicles (
      id, vehicle_code, customer_id, reg_number, make, model, variant, category,
      color, fuel_type, year, remarks, odometer
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertVeh.run('veh-1', 'VEH-001', 'cust-1', 'SK-01-PA-0001', 'Toyota', 'Fortuner 4x4', 'Legender 2.8 AT', 'SUV', 'Attitude Black Mica', 'Diesel', 2024, 'Ceramic coated 9H. Needs periodic inspection.', 18450);
  insertVeh.run('veh-2', 'VEH-002', 'cust-2', 'SK-01-TC-4521', 'Mahindra', 'Scorpio-N', 'Z8L 4Xplor AT', 'SUV', 'Deep Forest Green', 'Diesel', 2023, 'Himalayan road warrior. Heavy underbody grime.', 31200);
  insertVeh.run('veh-3', 'VEH-003', 'cust-3', 'SK-01-AB-8899', 'BMW', '3 Series Gran Limousine', '330Li M Sport', 'Luxury', 'Mineral White Metallic', 'Petrol', 2024, 'Full Body STEK PPF protected.', 9400);
  insertVeh.run('veh-4', 'VEH-004', 'cust-4', 'SK-02-C-1984', 'Tata', 'Safari', 'XZ+ Dark Edition', 'SUV', 'Oberon Black', 'Diesel', 2023, 'Underbody rust seal active.', 27800);
  insertVeh.run('veh-5', 'VEH-005', 'cust-5', 'SK-01-EA-5566', 'Hyundai', 'Creta', 'SX(O) Turbo 1.5 DCT', 'SUV', 'Abyss Black Pearl', 'Petrol', 2024, 'Minor swirl marks on hood.', 11200);

  // Appointments
  const insertAppt = database.prepare(`
    INSERT INTO appointments (
      id, booking_code, customer_id, vehicle_id, bay_id, assigned_staff_id,
      appointment_date, appointment_time, expected_end_time, estimated_amount,
      status, customer_instructions, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAppt.run('apt-1', 'BK-2026-001', 'cust-1', 'veh-1', 'bay-3', 'emp-4', '2026-11-08', '09:30', '17:30', 26000, 'In Progress', 'Annual 6-month ceramic coating decontamination top-up and interior rejuvenation.', 'VIP client - inspect door sills carefully.');
  insertAppt.run('apt-2', 'BK-2026-002', 'cust-2', 'veh-2', 'bay-2', 'emp-5', '2026-11-08', '11:00', '16:00', 9500, 'In Progress', 'Multi-stage scratch removal from hillside branches on both side doors.', 'Customer will collect by 5 PM.');
  insertAppt.run('apt-3', 'BK-2026-003', 'cust-4', 'veh-4', 'bay-1', 'emp-6', '2026-11-08', '14:30', '16:00', 1900, 'Confirmed', 'Foam decontamination wash after Gurudongmar road trip.', 'Mud caked in wheel wells.');
  insertAppt.run('apt-4', 'BK-2026-004', 'cust-5', 'veh-5', 'bay-3', 'emp-4', '2026-11-09', '10:00', '18:00', 22000, 'Confirmed', 'New vehicle delivery prep: 9H Ceramic Coating.', 'Requested certificate and 3-year warranty card.');

  // Job Cards
  const insertJob = database.prepare(`
    INSERT INTO job_cards (
      id, job_card_number, customer_id, vehicle_id, appointment_id, bay_id,
      primary_staff_id, status, odometer_in, fuel_level, remarks, work_notes,
      estimated_completion, actual_completion, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertJob.run(
    'jc-1',
    'JC-AGS-001',
    'cust-1',
    'veh-1',
    'apt-1',
    'bay-3',
    'emp-4',
    'Work in Progress',
    18450,
    '3/4',
    'Decon wash completed. Masking done. In clean bay for 9H topcoat inspection.',
    'Paint depth gauge shows healthy 125-135 microns. Ceramic hydrophobicity fully restored on front panels.',
    '2026-11-08 17:30',
    null,
    '2026-11-08 09:40:00'
  );

  insertJob.run(
    'jc-2',
    'JC-AGS-002',
    'cust-2',
    'veh-2',
    'apt-2',
    'bay-2',
    'emp-5',
    'Work in Progress',
    31200,
    '1/2',
    'Stage 1 Heavy Cut finished on right fender and passenger door.',
    'Branch scratches 95% eliminated without cutting through clear coat.',
    '2026-11-08 16:00',
    null,
    '2026-11-08 11:15:00'
  );

  insertJob.run(
    'jc-3',
    'JC-AGS-003',
    'cust-3',
    'veh-3',
    null,
    'bay-3',
    'emp-4',
    'Completed',
    9400,
    'Full',
    'Full Body STEK DYNOshield PPF installation and front windshield film.',
    'Tucked all edges seamlessly into headlights, hood corners, and door handles.',
    '2026-11-05 18:00',
    '2026-11-05 17:45',
    '2026-11-04 10:00:00'
  );

  // Job Card Services
  const insertJCSrv = database.prepare(`
    INSERT INTO job_card_services (id, job_card_id, service_id, service_name, price, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertJCSrv.run('jcs-1', 'jc-1', 'srv-1', '9H Matrix Ceramic Coating (3 Years Warranty)', 26000, 'In Progress');
  insertJCSrv.run('jcs-2', 'jc-2', 'srv-3', '3-Stage Ultra Gloss Paint Correction', 9500, 'In Progress');
  insertJCSrv.run('jcs-3', 'jc-3', 'srv-2', 'Full Body Self-Healing TPU PPF (5 Years Warranty)', 130000, 'Completed');
  insertJCSrv.run('jcs-4', 'jc-3', 'srv-4', 'Deep Interior Steam Spa & Ozone Sanitization', 5000, 'Completed');

  // Job Assignments
  const insertAssign = database.prepare(`
    INSERT INTO job_assignments (id, job_card_id, employee_id, role_in_job)
    VALUES (?, ?, ?, ?)
  `);
  insertAssign.run('ja-1', 'jc-1', 'emp-4', 'Lead Coating Master');
  insertAssign.run('ja-2', 'jc-1', 'emp-6', 'Prep & Decon Tech');
  insertAssign.run('ja-3', 'jc-2', 'emp-5', 'Paint Correction Specialist');
  insertAssign.run('ja-4', 'jc-3', 'emp-4', 'Master PPF Wrapper');
  insertAssign.run('ja-5', 'jc-3', 'emp-6', 'Interior Detailing Lead');

  // Vehicle Inspections
  const insertInsp = database.prepare(`
    INSERT INTO vehicle_inspections (
      id, job_card_id, inspection_type, scratches_json, dents_json,
      paint_condition, interior_condition, wheel_condition, glass_condition,
      accessories_checked_json, photos_json, customer_acknowledged, customer_signature, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  insertInsp.run(
    'insp-1',
    'jc-1',
    'intake',
    JSON.stringify(['Micro-marring on rear bumper lip', 'Swirls on piano black B-pillars']),
    JSON.stringify([]),
    'Good (Existing 9H Coating)',
    'Clean',
    'Clean (Brake dust light)',
    'Excellent (No chips)',
    JSON.stringify(['Original floor mats', 'Spare wheel key in glovebox', 'Dashcam installed']),
    JSON.stringify(['/sample-car-intake-1.jpg', '/sample-car-intake-2.jpg']),
    'Dawa Dorjee (Digital Ack)',
    'Customer noted paint is overall smooth, requested special care around roof spoiler.'
  );

  insertInsp.run(
    'insp-2',
    'jc-3',
    'post_service',
    JSON.stringify([]),
    JSON.stringify([]),
    'Showroom Flawless (Full Body STEK PPF)',
    'Immaculate & Sanitized',
    'Dressed with Gyeon Tire Coat',
    'Treated with Glass Ceramic Hydrophobic',
    JSON.stringify(['All accessories verified and intact']),
    JSON.stringify(['/sample-car-post-1.jpg']),
    'Bikash Pradhan (Handover Ack)',
    'Quality check passed 100%. Handover executed with 5-year warranty certificate.'
  );

  // Consumable Stock Consumptions
  const insertCons = database.prepare(`
    INSERT INTO stock_consumptions (id, job_card_id, product_id, quantity, unit_cost, total_cost)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertCons.run('sc-1', 'jc-3', 'prod-4', 1, 48000, 48000);
  insertCons.run('sc-2', 'jc-3', 'prod-7', 1, 850, 850);
  insertCons.run('sc-3', 'jc-3', 'prod-5', 4, 110, 440);
  insertCons.run('sc-4', 'jc-1', 'prod-1', 1, 4200, 4200);
  insertCons.run('sc-5', 'jc-1', 'prod-6', 1, 80, 80);

  // Invoices
  const insertInv = database.prepare(`
    INSERT INTO invoices (
      id, invoice_number, job_card_id, customer_id, vehicle_id, invoice_date, due_date,
      subtotal, discount, taxable_value, gst_rate, cgst_amount, sgst_amount, total_amount,
      paid_amount, balance_amount, payment_status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Completed Job 3 Invoice
  insertInv.run(
    'inv-1',
    'INV-AGS-001',
    'jc-3',
    'cust-3',
    'veh-3',
    '2026-11-05',
    '2026-11-05',
    135000,
    5000, // Privilege discount
    130000,
    18,
    11700,
    11700,
    153400,
    153400,
    0,
    'Paid',
    'Full Body STEK DYNOshield PPF + Deep Interior Spa. 5-Year Warranty Issued.',
    '2026-11-05 17:50:00'
  );

  // Active Job 1 Draft Invoice
  insertInv.run(
    'inv-2',
    'INV-AGS-002',
    'jc-1',
    'cust-1',
    'veh-1',
    '2026-11-08',
    '2026-11-08',
    26000,
    0,
    26000,
    18,
    2340,
    2340,
    30680,
    10000, // Advance
    20680,
    'Partially Paid',
    'Advance received via UPI. Balance on delivery.',
    '2026-11-08 10:00:00'
  );

  // Invoice Items
  const insertInvItem = database.prepare(`
    INSERT INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, discount, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertInvItem.run('ii-1', 'inv-1', 'service', 'Full Body Self-Healing TPU PPF (STEK DYNOshield)', 1, 130000, 5000, 125000);
  insertInvItem.run('ii-2', 'inv-1', 'service', 'Deep Interior Steam Spa & Ozone Sanitization', 1, 5000, 0, 5000);
  insertInvItem.run('ii-3', 'inv-2', 'service', '9H Matrix Ceramic Coating (SUV Category)', 1, 26000, 0, 26000);

  // Payments
  const insertPay = database.prepare(`
    INSERT INTO payments (
      id, payment_number, invoice_id, customer_id, amount, payment_method,
      transaction_ref, payment_date, notes, recorded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPay.run('pay-1', 'PAY-AGS-001', 'inv-1', 'cust-3', 153400, 'UPI', 'UPI/HDFC/20261105991823', '2026-11-05', 'Settled via HDFC Netbanking UPI QR', 'Pema Bhutia');
  insertPay.run('pay-2', 'PAY-AGS-002', 'inv-2', 'cust-1', 10000, 'UPI', 'UPI/SBI/20261108110992', '2026-11-08', 'Advance booking token', 'Pema Bhutia');

  // Warranties
  const insertWar = database.prepare(`
    INSERT INTO warranties (
      id, certificate_number, job_card_id, invoice_id, customer_id, vehicle_id,
      service_id, service_name, start_date, end_date, duration_months, coverage_details,
      terms_and_conditions, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
  `);
  insertWar.run(
    'war-1',
    'WAR-AGS-2026-001',
    'jc-3',
    'inv-1',
    'cust-3',
    'veh-3',
    'srv-2',
    'Full Body Self-Healing TPU PPF (STEK DYNOshield)',
    '2026-11-05',
    '2031-11-04',
    60,
    'Guarantees against yellowing, cracking, bubbling, and premature loss of gloss or adhesive failure.',
    'Requires annual warranty inspection at The Autoglow Sikkim every 12 months. Washing with high-pH degreasers will void terms.',
  );

  insertWar.run(
    'war-2',
    'WAR-AGS-2024-089',
    'jc-1',
    'inv-2',
    'cust-1',
    'veh-1',
    'srv-1',
    '9H Matrix Ceramic Coating (3 Years Warranty)',
    '2024-05-10',
    '2027-05-09',
    36,
    'Protection against acid rain etching, bird dropping stains, UV oxidation, and paint color fading.',
    'Customer must bring vehicle for 6-month ceramic top-up wash. Cleaned only with pH neutral shampoo.',
  );

  // Service Reminders
  const insertRem = database.prepare(`
    INSERT INTO service_reminders (
      id, customer_id, vehicle_id, service_id, service_name, last_service_date,
      next_due_date, recommended_odometer, reminder_type, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRem.run('rem-1', 'cust-2', 'veh-2', 'srv-5', 'Himalayan Anti-Rust Underbody Seal & Silencer Coat', '2025-11-15', '2026-11-15', 35000, 'time_based', 'Upcoming', 'Annual monsoon rust inspection due next week.');
  insertRem.run('rem-2', 'cust-4', 'veh-4', 'srv-4', 'Deep Interior Steam Spa & Ozone Sanitization', '2026-09-20', '2026-11-04', 28000, 'time_based', 'Overdue', 'Reminder message drafted. High off-road dust season.');
  insertRem.run('rem-3', 'cust-1', 'veh-1', 'srv-1', '9H Matrix Ceramic Coating Maintenance', '2026-05-10', '2026-11-10', 20000, 'time_based', 'Due Today', 'Scheduled appointment today for maintenance inspection.');

  // Staff Attendance for Today (2026-11-08)
  const insertAtt = database.prepare(`
    INSERT OR REPLACE INTO attendance (
      id, employee_id, attendance_date, status, check_in, check_out, working_hours, late_minutes, overtime_hours, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAtt.run('att-1', 'emp-1', '2026-11-08', 'Present', '09:00', null, 8.0, 0, 0, 'On site - Management');
  insertAtt.run('att-2', 'emp-2', '2026-11-08', 'Present', '08:45', null, 8.5, 0, 0, 'Floor operations supervision');
  insertAtt.run('att-3', 'emp-3', '2026-11-08', 'Present', '09:10', null, 8.0, 10, 0, 'Accounts desk');
  insertAtt.run('att-4', 'emp-4', '2026-11-08', 'Present', '08:50', null, 8.5, 0, 1.0, 'Bay 3 ceramic application');
  insertAtt.run('att-5', 'emp-5', '2026-11-08', 'Present', '09:00', null, 8.0, 0, 0, 'Bay 2 paint correction');
  insertAtt.run('att-6', 'emp-6', '2026-11-08', 'Present', '09:00', null, 8.0, 0, 0, 'Bay 1 wash & interior prep');

  // Leave Application
  database.prepare(`
    INSERT INTO leave_applications (
      id, employee_id, leave_type, start_date, end_date, total_days, reason, status, approved_by, approval_remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'leave-1',
    'emp-5',
    'Casual Leave',
    '2026-11-14',
    '2026-11-15',
    2,
    'Family religious puja in Kalimpong.',
    'Approved',
    'Tashi Lepcha',
    'Approved. Ensure Bay 2 jobs are handed over to Sonam.'
  );

  // Expenses
  const insertExp = database.prepare(`
    INSERT INTO expenses (
      id, expense_number, expense_date, category, description, amount, payment_method, vendor, recorded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertExp.run('exp-1', 'EXP-2026-001', '2026-11-01', 'Rent', 'Studio Workshop & Bay Lease - November 2026', 42000, 'Bank Transfer', 'Sikkim Industrial Estate Ltd', 'Pema Bhutia');
  insertExp.run('exp-2', 'EXP-2026-002', '2026-11-03', 'Electricity', 'Power grid 3-phase high tension billing', 12450, 'Bank Transfer', 'Sikkim Power Dept', 'Pema Bhutia');
  insertExp.run('exp-3', 'EXP-2026-003', '2026-11-04', 'Consumables', 'Nitrile gloves, masking tapes & spray triggers', 3800, 'Cash', 'Himalayan Industrial Supplies', 'Tashi Lepcha');
  insertExp.run('exp-4', 'EXP-2026-004', '2026-11-06', 'Equipment Maintenance', 'Compressor valve maintenance service fee', 3500, 'UPI', 'Sikkim Hydraulic Works', 'Tashi Lepcha');

  // Loyalty Accounts
  database.prepare(`
    INSERT INTO loyalty_accounts (id, customer_id, points_balance, tier, total_points_earned, total_points_redeemed, referral_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('loy-1', 'cust-1', 680, 'Gold', 680, 0, 'AGS-DAWA');
  database.prepare(`
    INSERT INTO loyalty_accounts (id, customer_id, points_balance, tier, total_points_earned, total_points_redeemed, referral_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('loy-2', 'cust-3', 1350, 'Platinum', 1350, 0, 'AGS-BIKASH');

  // Notifications
  const insertNotif = database.prepare(`
    INSERT INTO notifications (id, title, message, category, link_url, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, datetime('now', 'localtime'))
  `);
  insertNotif.run('notif-1', 'Low Stock Alert', 'STEK DYNOshield PPF Roll stock is at 3 (Minimum threshold: 2). Restock recommended.', 'inventory', '/inventory');
  insertNotif.run('notif-2', 'Pending Payment', 'Invoice INV-AGS-002 has ₹20,680 outstanding from Dawa Dorjee.', 'payment', '/billing');
  insertNotif.run('notif-3', 'Upcoming Leave', 'Mingma Sherpa is approved for Casual Leave on 14-11-2026 to 15-11-2026.', 'staff', '/leave');
  insertNotif.run('notif-4', 'Service Reminder Due', 'Annual Anti-Rust underbody inspection due for Mahindra Scorpio-N (SK-01-TC-4521).', 'reminder', '/reminders');

  // Audit Log
  database.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'aud-1',
    'usr-1',
    'Christopher Basumatary',
    'SYSTEM_INITIALIZE',
    'system',
    'autoglow-core',
    JSON.stringify({ note: 'The Autoglow Sikkim database seeded and ready for production.' })
  );
}
