export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rows = db.prepare(`
      SELECT key, value FROM business_settings 
      WHERE key IN (
        'business_name', 'tagline', 'contact_phone', 'contact_whatsapp',
        'contact_email', 'contact_address', 'working_hours', 'address', 'phone', 'email'
      )
    `).all() as any[];

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

    // Fallbacks if specific contact keys aren't set yet
    if (!contact.contact_phone && contact.phone) contact.contact_phone = contact.phone;
    if (!contact.contact_email && contact.email) contact.contact_email = contact.email;
    if (!contact.contact_address && contact.address) contact.contact_address = contact.address;

    return NextResponse.json(contact);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, vehicle_model, service_requested, message } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and Phone number are required.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const id = `inq-${Date.now()}`;

    db.prepare(`
      INSERT INTO contact_inquiries (
        id, name, phone, email, vehicle_model, service_requested, message, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'New')
    `).run(
      id,
      name.trim(),
      cleanPhone,
      email?.trim() || null,
      vehicle_model?.trim() || null,
      service_requested || 'General Detailing Inquiry',
      message?.trim() || null
    );

    // Create a dashboard notification so Abhinay & Manager see the inquiry immediately
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, link_url, is_read)
      VALUES (?, ?, ?, 'lead', '/customers', 0)
    `).run(
      `notif-${Date.now()}`,
      `New Website Lead: ${name.trim()}`,
      `Phone: ${cleanPhone} | Vehicle: ${vehicle_model || 'Not specified'} | Service: ${service_requested || 'Inquiry'}`
    );

    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out! The Autoglow Sikkim team will contact you shortly.',
      inquiryId: id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
