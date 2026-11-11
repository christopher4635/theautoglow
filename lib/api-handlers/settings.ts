import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleSettingsGet(db: DbClient): Promise<Response> {
  try {
    const rows = await db.all<any>('SELECT key, value FROM business_settings');
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return jsonResponse(settings);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleSettingsPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await db.run(
        `INSERT INTO business_settings (key, value, updated_at)
         VALUES (?, ?, datetime('now', 'localtime'))
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        key,
        String(value)
      );
    }

    if (body.super_admin_pin) {
      await db.run(
        "UPDATE users SET pin = ?, name = COALESCE(?, name) WHERE role = 'super_admin'",
        String(body.super_admin_pin).trim(),
        body.super_admin_name || 'Abhinay'
      );
    }
    if (body.manager_pin) {
      await db.run(
        "UPDATE users SET pin = ?, name = COALESCE(?, name) WHERE role = 'manager'",
        String(body.manager_pin).trim(),
        body.manager_name || 'Workshop Manager'
      );
    }

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Admin', 'SETTINGS_UPDATE', 'settings', 'business_config', ?)`,
      `aud-${Date.now()}`,
      JSON.stringify({ updatedKeys: Object.keys(body).filter((k) => !k.includes('pin')) })
    );

    return jsonResponse({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
