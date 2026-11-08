export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
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

    const products = db.prepare(query).all(...params);

    // Categories
    const categories = db.prepare('SELECT DISTINCT category FROM inventory_products ORDER BY category ASC').all();

    // Inventory metrics
    const metrics = {
      total_products: products.length,
      low_stock_count: products.filter((p: any) => p.stock_status === 'Low Stock').length,
      out_of_stock_count: products.filter((p: any) => p.stock_status === 'Out of Stock').length,
      total_stock_value: products.reduce((acc: number, p: any) => acc + (p.total_inventory_value || 0), 0),
    };

    return NextResponse.json({ products, categories, metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: 'SKU, Name, Category, Brand, Unit, and Purchase Price are required.' },
        { status: 400 }
      );
    }

    // Check SKU duplicate
    const existing = db.prepare('SELECT id FROM inventory_products WHERE sku = ?').get(sku.trim().toUpperCase());
    if (existing) {
      return NextResponse.json({ error: `Product with SKU ${sku} already exists.` }, { status: 409 });
    }

    const id = `prod-${Date.now()}`;
    const initialStock = current_stock ? parseFloat(current_stock) : 0;
    const purPrice = parseFloat(purchase_price);

    const prodTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO inventory_products (
          id, sku, name, category, brand, unit, purchase_price, selling_price,
          current_stock, min_stock_level, supplier_id, storage_location,
          batch_number, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        sku.trim().toUpperCase(),
        name.trim(),
        category.trim(),
        brand.trim(),
        unit.trim(),
        purPrice,
        selling_price ? parseFloat(selling_price) : purPrice * 1.5,
        initialStock,
        min_stock_level ? parseFloat(min_stock_level) : 5,
        supplier_id || null,
        storage_location?.trim() || null,
        batch_number?.trim() || null,
        expiry_date || null
      );

      // If initial stock > 0, log transaction
      if (initialStock > 0) {
        db.prepare(`
          INSERT INTO stock_transactions (
            id, product_id, transaction_type, quantity, unit_price, notes, recorded_by
          ) VALUES (?, ?, 'Purchase', ?, ?, 'Initial stock setup', 'Admin')
        `).run(`st-${Date.now()}`, id, initialStock, purPrice);
      }
    });

    prodTx();

    const created = db.prepare('SELECT * FROM inventory_products WHERE id = ?').get(id);
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
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    db.prepare(`
      UPDATE inventory_products
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
      WHERE id = ?
    `).run(
      name,
      category,
      brand,
      unit,
      purchase_price !== undefined ? parseFloat(purchase_price) : null,
      selling_price !== undefined ? parseFloat(selling_price) : null,
      min_stock_level !== undefined ? parseFloat(min_stock_level) : null,
      supplier_id,
      storage_location,
      batch_number,
      expiry_date,
      id
    );

    const updated = db.prepare('SELECT * FROM inventory_products WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
