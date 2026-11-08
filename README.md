# The Autoglow Sikkim — Car Detailing ERP & CRM

A complete, production-ready Car Detailing Shop Business Management ERP & CRM built for **The Autoglow Sikkim** (`theautoglow`), situated in Gangtok, Sikkim.

- **🌐 Live Cloudflare Pages URL**: [https://theautoglow.pages.dev](https://theautoglow.pages.dev)
- **🐙 GitHub Repository**: [https://github.com/christopher4635/theautoglow](https://github.com/christopher4635/theautoglow)

---

## 🌟 Overview & Capabilities

The system covers the entire business lifecycle:

```text
Customer Registration ➔ Vehicle Garage ➔ Service Bay Appointments ➔ Digital Intake Inspection
➔ Job Card Generation ➔ Floor Execution & Consumable Allocation ➔ Quality Control (QC)
➔ GST Tax Invoice (18% CGST + SGST) ➔ Split Multi-Payment Ledger ➔ Digital Warranty Certificate
➔ Vehicle Handover ➔ Automatic Maintenance Reminders (WhatsApp/Email)
```

### Additional Integrated Modules:
- **Daily Staff Attendance & Leave Management**: Interactive monthly calendar with auto-synchronization of approved leaves into attendance records.
- **Consumables Inventory**: Stock level monitoring, batch numbers, storage locations, and automated stock deductions with negative stock protection.
- **Machinery & Fixed Assets Register**: Service tracking for pressure washers, dual-action polishers, and steam extractors with maintenance due alerts.
- **Suppliers & Purchase Orders**: Automatic replenishment of inventory items upon PO receipt.
- **Financial Accounts & P&L Statement**: Real-time Gross Profit, Operating Expenses, Consumable Costs, and Net Operating Margin with CSV exports.
- **Loyalty & Membership Tiers**: Bronze, Silver, Gold, and Platinum points ledger with per-invoice redemption.
- **Traceable Audit Log**: Immutable record of all mutations across orders, payments, warranties, and stock adjustments.

---

## 🎨 Design Philosophy

Adheres strictly to minimal, restrained SaaS design:
- **Palette**: Clean white (`#FFFFFF`), light neutral background (`#F7F7F7`), deep charcoal (`#222222`), muted grey text (`#777777`), hairline borders (`#EAEAEA`).
- **Accent**: Pure charcoal/navy (`#18181B`).
- **Focus**: High data density, compact tables, no flashy gradients, and zero decorative visual clutter.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 / 22 / 24)
- npm or pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/christopher4635/theautoglow.git
cd theautoglow

# Install dependencies
npm install

# Database initialization & seeding is automatic on first launch!
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Production Build
```bash
npm run build
npm start
```

---

## 👥 Role-Based Access Control (RBAC)

The application supports 4 distinct operational personas:
1. **Super Admin (Owner)**: Full access across all financials, P&L, employee salaries, settings, and audit logs.
2. **Workshop Manager**: Day-to-day operations: CRM, fleet, bookings, service bays, job cards, QC, consumables, and staff attendance.
3. **Accountant**: Invoicing, payment collection, vendor bills, overhead expenses, and financial P&L reporting.
4. **Staff Detailer**: Assigned job cards, vehicle checklists, and personal attendance tracking.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Date-fns, jsPDF
- **Database**: SQLite (via `better-sqlite3` with WAL mode)
- **Hosting / Deployment**: Cloudflare Pages / Workers & Node.js
