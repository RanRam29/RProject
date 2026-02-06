import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '../../api/comments.api';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import type { CommentDTO } from '@pm/shared';

interface CommentThreadProps {
  projectId: string;
  taskId: string;
}

export function CommentThread({ projectId, taskId }: CommentThreadProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', projectId, taskId],
    queryFn: () => commentsApi.list(projectId, taskId),
  });

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      commentsApi.create(projectId, taskId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
      setNewComment('');
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to post comment' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentsApi.update(projectId, taskId, commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
      setEditingId(null);
      setEditContent('');
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update comment' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      commentsApi.delete(projectId, taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete comment' });
    },
  });

  const handleSubmit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!newComment.trim()) return;
    createMutation.mutate(newComment.trim());
  };

  const startEdit = (comment: CommentDTO) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditSubmit = (commentId: string) => {
    if (!editContent.trim()) return;
    updateMutation.mutate({ commentId, content: editContent.trim() });
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      {/* Comment list */}
      {isLoading ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
          No comments yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  minWidth: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                }}
              >
                {getInitials(comment.author?.displayName)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {comment.author?.displayName || 'Unknown'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {formatDate(comment.createdAt)}
                    {comment.updatedAt !== comment.createdAt && ' (edited)'}
                  </span>
                </div>

                {editingId === comment.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '6px 8px',
                        fontSize: '13px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleEditSubmit(comment.id)}
                        disabled={!editContent.trim() || updateMutation.isPending}
                        style={{
                          padding: '3px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'white',
                          backgroundColor: 'var(--color-accent)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setEditContent(''); }}
                        style={{
                          padding: '3px 10px',
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          background: 'none',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.5,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {comment.content}
                    </p>

                    {/* Actions (only for own comments) */}
                    {currentUser && currentUser.id === comment.authorId && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => startEdit(comment)}
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-tertiary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(comment.id)}
                          disabled={deleteMutation.isPending}
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-danger)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          style={{
            flex: 1,
            minHeight: '36px',
            maxHeight: '120px',
            padding: '8px 10px',
            fontSize: '13px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.4,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!newComment.trim() || createMutation.isPending}
          style={{
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: 'var(--color-accent)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            alignSelf: 'flex-end',
            opacity: !newComment.trim() ? 0.5 : 1,
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}
