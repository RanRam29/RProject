import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET / - List notifications for the current user
router.get('/', notificationsController.list);

// GET /unread-count - Get unread notification count
router.get('/unread-count', notificationsController.unreadCount);

// PATCH /read-all - Mark all notifications as read
router.patch('/read-all', notificationsController.markAllAsRead);

// PATCH /:notificationId/read - Mark a single notification as read
router.patch('/:notificationId/read', notificationsController.markAsRead);

// DELETE /all - Delete all notifications
router.delete('/all', notificationsController.deleteAll);

// DELETE /:notificationId - Delete a single notification
router.delete('/:notificationId', notificationsController.delete);

export default router;
