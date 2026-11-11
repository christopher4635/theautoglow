import { D1DatabaseLike, wrapD1 } from '../../lib/async-db';
import { errorResponse } from '../../lib/api-handlers/helpers';
import { handleAuthPinPost, handleAuthPinPut } from '../../lib/api-handlers/auth';
import { handleContactGet, handleContactPost } from '../../lib/api-handlers/contact';
import { handleSettingsGet, handleSettingsPost } from '../../lib/api-handlers/settings';
import { handleDashboardGet } from '../../lib/api-handlers/dashboard';
import { handleNotificationsGet, handleNotificationsPut } from '../../lib/api-handlers/notifications';
import { handleAuditLogsGet } from '../../lib/api-handlers/audit-logs';
import {
  handleCustomersGet,
  handleCustomersPost,
  handleCustomerByIdGet,
  handleCustomerByIdPut,
  handleCustomerByIdDelete,
} from '../../lib/api-handlers/customers';
import {
  handleVehiclesGet,
  handleVehiclesPost,
  handleVehicleByIdGet,
  handleVehicleByIdPut,
  handleVehicleByIdDelete,
} from '../../lib/api-handlers/vehicles';
import { handleServicesGet, handleServicesPost, handleServicesPut } from '../../lib/api-handlers/services';
import { handleServiceBaysGet, handleServiceBaysPut } from '../../lib/api-handlers/service-bays';
import {
  handleAppointmentsGet,
  handleAppointmentsPost,
  handleAppointmentsPut,
} from '../../lib/api-handlers/appointments';
import {
  handleJobCardsGet,
  handleJobCardsPost,
  handleJobCardByIdGet,
  handleJobCardByIdPut,
  handleJobCardConsumePost,
  handleJobCardInspectionPost,
} from '../../lib/api-handlers/jobcards';
import {
  handleInvoicesGet,
  handleInvoicesPost,
  handleInvoiceByIdGet,
  handleInvoiceByIdDelete,
} from '../../lib/api-handlers/invoices';
import { handlePaymentsGet, handlePaymentsPost } from '../../lib/api-handlers/payments';
import { handleExpensesGet, handleExpensesPost } from '../../lib/api-handlers/expenses';
import {
  handleInventoryGet,
  handleInventoryPost,
  handleInventoryPut,
  handleInventoryTransactionPost,
} from '../../lib/api-handlers/inventory';
import { handleSuppliersGet, handleSuppliersPost } from '../../lib/api-handlers/suppliers';
import { handlePurchasesGet, handlePurchasesPost } from '../../lib/api-handlers/purchases';
import {
  handleAssetsGet,
  handleAssetsPost,
  handleAssetsPut,
  handleAssetMaintenancePost,
} from '../../lib/api-handlers/assets';
import { handleEmployeesGet, handleEmployeesPost } from '../../lib/api-handlers/employees';
import { handleAttendanceGet, handleAttendancePost } from '../../lib/api-handlers/attendance';
import { handleLeaveGet, handleLeavePost, handleLeavePut } from '../../lib/api-handlers/leave';
import {
  handleWarrantiesGet,
  handleWarrantiesPost,
  handleWarrantyClaimPost,
} from '../../lib/api-handlers/warranties';
import {
  handleRemindersGet,
  handleRemindersPost,
  handleRemindersPut,
  handleReminderNotifyPost,
} from '../../lib/api-handlers/reminders';
import { handleLoyaltyGet, handleLoyaltyPost } from '../../lib/api-handlers/loyalty';
import { handleCommunicationsGet, handleCommunicationsPost } from '../../lib/api-handlers/communications';
import { handleReportsGet } from '../../lib/api-handlers/reports';

