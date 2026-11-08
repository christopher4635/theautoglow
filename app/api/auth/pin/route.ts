export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, pin } = body;

    if (!role || !pin) {
      return NextResponse.json({ error: 'Role and PIN are required.' }, { status: 400 });
    }

    const cleanPin = String(pin).trim();

    // Query user by role
    const user = db.prepare('SELECT id, name, email, role, phone, pin FROM users WHERE role = ? AND is_active = 1').get(role) as any;

    if (!user) {
      return NextResponse.json({ error: 'User role not found.' }, { status: 404 });
    }

    // Check PIN from users table or business_settings fallback
    let expectedPin = user.pin;
    if (!expectedPin) {
      const settingKey = role === 'super_admin' ? 'super_admin_pin' : 'manager_pin';
      const setting = db.prepare('SELECT value FROM business_settings WHERE key = ?').get(settingKey) as any;
      expectedPin = setting?.value || (role === 'super_admin' ? '4656' : '1111');
    }

    if (cleanPin !== expectedPin) {
      return NextResponse.json({ error: 'Invalid PIN. Access denied.' }, { status: 401 });
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
      VALUES (?, ?, 'USER_PIN_LOGIN', 'user', ?, ?)
    `).run(`aud-${Date.now()}`, user.name, user.id, JSON.stringify({ role: user.role }));

    return NextResponse.json({
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { targetRole, newPin, adminPin } = body;

    if (!targetRole || !newPin) {
      return NextResponse.json({ error: 'Target role and new PIN are required.' }, { status: 400 });
    }

    // Verify admin PIN
    const superAdmin = db.prepare("SELECT pin FROM users WHERE role = 'super_admin'").get() as any;
    const currentAdminPin = superAdmin?.pin || '4656';

    if (adminPin && String(adminPin).trim() !== currentAdminPin) {
      return NextResponse.json({ error: 'Invalid Super Admin verification PIN.' }, { status: 403 });
    }

    const cleanNewPin = String(newPin).trim();
    if (cleanNewPin.length < 4) {
      return NextResponse.json({ error: 'PIN must be at least 4 digits.' }, { status: 400 });
    }

    const settingKey = targetRole === 'super_admin' ? 'super_admin_pin' : 'manager_pin';

    db.transaction(() => {
      // Update users table
      db.prepare('UPDATE users SET pin = ? WHERE role = ?').run(cleanNewPin, targetRole);
      // Update business_settings
      db.prepare(`
        INSERT INTO business_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(settingKey, cleanNewPin);

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, user_name, action, entity_type, entity_id, details_json)
        VALUES (?, 'Abhinay (Super Admin)', 'PIN_CHANGE', 'user', ?, ?)
      `).run(`aud-${Date.now()}`, targetRole, JSON.stringify({ targetRole, changedAt: new Date().toISOString() }));
    })();

    return NextResponse.json({
      success: true,
      message: `${targetRole === 'super_admin' ? 'Super Admin' : 'Manager'} PIN updated successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
