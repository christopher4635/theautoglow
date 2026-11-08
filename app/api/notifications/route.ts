export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const notifications = db.prepare(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30`).all();
    const unreadCount = (
      db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`).get() as { count: number }
    ).count;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, mark_all_read } = body;

    if (mark_all_read) {
      db.prepare('UPDATE notifications SET is_read = 1').run();
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Notification ID or mark_all_read required.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
