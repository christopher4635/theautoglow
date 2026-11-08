export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const activeOnly = searchParams.get('active_only');

    let query = `
      SELECT s.*, c.name as category_name
      FROM services s
      JOIN service_categories c ON s.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (categoryId) {
      query += ` AND s.category_id = ?`;
      params.push(categoryId);
    }

    if (activeOnly === 'true') {
      query += ` AND s.is_active = 1`;
    }

    query += ` ORDER BY c.display_order ASC, s.name ASC`;

    const services = db.prepare(query).all(...params).map((srv: any) => ({
      ...srv,
      pricing_by_category: srv.pricing_by_category_json ? JSON.parse(srv.pricing_by_category_json) : {},
      required_consumables: srv.required_consumables_json ? JSON.parse(srv.required_consumables_json) : [],
    }));

    const categories = db.prepare('SELECT * FROM service_categories ORDER BY display_order ASC').all();

    return NextResponse.json({ services, categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      category_id,
      description,
      standard_price,
      pricing_by_category,
      duration_mins,
      required_consumables,
      warranty_duration_days,
      maintenance_interval_days,
    } = body;

    if (!name || !category_id || standard_price === undefined) {
      return NextResponse.json({ error: 'Name, Category, and Standard Price are required.' }, { status: 400 });
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
    const service_code = `SRV-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `srv-${Date.now()}`;

    db.prepare(`
      INSERT INTO services (
        id, service_code, category_id, name, description, standard_price,
        pricing_by_category_json, duration_mins, required_consumables_json,
        warranty_duration_days, maintenance_interval_days, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      service_code,
      category_id,
      name.trim(),
      description?.trim() || null,
      parseFloat(standard_price),
      pricing_by_category ? JSON.stringify(pricing_by_category) : null,
      duration_mins ? parseInt(duration_mins, 10) : 120,
      required_consumables ? JSON.stringify(required_consumables) : null,
      warranty_duration_days ? parseInt(warranty_duration_days, 10) : 0,
      maintenance_interval_days ? parseInt(maintenance_interval_days, 10) : 30
    );

    const created = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      category_id,
      description,
      standard_price,
      pricing_by_category,
      duration_mins,
      required_consumables,
      warranty_duration_days,
      maintenance_interval_days,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    db.prepare(`
      UPDATE services
      SET name = COALESCE(?, name),
          category_id = COALESCE(?, category_id),
          description = COALESCE(?, description),
          standard_price = COALESCE(?, standard_price),
          pricing_by_category_json = COALESCE(?, pricing_by_category_json),
          duration_mins = COALESCE(?, duration_mins),
          required_consumables_json = COALESCE(?, required_consumables_json),
          warranty_duration_days = COALESCE(?, warranty_duration_days),
          maintenance_interval_days = COALESCE(?, maintenance_interval_days),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      name,
      category_id,
      description,
      standard_price !== undefined ? parseFloat(standard_price) : null,
      pricing_by_category ? JSON.stringify(pricing_by_category) : null,
      duration_mins !== undefined ? parseInt(duration_mins, 10) : null,
      required_consumables ? JSON.stringify(required_consumables) : null,
      warranty_duration_days !== undefined ? parseInt(warranty_duration_days, 10) : null,
      maintenance_interval_days !== undefined ? parseInt(maintenance_interval_days, 10) : null,
      is_active !== undefined ? is_active : null,
      id
    );

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
