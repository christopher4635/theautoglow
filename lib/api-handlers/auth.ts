import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleAuthPinPost(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { role, pin } = body;

    if (!role || !pin) {
      return errorResponse('Role and PIN/Password are required.', 400);
    }

    const cleanPin = String(pin).trim();

    const user = await db.get<any>(
      'SELECT id, name, email, role, phone, pin FROM users WHERE role = ? AND is_active = 1',
      role
    );

    if (!user) {
      return errorResponse('User role not found.', 404);
    }

    const settingKey = role === 'super_admin' ? 'super_admin_pin' : 'manager_pin';
    const setting = await db.get<any>('SELECT value FROM business_settings WHERE key = ?', settingKey);
    const expectedPin =
      String(user.pin || setting?.value || (role === 'super_admin' ? '4656' : '1111')).trim();

    if (cleanPin !== expectedPin) {
      return errorResponse('Invalid PIN or password. Access denied.', 401);
    }

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, ?, 'USER_PIN_LOGIN', 'user', ?, ?)`,
      `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user.name,
      user.id,
      JSON.stringify({ role: user.role })
    );

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Authentication error', 500);
  }
}

export async function handleAuthPinPut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { targetRole, newPin, adminPin } = body;

    if (!targetRole || !newPin) {
      return errorResponse('Target role and new PIN are required.', 400);
    }

    const superAdmin = await db.get<any>("SELECT pin FROM users WHERE role = 'super_admin'");
    const currentAdminPin = superAdmin?.pin || '4656';

    if (adminPin && String(adminPin).trim() !== currentAdminPin) {
      return errorResponse('Invalid Super Admin verification PIN.', 403);
    }

    const cleanNewPin = String(newPin).trim();
    if (cleanNewPin.length < 4) {
      return errorResponse('PIN / Password must be at least 4 characters.', 400);
    }

    const settingKey = targetRole === 'super_admin' ? 'super_admin_pin' : 'manager_pin';

    await db.run('UPDATE users SET pin = ? WHERE role = ?', cleanNewPin, targetRole);
    await db.run(
      `INSERT INTO business_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now', 'localtime'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      settingKey,
      cleanNewPin
    );

    await db.run(
      `INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
       VALUES (?, 'Abhinay (Super Admin)', 'PIN_CHANGE', 'user', ?, ?)`,
      `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      targetRole,
      JSON.stringify({ targetRole, changedAt: new Date().toISOString() })
    );

    return jsonResponse({
      success: true,
      message: `${targetRole === 'super_admin' ? 'Super Admin' : 'Manager'} PIN updated successfully.`,
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to update PIN', 500);
  }
}
