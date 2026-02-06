import prisma from '../../config/db';
import { ApiError } from '../../utils/api-error';
import { getIO } from '../../ws/ws.server';
import { WS_EVENTS } from '../../ws/ws.events';
import { activityService } from '../activity/activity.service';

const authorSelect = {
  id: true,
  displayName: true,
  email: true,
  avatarUrl: true,
};

export class CommentsService {
  async list(taskId: string) {
    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      const comments = await prisma.comment.findMany({
        where: { taskId },
        include: { author: { select: authorSelect } },
        orderBy: { createdAt: 'asc' },
      });

      return comments;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list comments');
    }
  }

  async create(taskId: string, authorId: string, data: { content: string }) {
    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      const comment = await prisma.comment.create({
        data: {
          taskId,
          authorId,
          content: data.content,
        },
        include: { author: { select: authorSelect } },
      });

      getIO().to(task.projectId).emit(WS_EVENTS.COMMENT_CREATED, { projectId: task.projectId, taskId, comment });
      activityService.log(task.projectId, authorId, 'comment.created', { taskId, taskTitle: task.title }).catch(() => {});

      return comment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create comment');
    }
  }

  async update(commentId: string, userId: string, data: { content: string }) {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { task: { select: { projectId: true } } },
      });

      if (!comment) {
        throw ApiError.notFound('Comment not found');
      }

      // Only the author can edit their comment
      if (comment.authorId !== userId) {
        throw ApiError.forbidden('You can only edit your own comments');
      }

      const updated = await prisma.comment.update({
        where: { id: commentId },
        data: { content: data.content },
        include: { author: { select: authorSelect } },
      });

      getIO().to(comment.task.projectId).emit(WS_EVENTS.COMMENT_UPDATED, { projectId: comment.task.projectId, taskId: comment.taskId, commentId, changes: data });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update comment');
    }
  }

  async delete(commentId: string, userId: string) {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { task: { select: { projectId: true } } },
      });

      if (!comment) {
        throw ApiError.notFound('Comment not found');
      }

      // Only the author can delete their comment
      if (comment.authorId !== userId) {
        throw ApiError.forbidden('You can only delete your own comments');
      }

      await prisma.comment.delete({
        where: { id: commentId },
      });

      getIO().to(comment.task.projectId).emit(WS_EVENTS.COMMENT_DELETED, { projectId: comment.task.projectId, taskId: comment.taskId, commentId });

      return { message: 'Comment deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete comment');
    }
  }
}

export const commentsService = new CommentsService();
