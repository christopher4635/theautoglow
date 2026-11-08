export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: job_card_id } = params;
    const body = await request.json();
    const {
      inspection_type, // 'intake' or 'post_service'
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

    db.prepare(`
      INSERT INTO vehicle_inspections (
        id, job_card_id, inspection_type, scratches_json, dents_json,
        paint_condition, interior_condition, wheel_condition, glass_condition,
        accessories_checked_json, photos_json, customer_acknowledged,
        customer_signature, inspector_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
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

    // If post-service QC, transition job status to Quality Check or Completed if requested
    if (inspection_type === 'post_service') {
      db.prepare("UPDATE job_cards SET status = 'Completed', updated_at = datetime('now', 'localtime') WHERE id = ?").run(job_card_id);
    }

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
