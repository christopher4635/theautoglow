export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rows = db.prepare('SELECT key, value FROM business_settings').all() as any[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const insertSetting = db.prepare(`
      INSERT INTO business_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

    const updateTx = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        insertSetting.run(key, String(value));
      }
      db.prepare(`
        INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
        VALUES (?, 'Admin', 'SETTINGS_UPDATE', 'settings', 'business_config', ?)
      `).run(`aud-${Date.now()}`, JSON.stringify(body));
    });

    updateTx();

    return NextResponse.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
