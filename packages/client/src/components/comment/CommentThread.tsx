import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '../../api/comments.api';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import { useSocket } from '../../contexts/SocketContext';
import type { CommentDTO } from '@pm/shared';

interface CommentThreadProps {
  projectId: string;
  taskId: string;
}

// Simple markdown-like rendering: **bold**, *italic*, `code`, [links](url)
function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={key++} style={{
          padding: '1px 4px', borderRadius: '3px',
          backgroundColor: 'var(--color-bg-tertiary)',
          fontSize: '12px', fontFamily: 'monospace',
        }}>
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      parts.push(
        <a key={key++} href={match[6]} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
          {match[5]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Emoji reactions palette
const REACTION_EMOJIS = ['\uD83D\uDC4D', '\uD83D\uDC4E', '\u2764\uFE0F', '\uD83D\uDE04', '\uD83C\uDF89', '\uD83D\uDE2E', '\uD83D\uDC40', '\uD83D\uDE80'];

export function CommentThread({ projectId, taskId }: CommentThreadProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const { socket } = useSocket();
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', projectId, taskId],
    queryFn: () => commentsApi.list(projectId, taskId),
  });

  // Listen for typing events
  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data: {
      projectId: string; taskId: string; userId: string;
      displayName: string; isTyping: boolean;
    }) => {
      if (data.taskId !== taskId) return;
      if (data.userId === currentUser?.id) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.userId, data.displayName);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    socket.on('presence:userTyping' as any, handleTyping);
    return () => {
      socket.off('presence:userTyping' as any, handleTyping);
    };
  }, [socket, taskId, currentUser?.id]);

  // Emit typing events
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket) return;
      if (isTyping && !isTypingRef.current) {
        isTypingRef.current = true;
        socket.emit('presence:typingStart' as any, { projectId, taskId });
      } else if (!isTyping && isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('presence:typingStop' as any, { projectId, taskId });
      }
    },
    [socket, projectId, taskId]
  );

  const handleCommentChange = useCallback(
    (value: string) => {
      setNewComment(value);
      emitTyping(true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000);
    },
    [emitTyping]
  );

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      commentsApi.create(projectId, taskId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
      setNewComment('');
      emitTyping(false);
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

  const toggleReaction = (commentId: string, emoji: string) => {
    setReactions((prev) => {
      const commentReactions = { ...(prev[commentId] || {}) };
      const users = commentReactions[emoji] || [];
      const userId = currentUser?.id || '';

      if (users.includes(userId)) {
        commentReactions[emoji] = users.filter((u) => u !== userId);
        if (commentReactions[emoji].length === 0) delete commentReactions[emoji];
      } else {
        commentReactions[emoji] = [...users, userId];
      }

      return { ...prev, [commentId]: commentReactions };
    });
    setShowReactionPicker(null);
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

  const typingText = typingUsers.size > 0
    ? Array.from(typingUsers.values()).join(', ') + (typingUsers.size === 1 ? ' is typing...' : ' are typing...')
    : null;

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
          {comments.map((comment) => {
            const commentReactions = reactions[comment.id] || {};

            return (
              <div
                key={comment.id}
                style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '28px', height: '28px', minWidth: '28px',
                    borderRadius: '50%', backgroundColor: 'var(--color-accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600, color: 'var(--color-accent)',
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
                          width: '100%', minHeight: '60px', padding: '6px 8px',
                          fontSize: '13px', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-primary)',
                          color: 'var(--color-text-primary)', outline: 'none',
                          resize: 'vertical', fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditSubmit(comment.id)}
                          disabled={!editContent.trim() || updateMutation.isPending}
                          style={{
                            padding: '3px 10px', fontSize: '12px', fontWeight: 500,
                            color: 'white', backgroundColor: 'var(--color-accent)',
                            border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingId(null); setEditContent(''); }}
                          style={{
                            padding: '3px 10px', fontSize: '12px',
                            color: 'var(--color-text-secondary)', background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)', cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{
                        fontSize: '13px', color: 'var(--color-text-primary)',
                        lineHeight: 1.5, margin: 0,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {renderMarkdown(comment.content)}
                      </p>

                      {/* Reactions display */}
                      {Object.keys(commentReactions).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {Object.entries(commentReactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(comment.id, emoji)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                padding: '1px 6px', fontSize: '12px',
                                border: `1px solid ${users.includes(currentUser?.id || '') ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: users.includes(currentUser?.id || '') ? 'var(--color-accent-light)' : 'transparent',
                                cursor: 'pointer',
                              }}
                            >
                              {emoji} <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                        {/* Reaction button */}
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setShowReactionPicker(
                              showReactionPicker === comment.id ? null : comment.id
                            )}
                            style={{
                              fontSize: '13px', color: 'var(--color-text-tertiary)',
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            }}
                            title="Add reaction"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <line x1="9" y1="9" x2="9.01" y2="9" />
                              <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                          </button>
                          {showReactionPicker === comment.id && (
                            <div style={{
                              position: 'absolute', bottom: '100%', left: 0,
                              backgroundColor: 'var(--color-bg-elevated)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: 'var(--shadow-md)',
                              padding: '4px', display: 'flex', gap: '2px',
                              zIndex: 100,
                            }}>
                              {REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(comment.id, emoji)}
                                  style={{
                                    fontSize: '16px', padding: '2px 4px',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'background var(--transition-fast)',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {currentUser && currentUser.id === comment.authorId && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(comment)}
                              style={{
                                fontSize: '11px', color: 'var(--color-text-tertiary)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(comment.id)}
                              disabled={deleteMutation.isPending}
                              style={{
                                fontSize: '11px', color: 'var(--color-danger)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Typing indicator */}
      {typingText && (
        <div style={{
          fontSize: '12px', color: 'var(--color-text-tertiary)',
          fontStyle: 'italic', padding: '4px 0',
        }}>
          {typingText}
        </div>
      )}

      {/* New comment input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={newComment}
          onChange={(e) => handleCommentChange(e.target.value)}
          placeholder="Write a comment... (supports **bold**, *italic*, `code`)"
          style={{
            flex: 1, minHeight: '36px', maxHeight: '120px',
            padding: '8px 10px', fontSize: '13px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            outline: 'none', resize: 'vertical',
            fontFamily: 'inherit', lineHeight: 1.4,
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
            padding: '8px 14px', fontSize: '13px', fontWeight: 500,
            color: 'white', backgroundColor: 'var(--color-accent)',
            border: 'none', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', alignSelf: 'flex-end',
            opacity: !newComment.trim() ? 0.5 : 1,
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}
