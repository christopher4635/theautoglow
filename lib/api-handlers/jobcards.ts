import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleJobCardsGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const customerId = searchParams.get('customer_id');
    const vehicleId = searchParams.get('vehicle_id');

    let query = `
      SELECT j.*,
             c.name as customer_name, c.mobile as customer_mobile,
             v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, v.color as vehicle_color,
             b.name as bay_name,
             e.name as primary_staff_name,
             i.id as invoice_id, i.invoice_number, i.total_amount as invoice_total, i.balance_amount as invoice_balance, i.payment_status as invoice_payment_status
      FROM job_cards j
      JOIN customers c ON j.customer_id = c.id
      JOIN vehicles v ON j.vehicle_id = v.id
      LEFT JOIN service_bays b ON j.bay_id = b.id
      LEFT JOIN employees e ON j.primary_staff_id = e.id
      LEFT JOIN invoices i ON i.job_card_id = j.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND j.status = ?`;
      params.push(status);
    }

    if (customerId) {
      query += ` AND j.customer_id = ?`;
      params.push(customerId);
    }

    if (vehicleId) {
      query += ` AND j.vehicle_id = ?`;
      params.push(vehicleId);
    }

    if (search) {
      query += ` AND (j.job_card_number LIKE ? OR v.reg_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY j.created_at DESC`;

    const jobCards = await db.all<any>(query, ...params);

    const result = await Promise.all(
      jobCards.map(async (jc) => ({
        ...jc,
        services: await db.all('SELECT * FROM job_card_services WHERE job_card_id = ?', jc.id),
      }))
    );

    return jsonResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleJobCardsPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const {
      customer_id,
      vehicle_id,
      appointment_id,
      bay_id,
      primary_staff_id,
      odometer_in,
      fuel_level,
      remarks,
      estimated_completion,
      service_items,
      assigned_employee_ids,
      intake_inspection,
    } = body;

    if (!customer_id || !vehicle_id) {
      return errorResponse('Customer and Vehicle are required.', 400);
    }

    const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM job_cards');
    const job_card_number = `JC-AGS-${String((countRow?.count ?? 0) + 1).padStart(3, '0')}`;
    const id = `jc-${Date.now()}`;

    await db.run(
      `INSERT INTO job_cards (
        id, job_card_number, customer_id, vehicle_id, appointment_id, bay_id,
        primary_staff_id, status, odometer_in, fuel_level, remarks,
        estimated_completion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Vehicle Received', ?, ?, ?, ?)`,
      id,
      job_card_number,
      customer_id,
      vehicle_id,
      appointment_id || null,
      bay_id || null,
      primary_staff_id || null,
      odometer_in ? parseInt(odometer_in, 10) : 0,
      fuel_level || '1/2',
      remarks?.trim() || null,
      estimated_completion || null
    );

    if (odometer_in) {
      await db.run('UPDATE vehicles SET odometer = ? WHERE id = ?', parseInt(odometer_in, 10), vehicle_id);
    }

    if (Array.isArray(service_items) && service_items.length > 0) {
      for (const item of service_items) {
        await db.run(
          `INSERT INTO job_card_services (id, job_card_id, service_id, service_name, price, status)
           VALUES (?, ?, ?, ?, ?, 'Pending')`,
          `jcs-${Date.now()}-${Math.random()}`,
          id,
          item.service_id,
          item.service_name,
          item.price || 0
        );
      }
    }

    if (Array.isArray(assigned_employee_ids)) {
      for (const assign of assigned_employee_ids) {
        await db.run(
          `INSERT INTO job_assignments (id, job_card_id, employee_id, role_in_job)
           VALUES (?, ?, ?, ?)`,
          `ja-${Date.now()}-${Math.random()}`,
          id,
          assign.employee_id,
          assign.role || 'Detailer'
        );
      }
    }

    if (intake_inspection) {
      await db.run(
        `INSERT INTO vehicle_inspections (
          id, job_card_id, inspection_type, scratches_json, dents_json,
          paint_condition, interior_condition, wheel_condition, glass_condition,
          accessories_checked_json, photos_json, customer_acknowledged, customer_signature, notes
        ) VALUES (?, ?, 'intake', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        `insp-${Date.now()}`,
        id,
        JSON.stringify(intake_inspection.scratches || []),
        JSON.stringify(intake_inspection.dents || []),
        intake_inspection.paint_condition || 'Fair',
        intake_inspection.interior_condition || 'Clean',
        intake_inspection.wheel_condition || 'Good',
        intake_inspection.glass_condition || 'Good',
        JSON.stringify(intake_inspection.accessories_checked || []),
        JSON.stringify(intake_inspection.photos || []),
        intake_inspection.customer_signature || 'Acknowledged on Intake',
        intake_inspection.notes || null
      );
    }

    if (appointment_id) {
      await db.run("UPDATE appointments SET status = 'Vehicle Received' WHERE id = ?", appointment_id);
    }

    if (bay_id) {
      const veh = await db.get<any>('SELECT reg_number FROM vehicles WHERE id = ?', vehicle_id);
      await db.run(
        "UPDATE service_bays SET current_status = 'Occupied', current_job_id = ?, current_vehicle_reg = ? WHERE id = ?",
        id,
        veh?.reg_number || 'Vehicle In Bay',
        bay_id
      );
    }

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Admin', 'JOB_CARD_CREATE', 'job_card', ?, ?)`,
      `aud-${Date.now()}`,
      id,
      JSON.stringify({ job_card_number, customer_id, vehicle_id })
    );

    return jsonResponse({ success: true, job_card_number, id }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleJobCardByIdGet(id: string, db: DbClient): Promise<Response> {
  try {
    const jobCard = await db.get(
      `SELECT j.*,
              c.name as customer_name, c.mobile as customer_mobile, c.email as customer_email, c.customer_code, c.address as customer_address,
              v.reg_number as vehicle_reg, v.make || ' ' || v.model as vehicle_make_model, v.color as vehicle_color,
              v.category as vehicle_category, v.year as vehicle_year, v.fuel_type as vehicle_fuel,
              b.name as bay_name,
              e.name as primary_staff_name
       FROM job_cards j
       JOIN customers c ON j.customer_id = c.id
       JOIN vehicles v ON j.vehicle_id = v.id
       LEFT JOIN service_bays b ON j.bay_id = b.id
       LEFT JOIN employees e ON j.primary_staff_id = e.id
       WHERE j.id = ?`,
      id
    );

    if (!jobCard) {
      return errorResponse('Job Card not found', 404);
    }

    const [services, assignments, rawInspections, consumables, totalRow, invoice] = await Promise.all([
      db.all('SELECT * FROM job_card_services WHERE job_card_id = ?', id),
      db.all(
        `SELECT ja.*, e.name as employee_name, e.designation as employee_designation
         FROM job_assignments ja
         JOIN employees e ON ja.employee_id = e.id
         WHERE ja.job_card_id = ?`,
        id
      ),
      db.all<any>('SELECT * FROM vehicle_inspections WHERE job_card_id = ? ORDER BY created_at ASC', id),
      db.all(
        `SELECT sc.*, p.name as product_name, p.sku, p.unit
         FROM stock_consumptions sc
         JOIN inventory_products p ON sc.product_id = p.id
         WHERE sc.job_card_id = ?`,
        id
      ),
      db.get<{ total: number }>(
        'SELECT COALESCE(SUM(total_cost), 0) as total FROM stock_consumptions WHERE job_card_id = ?',
        id
      ),
      db.get('SELECT * FROM invoices WHERE job_card_id = ?', id),
    ]);

    const inspections = rawInspections.map((insp) => ({
      ...insp,
      scratches: insp.scratches_json ? JSON.parse(insp.scratches_json) : [],
      dents: insp.dents_json ? JSON.parse(insp.dents_json) : [],
      accessories_checked: insp.accessories_checked_json ? JSON.parse(insp.accessories_checked_json) : [],
      photos: insp.photos_json ? JSON.parse(insp.photos_json) : [],
    }));

    return jsonResponse({
      jobCard,
      services,
      assignments,
      inspections,
      consumables,
      totalConsumableCost: totalRow?.total ?? 0,
      invoice,
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleJobCardByIdPut(request: Request, id: string, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { status, work_notes, remarks, primary_staff_id, bay_id, actual_completion } = body;

    const existing = await db.get<any>('SELECT * FROM job_cards WHERE id = ?', id);
    if (!existing) {
      return errorResponse('Job Card not found', 404);
    }

    let actualCompletionVal = existing.actual_completion;
    if (status === 'Completed' || status === 'Delivered') {
      actualCompletionVal = actual_completion || new Date().toISOString().replace('T', ' ').substring(0, 16);
    }

    await db.run(
      `UPDATE job_cards
       SET status = COALESCE(?, status),
           work_notes = COALESCE(?, work_notes),
           remarks = COALESCE(?, remarks),
           primary_staff_id = COALESCE(?, primary_staff_id),
           bay_id = COALESCE(?, bay_id),
           actual_completion = ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      status ?? null,
      work_notes ?? null,
      remarks ?? null,
      primary_staff_id ?? null,
      bay_id ?? null,
      actualCompletionVal,
      id
    );

    if ((status === 'Delivered' || status === 'Cancelled') && existing.bay_id) {
      await db.run(
        "UPDATE service_bays SET current_status = 'Available', current_job_id = NULL, current_vehicle_reg = NULL WHERE id = ?",
        existing.bay_id
      );
    }

    if (bay_id && bay_id !== existing.bay_id) {
      if (existing.bay_id) {
        await db.run(
          "UPDATE service_bays SET current_status = 'Available', current_job_id = NULL, current_vehicle_reg = NULL WHERE id = ?",
          existing.bay_id
        );
      }
      const veh = await db.get<any>('SELECT reg_number FROM vehicles WHERE id = ?', existing.vehicle_id);
      await db.run(
        "UPDATE service_bays SET current_status = 'Occupied', current_job_id = ?, current_vehicle_reg = ? WHERE id = ?",
        id,
        veh?.reg_number || 'Vehicle',
        bay_id
      );
    }

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Admin', 'JOB_CARD_STATUS_UPDATE', 'job_card', ?, ?)`,
      `aud-${Date.now()}`,
      id,
      JSON.stringify({ old_status: existing.status, new_status: status })
    );

    const updated = await db.get('SELECT * FROM job_cards WHERE id = ?', id);
    return jsonResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleJobCardConsumePost(request: Request, job_card_id: string, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { product_id, quantity } = body;

    if (!product_id || !quantity || quantity <= 0) {
      return errorResponse('Valid Product and Quantity are required.', 400);
    }

    const product = await db.get<any>('SELECT * FROM inventory_products WHERE id = ?', product_id);
    if (!product) {
      return errorResponse('Product not found in inventory.', 404);
    }

    if (product.current_stock < quantity) {
      return errorResponse(
        `Insufficient stock for ${product.name}. Current stock: ${product.current_stock} ${product.unit}, requested: ${quantity} ${product.unit}. Never allow negative stock.`,
        400
      );
    }

    const job = await db.get<any>('SELECT job_card_number FROM job_cards WHERE id = ?', job_card_id);
    if (!job) {
      return errorResponse('Job Card not found.', 404);
    }

    const unit_cost = product.purchase_price;
    const total_cost = unit_cost * quantity;
    const newStock = product.current_stock - quantity;

    await db.run(
      `INSERT INTO stock_consumptions (id, job_card_id, product_id, quantity, unit_cost, total_cost)
       VALUES (?, ?, ?, ?, ?, ?)`,
      `sc-${Date.now()}`,
      job_card_id,
      product_id,
      quantity,
      unit_cost,
      total_cost
    );

    await db.run(
      `UPDATE inventory_products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      newStock,
      product_id
    );

    await db.run(
      `INSERT INTO stock_transactions (
        id, product_id, transaction_type, quantity, unit_price,
        reference_type, reference_id, notes, recorded_by
      ) VALUES (?, ?, 'Consumption', ?, ?, 'job_card', ?, ?, 'Floor Detailer')`,
      `st-${Date.now()}`,
      product_id,
      quantity,
      unit_cost,
      job_card_id,
      `Consumed for ${job.job_card_number} (${quantity} ${product.unit})`
    );

    if (newStock <= product.min_stock_level) {
      await db.run(
        `INSERT INTO notifications (id, title, message, category, link_url, is_read)
         VALUES (?, 'Low Stock Alert', ?, 'inventory', '/inventory', 0)`,
        `notif-${Date.now()}`,
        `Stock for ${product.name} is down to ${newStock} ${product.unit} (Min limit: ${product.min_stock_level}). Restock required.`
      );
    }

    return jsonResponse({
      success: true,
      message: `Allocated ${quantity} ${product.unit} of ${product.name} to Job ${job.job_card_number}. Stock updated to ${newStock}.`,
      total_cost,
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleJobCardInspectionPost(
  request: Request,
  job_card_id: string,
  db: DbClient
): Promise<Response> {
  try {
    const body = await request.json();
    const {
      inspection_type,
      scratches,
      dents,
      paint_condition,
      interior_condition,
      wheel_condition,
      glass_condition,
      accessories_checked,
      photos,
      customer_signature,
      inspector_id,
      notes,
    } = body;

    const id = `insp-${Date.now()}`;

    await db.run(
      `INSERT INTO vehicle_inspections (
        id, job_card_id, inspection_type, scratches_json, dents_json,
        paint_condition, interior_condition, wheel_condition, glass_condition,
        accessories_checked_json, photos_json, customer_acknowledged,
        customer_signature, inspector_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      id,
      job_card_id,
      inspection_type || 'post_service',
      JSON.stringify(scratches || []),
      JSON.stringify(dents || []),
      paint_condition || 'Showroom Quality',
      interior_condition || 'Immaculate',
      wheel_condition || 'Good',
      glass_condition || 'Good',
      JSON.stringify(accessories_checked || []),
      JSON.stringify(photos || []),
      customer_signature || 'Digital Handover Ack',
      inspector_id || null,
      notes || null
    );

    if (inspection_type === 'post_service') {
      await db.run(
        "UPDATE job_cards SET status = 'Completed', updated_at = datetime('now', 'localtime') WHERE id = ?",
        job_card_id
      );
    }

    return jsonResponse({ success: true, id }, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
