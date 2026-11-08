export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
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
      updated_condition, // 'Excellent', 'Good', 'Fair'
    } = body;

    if (!asset_id || !maintenance_date || !maintenance_type || !service_provider) {
      return NextResponse.json(
        { error: 'Asset, Maintenance Date, Type, and Service Provider are required.' },
        { status: 400 }
      );
    }

    const id = `mnt-${Date.now()}`;
    const mntCost = cost ? parseFloat(cost) : 0;

    const mntTx = db.transaction(() => {
      // 1. Record maintenance log
      db.prepare(`
        INSERT INTO asset_maintenance (
          id, asset_id, maintenance_date, maintenance_type, service_provider,
          cost, next_service_due, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        asset_id,
        maintenance_date,
        maintenance_type.trim(),
        service_provider.trim(),
        mntCost,
        next_service_due || null,
        remarks?.trim() || null
      );

      // 2. Update asset condition and set status back to Available or In Use
      db.prepare(`
        UPDATE assets
        SET condition = COALESCE(?, condition),
            status = 'Available'
        WHERE id = ?
      `).run(updated_condition || 'Good', asset_id);

      // 3. Also record this under business expenses if cost > 0
      if (mntCost > 0) {
        const countRow = db.prepare('SELECT COUNT(*) as count FROM expenses').get() as { count: number };
        const expNumber = `EXP-MNT-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;
        const asset = db.prepare('SELECT name, asset_code FROM assets WHERE id = ?').get(asset_id) as any;

        db.prepare(`
          INSERT INTO expenses (
            id, expense_number, expense_date, category, description, amount,
            payment_method, vendor, recorded_by
          ) VALUES (?, ?, ?, 'Equipment Maintenance', ?, ?, 'UPI', ?, 'Floor Manager')
        `).run(
          `exp-${Date.now()}`,
          expNumber,
          maintenance_date,
          `Maintenance for ${asset?.name || 'Asset'} (${asset?.asset_code}): ${maintenance_type}`,
          mntCost,
          service_provider
        );
      }
    });

    mntTx();

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
