export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: warranty_id } = params;
    const body = await request.json();
    const { complaint, inspection_findings, resolution, repair_cost, status, inspector_name } = body;

    if (!complaint) {
      return NextResponse.json({ error: 'Customer complaint description is required.' }, { status: 400 });
    }

    const warranty = db.prepare('SELECT * FROM warranties WHERE id = ?').get(warranty_id) as any;
    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    const claimId = `wcl-${Date.now()}`;
    const claimDate = new Date().toISOString().split('T')[0];
    const claimStatus = status || 'Pending';

    db.prepare(`
      INSERT INTO warranty_claims (
        id, warranty_id, claim_date, complaint, inspection_findings,
        status, resolution, repair_cost, inspector_id, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      claimId,
      warranty_id,
      claimDate,
      complaint.trim(),
      inspection_findings?.trim() || null,
      claimStatus,
      resolution?.trim() || null,
      repair_cost ? parseFloat(repair_cost) : 0,
      inspector_name || 'Floor Inspector',
      claimStatus === 'Resolved' ? new Date().toISOString() : null
    );

    // Update warranty status
    const newWarrantyStatus = claimStatus === 'Resolved' ? 'Claim Resolved' : 'Claim Raised';
    db.prepare('UPDATE warranties SET status = ? WHERE id = ?').run(newWarrantyStatus, warranty_id);

    return NextResponse.json({ success: true, claimId, warranty_id, status: claimStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
