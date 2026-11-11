import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleAssetsGet(request: Request, db: DbClient): Promise<Response> {
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

    const assets = await db.all<any>(query, ...params);

    const result = await Promise.all(
      assets.map(async (ast) => ({
        ...ast,
        maintenance_history: await db.all(
          'SELECT * FROM asset_maintenance WHERE asset_id = ? ORDER BY maintenance_date DESC',
          ast.id
        ),
        movements: await db.all(
          'SELECT * FROM asset_movements WHERE asset_id = ? ORDER BY movement_date DESC',
          ast.id
        ),
      }))
    );

    const summary = {
      total_assets: assets.length,
      total_purchase_value: assets.reduce((acc, a) => acc + (a.purchase_price || 0), 0),
      total_maintenance_expenditure: assets.reduce((acc, a) => acc + (a.total_maintenance_spent || 0), 0),
      in_use_count: assets.filter((a) => a.status === 'In Use').length,
      under_maintenance_count: assets.filter(
        (a) => a.status === 'Under Maintenance' || a.condition === 'Maintenance Required'
      ).length,
    };

    return jsonResponse({ assets: result, summary });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleAssetsPost(request: Request, db: DbClient): Promise<Response> {
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
      return errorResponse('Asset Name, Category, Brand, and Purchase Date are required.', 400);
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM assets');
    const asset_code = `AST-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `ast-${Date.now()}`;

    await db.run(
      `INSERT INTO assets (
        id, asset_code, name, category, brand, model, serial_number,
        purchase_date, purchase_price, supplier_id, warranty_expiry,
        location, assigned_employee_id, condition, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      asset_code,
      String(name).trim(),
      String(category).trim(),
      String(brand).trim(),
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

    const created = await db.get('SELECT * FROM assets WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleAssetsPut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { id, name, condition, status, location, assigned_employee_id, warranty_expiry } = body;

    if (!id) {
      return errorResponse('Asset ID is required.', 400);
    }

    await db.run(
      `UPDATE assets
       SET name = COALESCE(?, name),
           condition = COALESCE(?, condition),
           status = COALESCE(?, status),
           location = COALESCE(?, location),
           assigned_employee_id = COALESCE(?, assigned_employee_id),
           warranty_expiry = COALESCE(?, warranty_expiry)
       WHERE id = ?`,
      name ?? null,
      condition ?? null,
      status ?? null,
      location ?? null,
      assigned_employee_id ?? null,
      warranty_expiry ?? null,
      id
    );

    const updated = await db.get('SELECT * FROM assets WHERE id = ?', id);
    return jsonResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleAssetMaintenancePost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const {
      asset_id,
      maintenance_date,
      maintenance_type,
      service_provider,
      cost,
      next_service_due,
      remarks,
      updated_condition,
    } = body;

    if (!asset_id || !maintenance_date || !maintenance_type || !service_provider) {
      return errorResponse('Asset, Maintenance Date, Type, and Service Provider are required.', 400);
    }

    const id = `mnt-${Date.now()}`;
    const mntCost = cost ? parseFloat(cost) : 0;

    await db.run(
      `INSERT INTO asset_maintenance (
        id, asset_id, maintenance_date, maintenance_type, service_provider,
        cost, next_service_due, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      asset_id,
      maintenance_date,
      String(maintenance_type).trim(),
      String(service_provider).trim(),
      mntCost,
      next_service_due || null,
      remarks?.trim() || null
    );

    await db.run(
      `UPDATE assets SET condition = COALESCE(?, condition), status = 'Available' WHERE id = ?`,
      updated_condition || 'Good',
      asset_id
    );

    if (mntCost > 0) {
      const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM expenses');
      const expNumber = `EXP-MNT-${new Date().getFullYear()}-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
      const asset = await db.get<any>('SELECT name, asset_code FROM assets WHERE id = ?', asset_id);

      await db.run(
        `INSERT INTO expenses (
          id, expense_number, expense_date, category, description, amount,
          payment_method, vendor, recorded_by
        ) VALUES (?, ?, ?, 'Equipment Maintenance', ?, ?, 'UPI', ?, 'Floor Manager')`,
        `exp-${Date.now()}`,
        expNumber,
        maintenance_date,
        `Maintenance for ${asset?.name || 'Asset'} (${asset?.asset_code}): ${maintenance_type}`,
        mntCost,
        service_provider
      );
    }

    return jsonResponse({ success: true, id }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
