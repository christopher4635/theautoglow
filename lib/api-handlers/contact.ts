import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleContactGet(db: DbClient): Promise<Response> {
  try {
    const rows = await db.all<any>(
      `SELECT key, value FROM business_settings 
       WHERE key IN (
         'business_name', 'tagline', 'contact_phone', 'contact_whatsapp',
         'contact_email', 'contact_address', 'working_hours', 'address', 'phone', 'email'
       )`
    );

    const contact: Record<string, string> = {
      business_name: 'The Autoglow Sikkim',
      tagline: 'Premium Detailing & Surface Protection Studio',
      contact_phone: '+91 98320 12345',
      contact_whatsapp: '+91 98320 12345',
      contact_email: 'info@theautoglow.in',
      contact_address: 'National Highway 10, Near Deorali, Gangtok, Sikkim - 737101',
      working_hours: 'Monday – Saturday: 9:00 AM – 7:30 PM (Sunday Closed)',
    };

    for (const r of rows) {
      if (r.value) {
        contact[r.key] = r.value;
      }
    }

    if (!contact.contact_phone && contact.phone) contact.contact_phone = contact.phone;
    if (!contact.contact_email && contact.email) contact.contact_email = contact.email;
    if (!contact.contact_address && contact.address) contact.contact_address = contact.address;

    return jsonResponse(contact);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleContactPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { name, phone, email, vehicle_model, service_requested, message } = body;

    if (!name || !phone) {
      return errorResponse('Name and Phone number are required.', 400);
    }

    const cleanPhone = String(phone).trim();
    const id = `inq-${Date.now()}`;

    await db.run(
      `INSERT INTO contact_inquiries (
        id, name, phone, email, vehicle_model, service_requested, message, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'New')`,
      id,
      String(name).trim(),
      cleanPhone,
      email?.trim() || null,
      vehicle_model?.trim() || null,
      service_requested || 'General Detailing Inquiry',
      message?.trim() || null
    );

    await db.run(
      `INSERT INTO notifications (id, title, message, category, link_url, is_read)
       VALUES (?, ?, ?, 'lead', '/customers', 0)`,
      `notif-${Date.now()}`,
      `New Website Lead: ${String(name).trim()}`,
      `Phone: ${cleanPhone} | Vehicle: ${vehicle_model || 'Not specified'} | Service: ${service_requested || 'Inquiry'}`
    );

    return jsonResponse({
      success: true,
      message: 'Thank you for reaching out! The Autoglow Sikkim team will contact you shortly.',
      inquiryId: id,
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
