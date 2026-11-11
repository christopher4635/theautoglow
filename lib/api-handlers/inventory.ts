import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleInventoryGet(request: Request, db: DbClient): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('low_stock');
    const search = searchParams.get('search');

    let query = `
      SELECT p.*, s.name as supplier_name,
        CASE
          WHEN p.current_stock <= 0 THEN 'Out of Stock'
          WHEN p.current_stock <= p.min_stock_level THEN 'Low Stock'
          ELSE 'Adequate'
        END as stock_status,
        (p.current_stock * p.purchase_price) as total_inventory_value
      FROM inventory_products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    if (lowStockOnly === 'true') {
      query += ` AND p.current_stock <= p.min_stock_level`;
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.category LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY p.name ASC`;

    const [products, categories] = await Promise.all([
      db.all<any>(query, ...params),
      db.all('SELECT DISTINCT category FROM inventory_products ORDER BY category ASC'),
    ]);

    const metrics = {
      total_products: products.length,
      low_stock_count: products.filter((p) => p.stock_status === 'Low Stock').length,
      out_of_stock_count: products.filter((p) => p.stock_status === 'Out of Stock').length,
      total_stock_value: products.reduce((acc, p) => acc + (p.total_inventory_value || 0), 0),
    };

    return jsonResponse({ products, categories, metrics });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleInventoryPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const {
      sku,
      name,
      category,
      brand,
      unit,
      purchase_price,
      selling_price,
      current_stock,
      min_stock_level,
      supplier_id,
      storage_location,
      batch_number,
      expiry_date,
    } = body;

    if (!sku || !name || !category || !brand || !unit || purchase_price === undefined) {
      return errorResponse('SKU, Name, Category, Brand, Unit, and Purchase Price are required.', 400);
    }

    const cleanSku = String(sku).trim().toUpperCase();
    const existing = await db.get('SELECT id FROM inventory_products WHERE sku = ?', cleanSku);
    if (existing) {
      return errorResponse(`Product with SKU ${sku} already exists.`, 409);
    }

    const id = `prod-${Date.now()}`;
    const initialStock = current_stock ? parseFloat(current_stock) : 0;
    const purPrice = parseFloat(purchase_price);

    await db.run(
      `INSERT INTO inventory_products (
        id, sku, name, category, brand, unit, purchase_price, selling_price,
        current_stock, min_stock_level, supplier_id, storage_location,
        batch_number, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      cleanSku,
      String(name).trim(),
      String(category).trim(),
      String(brand).trim(),
      String(unit).trim(),
      purPrice,
      selling_price ? parseFloat(selling_price) : purPrice * 1.5,
      initialStock,
      min_stock_level ? parseFloat(min_stock_level) : 5,
      supplier_id || null,
      storage_location?.trim() || null,
      batch_number?.trim() || null,
      expiry_date || null
    );

    if (initialStock > 0) {
      await db.run(
        `INSERT INTO stock_transactions (
          id, product_id, transaction_type, quantity, unit_price, notes, recorded_by
        ) VALUES (?, ?, 'Purchase', ?, ?, 'Initial stock setup', 'Admin')`,
        `st-${Date.now()}`,
        id,
        initialStock,
        purPrice
      );
    }

    const created = await db.get('SELECT * FROM inventory_products WHERE id = ?', id);
    return jsonResponse(created, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleInventoryPut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const {
      id,
      name,
      category,
      brand,
      unit,
      purchase_price,
      selling_price,
      min_stock_level,
      supplier_id,
      storage_location,
      batch_number,
      expiry_date,
    } = body;

    if (!id) {
      return errorResponse('Product ID is required.', 400);
    }

    await db.run(
      `UPDATE inventory_products
       SET name = COALESCE(?, name),
           category = COALESCE(?, category),
           brand = COALESCE(?, brand),
           unit = COALESCE(?, unit),
           purchase_price = COALESCE(?, purchase_price),
           selling_price = COALESCE(?, selling_price),
           min_stock_level = COALESCE(?, min_stock_level),
           supplier_id = COALESCE(?, supplier_id),
           storage_location = COALESCE(?, storage_location),
           batch_number = COALESCE(?, batch_number),
           expiry_date = COALESCE(?, expiry_date),
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      name ?? null,
      category ?? null,
      brand ?? null,
      unit ?? null,
      purchase_price !== undefined ? parseFloat(purchase_price) : null,
      selling_price !== undefined ? parseFloat(selling_price) : null,
      min_stock_level !== undefined ? parseFloat(min_stock_level) : null,
      supplier_id ?? null,
      storage_location ?? null,
      batch_number ?? null,
      expiry_date ?? null,
      id
    );

    const updated = await db.get('SELECT * FROM inventory_products WHERE id = ?', id);
    return jsonResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleInventoryTransactionPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { product_id, transaction_type, quantity, unit_price, notes, recorded_by } = body;

    const qty = parseFloat(quantity);
    if (!product_id || !transaction_type || isNaN(qty) || qty === 0) {
      return errorResponse('Valid Product, Transaction Type, and Quantity are required.', 400);
    }

    const product = await db.get<any>('SELECT * FROM inventory_products WHERE id = ?', product_id);
    if (!product) {
      return errorResponse('Product not found.', 404);
    }

    let newStock = product.current_stock;
    if (transaction_type === 'Purchase' || transaction_type === 'Return') {
      newStock += qty;
    } else if (transaction_type === 'Issue' || transaction_type === 'Consumption' || transaction_type === 'Damaged') {
      if (product.current_stock < qty) {
        return errorResponse(
          `Cannot reduce stock by ${qty}. Current stock is only ${product.current_stock} ${product.unit}. Never allow negative stock.`,
          400
        );
      }
      newStock -= qty;
    } else if (transaction_type === 'Adjustment') {
      newStock = qty;
    }

    const txId = `st-${Date.now()}`;
    const price = unit_price !== undefined ? parseFloat(unit_price) : product.purchase_price;

    await db.run(
      `UPDATE inventory_products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      newStock,
      product_id
    );

    await db.run(
      `INSERT INTO stock_transactions (
        id, product_id, transaction_type, quantity, unit_price, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      txId,
      product_id,
      transaction_type,
      qty,
      price,
      notes?.trim() || null,
      recorded_by || 'Admin'
    );

    return jsonResponse({
      success: true,
      new_stock: newStock,
      message: `Stock for ${product.name} updated to ${newStock} ${product.unit}.`,
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