interface PagesContext {
  request: Request;
  env: {
    DB?: D1DatabaseLike;
  };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return errorResponse('Cloudflare D1 database binding (DB) is not configured.', 500);
  }

  const db = wrapD1(env.DB);
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '');
  const method = request.method.toUpperCase();

  if (pathname === '/api/auth/pin') {
    if (method === 'POST') return handleAuthPinPost(request, db);
    if (method === 'PUT') return handleAuthPinPut(request, db);
  }

  if (pathname === '/api/contact') {
    if (method === 'GET') return handleContactGet(db);
    if (method === 'POST') return handleContactPost(request, db);
  }

  if (pathname === '/api/settings') {
    if (method === 'GET') return handleSettingsGet(db);
    if (method === 'POST') return handleSettingsPost(request, db);
  }

  if (pathname === '/api/dashboard' && method === 'GET') {
    return handleDashboardGet(request, db);
  }

  if (pathname === '/api/notifications') {
    if (method === 'GET') return handleNotificationsGet(db);
    if (method === 'PUT') return handleNotificationsPut(request, db);
  }

  if (pathname === '/api/audit-logs' && method === 'GET') {
    return handleAuditLogsGet(db);
  }

  if (pathname === '/api/customers') {
    if (method === 'GET') return handleCustomersGet(request, db);
    if (method === 'POST') return handleCustomersPost(request, db);
  }
  const custMatch = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (custMatch) {
    const id = decodeURIComponent(custMatch[1]);
    if (method === 'GET') return handleCustomerByIdGet(id, db);
    if (method === 'PUT') return handleCustomerByIdPut(request, id, db);
    if (method === 'DELETE') return handleCustomerByIdDelete(id, db);
  }

  if (pathname === '/api/vehicles') {
    if (method === 'GET') return handleVehiclesGet(request, db);
    if (method === 'POST') return handleVehiclesPost(request, db);
  }
  const vehMatch = pathname.match(/^\/api\/vehicles\/([^/]+)$/);
  if (vehMatch) {
    const id = decodeURIComponent(vehMatch[1]);
    if (method === 'GET') return handleVehicleByIdGet(id, db);
    if (method === 'PUT') return handleVehicleByIdPut(request, id, db);
    if (method === 'DELETE') return handleVehicleByIdDelete(id, db);
  }

  if (pathname === '/api/services') {
    if (method === 'GET') return handleServicesGet(request, db);
    if (method === 'POST') return handleServicesPost(request, db);
    if (method === 'PUT') return handleServicesPut(request, db);
  }

  if (pathname === '/api/service-bays') {
    if (method === 'GET') return handleServiceBaysGet(db);
    if (method === 'PUT') return handleServiceBaysPut(request, db);
  }

  if (pathname === '/api/appointments') {
    if (method === 'GET') return handleAppointmentsGet(request, db);
    if (method === 'POST') return handleAppointmentsPost(request, db);
    if (method === 'PUT') return handleAppointmentsPut(request, db);
  }

  if (pathname === '/api/jobcards') {
    if (method === 'GET') return handleJobCardsGet(request, db);
    if (method === 'POST') return handleJobCardsPost(request, db);
  }
  const jcConsumeMatch = pathname.match(/^\/api\/jobcards\/([^/]+)\/consume$/);
  if (jcConsumeMatch && method === 'POST') {
    return handleJobCardConsumePost(request, decodeURIComponent(jcConsumeMatch[1]), db);
  }
  const jcInspMatch = pathname.match(/^\/api\/jobcards\/([^/]+)\/inspection$/);
  if (jcInspMatch && method === 'POST') {
    return handleJobCardInspectionPost(request, decodeURIComponent(jcInspMatch[1]), db);
  }
  const jcMatch = pathname.match(/^\/api\/jobcards\/([^/]+)$/);
  if (jcMatch) {
    const id = decodeURIComponent(jcMatch[1]);
    if (method === 'GET') return handleJobCardByIdGet(id, db);
    if (method === 'PUT') return handleJobCardByIdPut(request, id, db);
  }

  if (pathname === '/api/invoices') {
    if (method === 'GET') return handleInvoicesGet(request, db);
    if (method === 'POST') return handleInvoicesPost(request, db);
  }
  const invMatch = pathname.match(/^\/api\/invoices\/([^/]+)$/);
  if (invMatch) {
    const id = decodeURIComponent(invMatch[1]);
    if (method === 'GET') return handleInvoiceByIdGet(id, db);
    if (method === 'DELETE') return handleInvoiceByIdDelete(id, db);
  }

  if (pathname === '/api/payments') {
    if (method === 'GET') return handlePaymentsGet(request, db);
    if (method === 'POST') return handlePaymentsPost(request, db);
  }

  if (pathname === '/api/expenses') {
    if (method === 'GET') return handleExpensesGet(request, db);
    if (method === 'POST') return handleExpensesPost(request, db);
  }

  if (pathname === '/api/inventory') {
    if (method === 'GET') return handleInventoryGet(request, db);
    if (method === 'POST') return handleInventoryPost(request, db);
    if (method === 'PUT') return handleInventoryPut(request, db);
  }

  if (pathname === '/api/inventory/transaction' && method === 'POST') {
    return handleInventoryTransactionPost(request, db);
  }

  if (pathname === '/api/suppliers') {
    if (method === 'GET') return handleSuppliersGet(db);
    if (method === 'POST') return handleSuppliersPost(request, db);
  }

  if (pathname === '/api/purchases') {
    if (method === 'GET') return handlePurchasesGet(request, db);
    if (method === 'POST') return handlePurchasesPost(request, db);
  }

  if (pathname === '/api/assets') {
    if (method === 'GET') return handleAssetsGet(request, db);
    if (method === 'POST') return handleAssetsPost(request, db);
    if (method === 'PUT') return handleAssetsPut(request, db);
  }

  if (pathname === '/api/assets/maintenance' && method === 'POST') {
    return handleAssetMaintenancePost(request, db);
  }

  if (pathname === '/api/employees') {
    if (method === 'GET') return handleEmployeesGet(request, db);
    if (method === 'POST') return handleEmployeesPost(request, db);
  }

  if (pathname === '/api/attendance') {
    if (method === 'GET') return handleAttendanceGet(request, db);
    if (method === 'POST') return handleAttendancePost(request, db);
  }

  if (pathname === '/api/leave') {
    if (method === 'GET') return handleLeaveGet(request, db);
    if (method === 'POST') return handleLeavePost(request, db);
    if (method === 'PUT') return handleLeavePut(request, db);
  }

  if (pathname === '/api/warranties') {
    if (method === 'GET') return handleWarrantiesGet(request, db);
    if (method === 'POST') return handleWarrantiesPost(request, db);
  }
  const warClaimMatch = pathname.match(/^\/api\/warranties\/([^/]+)\/claim$/);
  if (warClaimMatch && method === 'POST') {
    return handleWarrantyClaimPost(request, decodeURIComponent(warClaimMatch[1]), db);
  }

  if (pathname === '/api/reminders') {
    if (method === 'GET') return handleRemindersGet(request, db);
    if (method === 'POST') return handleRemindersPost(request, db);
    if (method === 'PUT') return handleRemindersPut(request, db);
  }

  if (pathname === '/api/reminders/notify' && method === 'POST') {
    return handleReminderNotifyPost(request, db);
  }

  if (pathname === '/api/loyalty') {
    if (method === 'GET') return handleLoyaltyGet(db);
    if (method === 'POST') return handleLoyaltyPost(request, db);
  }

  if (pathname === '/api/communications') {
    if (method === 'GET') return handleCommunicationsGet(request, db);
    if (method === 'POST') return handleCommunicationsPost(request, db);
  }

  if (pathname === '/api/reports' && method === 'GET') {
    return handleReportsGet(request, db);
  }

  return errorResponse(`API route not found: ${method} ${pathname}`, 404);
}
