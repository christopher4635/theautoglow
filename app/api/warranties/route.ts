export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const vehicleId = searchParams.get('vehicle_id');
    const search = searchParams.get('search');

    const todayStr = new Date().toISOString().split('T')[0];

    let query = `
      SELECT w.*,
             c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model,
             j.job_card_number,
             i.invoice_number,
             CASE
               WHEN date(w.end_date) < date(?) THEN 'Expired'
               WHEN date(w.end_date) <= date(?, '+30 days') THEN 'Expiring Soon'
               ELSE w.status
             END as calculated_status,
             CAST((julianday(w.end_date) - julianday(?)) AS INTEGER) as days_remaining
      FROM warranties w
      JOIN customers c ON w.customer_id = c.id
      JOIN vehicles v ON w.vehicle_id = v.id
      LEFT JOIN job_cards j ON w.job_card_id = j.id
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [todayStr, todayStr, todayStr];

    if (status) {
      if (status === 'Expiring Soon') {
        query += ` AND date(w.end_date) BETWEEN date(?) AND date(?, '+30 days') AND w.status != 'Voided'`;
        params.push(todayStr, todayStr);
      } else if (status === 'Expired') {
        query += ` AND date(w.end_date) < date(?)`;
        params.push(todayStr);
      } else {
        query += ` AND w.status = ?`;
        params.push(status);
      }
    }

    if (customerId) {
      query += ` AND w.customer_id = ?`;
      params.push(customerId);
    }

    if (vehicleId) {
      query += ` AND w.vehicle_id = ?`;
      params.push(vehicleId);
    }

    if (search) {
      query += ` AND (w.certificate_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ? OR v.reg_number LIKE ? OR w.service_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY w.end_date ASC`;

    const warranties = db.prepare(query).all(...params);

    // Fetch claims for each warranty
    const claimsStmt = db.prepare(`SELECT * FROM warranty_claims WHERE warranty_id = ? ORDER BY claim_date DESC`);
    const result = warranties.map((w: any) => ({
      ...w,
      claims: claimsStmt.all(w.id),
      photos: w.photos_json ? JSON.parse(w.photos_json) : [],
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      job_card_id,
      invoice_id,
      customer_id,
      vehicle_id,
      service_id,
      service_name,
      start_date,
      duration_months,
      coverage_details,
      terms_and_conditions,
      photos,
    } = body;

    if (!customer_id || !vehicle_id || !service_name || !duration_months) {
      return NextResponse.json(
        { error: 'Customer, Vehicle, Service Name, and Duration are required for Warranty issuance.' },
        { status: 400 }
      );
    }

    const startDate = start_date || new Date().toISOString().split('T')[0];
    const months = parseInt(duration_months, 10);

    // Calculate end date
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + months);
    const endDate = d.toISOString().split('T')[0];

    const countRow = db.prepare('SELECT COUNT(*) as count FROM warranties').get() as { count: number };
    const certificate_number = `WAR-AGS-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `war-${Date.now()}`;

    db.prepare(`
      INSERT INTO warranties (
        id, certificate_number, job_card_id, invoice_id, customer_id, vehicle_id,
        service_id, service_name, start_date, end_date, duration_months,
        coverage_details, terms_and_conditions, status, photos_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
    `).run(
      id,
      certificate_number,
      job_card_id || null,
      invoice_id || null,
      customer_id,
      vehicle_id,
      service_id || null,
      service_name,
      startDate,
      endDate,
      months,
      coverage_details || 'Full warranty against coating peeling, flaking, or manufacturer PPF defect.',
      terms_and_conditions || 'Periodic maintenance wash at The Autoglow Sikkim required every 6 months to maintain warranty validity.',
      photos ? JSON.stringify(photos) : null
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, 'Admin', 'WARRANTY_ISSUE', 'warranty', ?, ?)
    `).run(`aud-${Date.now()}`, id, JSON.stringify({ certificate_number, customer_id, vehicle_id, service_name }));

    return NextResponse.json({ success: true, certificate_number, id, start_date: startDate, end_date: endDate }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
