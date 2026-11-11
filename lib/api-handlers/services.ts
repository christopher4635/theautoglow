import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleServicesGet(request: Request, db: DbClient): Promise<Response> {
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

    const rawServices = await db.all<any>(query, ...params);
    const services = rawServices.map((srv) => ({
      ...srv,
      pricing_by_category: srv.pricing_by_category_json ? JSON.parse(srv.pricing_by_category_json) : {},
      required_consumables: srv.required_consumables_json ? JSON.parse(srv.required_consumables_json) : [],
    }));

    const categories = await db.all('SELECT * FROM service_categories ORDER BY display_order ASC');
    return jsonResponse({ services, categories });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleServicesPost(request: Request, db: DbClient): Promise<Response> {
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
      return errorResponse('Name, Category, and Standard Price are required.', 400);
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM services');
    const service_code = `SRV-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `srv-${Date.now()}`;

    await db.run(
      `INSERT INTO services (
        id, service_code, category_id, name, description, standard_price,
        pricing_by_category_json, duration_mins, required_consumables_json,
        warranty_duration_days, maintenance_interval_days, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      id,
      service_code,
      category_id,
      String(name).trim(),
      description?.trim() || null,
      parseFloat(standard_price),
      pricing_by_category ? JSON.stringify(pricing_by_category) : null,
      duration_mins ? parseInt(duration_mins, 10) : 120,
      required_consumables ? JSON.stringify(required_consumables) : null,
      warranty_duration_days ? parseInt(warranty_duration_days, 10) : 0,
      maintenance_interval_days ? parseInt(maintenance_interval_days, 10) : 30
    );

    const created = await db.get('SELECT * FROM services WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleServicesPut(request: Request, db: DbClient): Promise<Response> {
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
      return errorResponse('Service ID is required', 400);
    }

    await db.run(
      `UPDATE services
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
       WHERE id = ?`,
      name ?? null,
      category_id ?? null,
      description ?? null,
      standard_price !== undefined ? parseFloat(standard_price) : null,
      pricing_by_category ? JSON.stringify(pricing_by_category) : null,
      duration_mins !== undefined ? parseInt(duration_mins, 10) : null,
      required_consumables ? JSON.stringify(required_consumables) : null,
      warranty_duration_days !== undefined ? parseInt(warranty_duration_days, 10) : null,
      maintenance_interval_days !== undefined ? parseInt(maintenance_interval_days, 10) : null,
      is_active !== undefined ? is_active : null,
      id
    );

    const updated = await db.get('SELECT * FROM services WHERE id = ?', id);
    return jsonResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
