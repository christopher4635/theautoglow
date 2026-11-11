import { DbClient } from '../async-db';
import { jsonResponse, errorResponse } from './helpers';

export async function handleNotificationsGet(db: DbClient): Promise<Response> {
  try {
    const notifications = await db.all('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30');
    const row = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
    return jsonResponse({ notifications, unreadCount: row?.count ?? 0 });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function handleNotificationsPut(request: Request, db: DbClient): Promise<Response> {
  try {
    const body = await request.json();
    const { id, mark_all_read } = body;

    if (mark_all_read) {
      await db.run('UPDATE notifications SET is_read = 1');
      return jsonResponse({ success: true, message: 'All notifications marked as read.' });
    }

    if (id) {
      await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', id);
      return jsonResponse({ success: true });
    }

    return errorResponse('Notification ID or mark_all_read required.', 400);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
