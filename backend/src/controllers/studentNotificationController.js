function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /api/student/notifications
async function getStudentNotifications(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = validId(req.session.user.id);

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const [notifications] = await db.execute(
      `SELECT
         id,
         notification_type,
         title,
         message,
         course_id,
         module_id,
         material_id,
         is_read,
         created_at
       FROM notifications
       WHERE recipient_user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [studentId]
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS unread_count
       FROM notifications
       WHERE recipient_user_id = ?
         AND is_read = 0`,
      [studentId]
    );

    return res.json({
      success: true,
      notifications,
      unreadCount: Number(countRows[0].unread_count),
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/student/notifications/:id/read
async function markStudentNotificationRead(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = validId(req.session.user.id);
    const notificationId = validId(req.params.id);

    if (!studentId || !notificationId) {
      return res.status(400).json({
        success: false,
        message: "Invalid student or notification ID.",
      });
    }

    const [result] = await db.execute(
      `UPDATE notifications
       SET is_read = 1,
           read_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND recipient_user_id = ?
         AND is_read = 0`,
      [notificationId, studentId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.execute(
        `SELECT id
         FROM notifications
         WHERE id = ?
           AND recipient_user_id = ?
         LIMIT 1`,
        [notificationId, studentId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }
    }

    return res.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStudentNotifications,
  markStudentNotificationRead,
};
