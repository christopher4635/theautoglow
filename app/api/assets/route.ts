export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const condition = searchParams.get('condition');
    const search = searchParams.get('search');

    let query = `
      SELECT a.*, s.name as supplier_name, e.name as assigned_employee_name,
        (SELECT MAX(maintenance_date) FROM asset_maintenance WHERE asset_id = a.id) as last_maintenance_date,
        (SELECT next_service_due FROM asset_maintenance WHERE asset_id = a.id ORDER BY maintenance_date DESC LIMIT 1) as next_maintenance_due,
        (SELECT COALESCE(SUM(cost), 0) FROM asset_maintenance WHERE asset_id = a.id) as total_maintenance_spent
      FROM assets a
      LEFT JOIN suppliers s ON a.supplier_id = s.id
      LEFT JOIN employees e ON a.assigned_employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      query += ` AND a.category = ?`;
      params.push(category);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (condition) {
      query += ` AND a.condition = ?`;
      params.push(condition);
    }

    if (search) {
      query += ` AND (a.name LIKE ? OR a.asset_code LIKE ? OR a.brand LIKE ? OR a.model LIKE ? OR a.location LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY a.created_at DESC`;

    const assets = db.prepare(query).all(...params);

    // Attach maintenance logs and movement history
    const mntStmt = db.prepare('SELECT * FROM asset_maintenance WHERE asset_id = ? ORDER BY maintenance_date DESC');
    const movStmt = db.prepare('SELECT * FROM asset_movements WHERE asset_id = ? ORDER BY movement_date DESC');

    const result = assets.map((ast: any) => ({
      ...ast,
      maintenance_history: mntStmt.all(ast.id),
      movements: movStmt.all(ast.id),
    }));

    // Asset summary
    const summary = {
      total_assets: assets.length,
      total_purchase_value: assets.reduce((acc: number, a: any) => acc + (a.purchase_price || 0), 0),
      total_maintenance_expenditure: assets.reduce((acc: number, a: any) => acc + (a.total_maintenance_spent || 0), 0),
      in_use_count: assets.filter((a: any) => a.status === 'In Use').length,
      under_maintenance_count: assets.filter((a: any) => a.status === 'Under Maintenance' || a.condition === 'Maintenance Required').length,
    };

    return NextResponse.json({ assets: result, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_price,
      supplier_id,
      warranty_expiry,
      location,
      assigned_employee_id,
      condition,
      status,
    } = body;

    if (!name || !category || !brand || !purchase_date) {
      return NextResponse.json(
        { error: 'Asset Name, Category, Brand, and Purchase Date are required.' },
        { status: 400 }
      );
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM assets').get() as { count: number };
    const asset_code = `AST-${String(countRow.count + 1).padStart(3, '0')}`;
    const id = `ast-${Date.now()}`;

    db.prepare(`
      INSERT INTO assets (
        id, asset_code, name, category, brand, model, serial_number,
        purchase_date, purchase_price, supplier_id, warranty_expiry,
        location, assigned_employee_id, condition, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      asset_code,
      name.trim(),
      category.trim(),
      brand.trim(),
      model?.trim() || null,
      serial_number?.trim() || null,
      purchase_date,
      purchase_price ? parseFloat(purchase_price) : 0,
      supplier_id || null,
      warranty_expiry || null,
      location || 'Shop Floor',
      assigned_employee_id || null,
      condition || 'Good',
      status || 'Available'
    );

    const created = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, condition, status, location, assigned_employee_id, warranty_expiry } = body;

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required.' }, { status: 400 });
    }

    db.prepare(`
      UPDATE assets
      SET name = COALESCE(?, name),
          condition = COALESCE(?, condition),
          status = COALESCE(?, status),
          location = COALESCE(?, location),
          assigned_employee_id = COALESCE(?, assigned_employee_id),
          warranty_expiry = COALESCE(?, warranty_expiry)
      WHERE id = ?
    `).run(name, condition, status, location, assigned_employee_id, warranty_expiry, id);

    const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
