/**
 * LivingTaskModal — Split-pane task detail + iMessage-style chat
 *
 * Layout:
 *  Left (60%): task title, dates, description, status, labels, dependencies
 *  Right (40%): comment thread styled as chat bubbles (user on right, others left)
 *
 * Features:
 *  • Framer Motion AnimatePresence for smooth open/close
 *  • Glassmorphism backdrop overlay
 *  • iMessage / WhatsApp-style chat bubbles with colour-coded avatars
 *  • Real-time typing indicator support (via existing socket context)
 *  • Inline quick-status change that triggers confetti via TaskCard
 *  • Scrolls chat to bottom on new messages
 *  • Responsive: stacks vertically on narrow screens (< 680px)
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type FC,
  type KeyboardEvent,
} from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import confetti from 'canvas-confetti';
import { tasksApi } from '../../api/tasks.api';
import { commentsApi } from '../../api/comments.api';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import { useSocket } from '../../contexts/SocketContext';
import type { TaskDTO, TaskStatusDTO, CommentDTO, UpdateTaskRequest } from '@pm/shared';
import { TaskPriority, PRIORITY_CONFIG } from '@pm/shared';
import { LabelSelector } from '../label/LabelSelector';
import { DependencyManager } from '../dependency/DependencyManager';
import { AssigneeSelector } from './AssigneeSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LivingTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  task: TaskDTO | null;
  /** Provide statuses from parent to avoid double-fetch */
  statuses?: TaskStatusDTO[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] ?? '?').toUpperCase();
}

/** Consistent hue from a string (for avatar colours) */
function stringToHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 360;
}

function avatarColors(userId: string): { bg: string; color: string } {
  const hue = stringToHue(userId);
  return {
    bg: `hsl(${hue}, 55%, 88%)`,
    color: `hsl(${hue}, 55%, 32%)`,
  };
}

function formatTime(dateStr: string): string {
  const d = parseISO(dateStr);
  if (!isValid(d)) return '';
  return format(d, 'h:mm a');
}

function formatDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (!isValid(d)) return '';
  return format(d, 'MMM d');
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

const ChatBubble: FC<{
  comment: CommentDTO;
  isMine: boolean;
  showAvatar: boolean;
}> = ({ comment, isMine, showAvatar }) => {
  const av = avatarColors(comment.authorId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 6,
        paddingLeft: isMine ? 40 : 0,
        paddingRight: isMine ? 0 : 40,
      }}
    >
      {/* Avatar */}
      {showAvatar ? (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: av.bg,
            color: av.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
          title={comment.author?.displayName}
        >
          {comment.author?.avatarUrl ? (
            <img
              src={comment.author.avatarUrl}
              alt={comment.author.displayName}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            getInitials(comment.author?.displayName)
          )}
        </div>
      ) : (
        <div style={{ width: 28, flexShrink: 0 }} />
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: '72%',
        }}
      >
        {/* Author name (only on first bubble in a sequence) */}
        {showAvatar && !isMine && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: av.color,
              marginBottom: 3,
              paddingLeft: 4,
            }}
          >
            {comment.author?.displayName ?? 'Unknown'}
          </div>
        )}

        <div
          style={{
            background: isMine
              ? 'var(--rp-accent-blue, #5B8DEF)'
              : 'var(--color-bg-tertiary)',
            color: isMine ? '#fff' : 'var(--rp-text-charcoal, var(--color-text-primary))',
            padding: '9px 14px',
            borderRadius: isMine
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px',
            fontSize: 13,
            lineHeight: 1.55,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            boxShadow: isMine
              ? '0 2px 8px rgba(91,141,239,0.25)'
              : '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          {comment.content}
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            marginTop: 3,
            textAlign: isMine ? 'right' : 'left',
            paddingLeft: isMine ? 0 : 4,
            paddingRight: isMine ? 4 : 0,
          }}
        >
          {formatTime(comment.createdAt)}
          {comment.updatedAt !== comment.createdAt && ' · edited'}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Typing Dots ─────────────────────────────────────────────────────────────

const TypingDots: FC = () => (
  <div style={{ display: 'flex', gap: 4, padding: '8px 14px', alignItems: 'center' }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--color-text-tertiary)',
        }}
        animate={{ y: [0, -5, 0] }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.18,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

// ─── Left Pane ────────────────────────────────────────────────────────────────

const LeftPane: FC<{
  task: TaskDTO;
  projectId: string;
  statuses: TaskStatusDTO[];
  onSaved: () => void;
}> = ({ task, projectId, statuses, onSaved }) => {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(
    typeof task.description === 'string'
      ? task.description
      : task.description && typeof task.description === 'object' && 'text' in task.description
      ? String((task.description as { text: string }).text)
      : ''
  );
  const [statusId, setStatusId] = useState(task.statusId);
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assigneeId ?? null);
  const [priority, setPriority] = useState<TaskPriority>(task.priority ?? TaskPriority.NONE);
  const [startDate, setStartDate] = useState(task.startDate ? task.startDate.slice(0, 10) : '');
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : '');
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaskRequest) =>
      tasksApi.update(projectId, task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'success', message: 'Task saved' });
      setIsDirty(false);
      onSaved();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to save task' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatusId: string) =>
      tasksApi.updateTaskStatus(projectId, task.id, newStatusId),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      const newStatus = statuses.find((s) => s.id === updatedTask.statusId);
      const wasFinal = statuses.find((s) => s.id === task.statusId)?.isFinal;
      if (newStatus?.isFinal && !wasFinal) {
        confetti({
          particleCount: 80,
          spread: 80,
          startVelocity: 24,
          decay: 0.87,
          origin: { x: 0.3, y: 0.55 },
          colors: ['#34D399', '#5B8DEF', '#A78BFA', '#FCD34D'],
          zIndex: 10100,
        });
      }
      addToast({ type: 'success', message: 'Status updated' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update status' });
    },
  });

  const handleStatusChange = useCallback(
    (newStatusId: string) => {
      setStatusId(newStatusId);
      statusMutation.mutate(newStatusId);
    },
    [statusMutation]
  );

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      assigneeId,
      priority,
      startDate: startDate || null,
      dueDate: dueDate || null,
    });
  }, [title, description, assigneeId, priority, startDate, dueDate, updateMutation]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    border: '1.5px solid var(--color-border)',
    borderRadius: 10,
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 150ms ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--rp-text-muted, var(--color-text-secondary))',
    marginBottom: 5,
    display: 'block',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 16 };

  return (
    <div
      style={{
        flex: '0 0 60%',
        padding: '24px 28px',
        overflowY: 'auto',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Title */}
      <div style={fieldStyle}>
        <textarea
          value={title}
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          placeholder="Task title..."
          rows={2}
          style={{
            ...inputStyle,
            fontSize: 18,
            fontWeight: 700,
            border: 'none',
            background: 'transparent',
            padding: '0 0 8px',
            borderRadius: 0,
            borderBottom: '2px solid var(--color-border)',
            resize: 'none',
            lineHeight: 1.4,
            color: 'var(--rp-text-charcoal, var(--color-text-primary))',
          }}
        />
      </div>

      {/* Status + Priority row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Status</label>
          <select
            value={statusId}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer', height: 38 }}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isFinal ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Priority</label>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value as TaskPriority); markDirty(); }}
            style={{ ...inputStyle, cursor: 'pointer', height: 38 }}
          >
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_CONFIG[p].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); markDirty(); }}
            style={{ ...inputStyle, height: 38 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => { setDueDate(e.target.value); markDirty(); }}
            style={{ ...inputStyle, height: 38 }}
          />
        </div>
      </div>

      {/* Assignee */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Assignee</label>
        <AssigneeSelector
          projectId={projectId}
          selectedAssigneeId={assigneeId}
          onChange={(id) => { setAssigneeId(id); markDirty(); }}
        />
      </div>

      {/* Description */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); markDirty(); }}
          placeholder="Add notes, context, or acceptance criteria..."
          rows={4}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: 80,
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Labels */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Labels</label>
        <LabelSelector
          projectId={projectId}
          taskId={task.id}
          assignedLabels={task.labels ?? []}
        />
      </div>

      {/* Dependencies */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Dependencies</label>
        <DependencyManager projectId={projectId} task={task} />
      </div>

      {/* Metadata footer */}
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          background: 'var(--color-bg-secondary)',
          borderRadius: 10,
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.7,
        }}
      >
        <div>Created {format(parseISO(task.createdAt), 'MMM d, yyyy')}</div>
        <div>Updated {format(parseISO(task.updatedAt), 'MMM d, yyyy · h:mm a')}</div>
      </div>

      {/* Save button */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ marginTop: 16 }}
          >
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || !title.trim()}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--rp-accent-blue, var(--color-accent))',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: updateMutation.isPending ? 0.7 : 1,
                transition: 'opacity 150ms ease',
                letterSpacing: 0.3,
              }}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Right Pane: Chat ─────────────────────────────────────────────────────────

const ChatPane: FC<{
  task: TaskDTO;
  projectId: string;
}> = ({ task, projectId }) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const { socket } = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', projectId, task.id],
    queryFn: () => commentsApi.list(projectId, task.id),
  });

  // Scroll to bottom when comments change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length, typingUsers.size]);

  // Socket typing events
  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data: {
      projectId: string; taskId: string;
      userId: string; displayName: string; isTyping: boolean;
    }) => {
      if (data.taskId !== task.id) return;
      if (data.userId === currentUser?.id) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) next.set(data.userId, data.displayName);
        else next.delete(data.userId);
        return next;
      });
    };

    socket.on('presence:userTyping', handleTyping);
    return () => { socket.off('presence:userTyping', handleTyping); };
  }, [socket, task.id, currentUser?.id]);

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!socket) return;
      if (typing && !isTypingRef.current) {
        isTypingRef.current = true;
        socket.emit('presence:typingStart', { projectId, taskId: task.id });
      } else if (!typing && isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('presence:typingStop', { projectId, taskId: task.id });
      }
    },
    [socket, projectId, task.id]
  );

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      commentsApi.create(projectId, task.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, task.id] });
      setDraft('');
      emitTyping(false);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to post comment' });
    },
  });

  const handleDraftChange = useCallback(
    (val: string) => {
      setDraft(val);
      emitTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => emitTyping(false), 2200);
    },
    [emitTyping]
  );

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }, [draft, createMutation]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Group consecutive comments by same author to collapse avatars
  const groupedComments = comments.map((c, i) => ({
    comment: c,
    showAvatar: i === 0 || comments[i - 1].authorId !== c.authorId,
  }));

  // Date dividers: group by day
  const renderWithDividers = () => {
    const elements: React.ReactNode[] = [];
    let lastDate = '';

    groupedComments.forEach(({ comment, showAvatar }) => {
      const dateStr = formatDate(comment.createdAt);
      if (dateStr && dateStr !== lastDate) {
        lastDate = dateStr;
        elements.push(
          <div
            key={`divider-${dateStr}`}
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              margin: '12px 0 6px',
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {dateStr}
          </div>
        );
      }
      elements.push(
        <ChatBubble
          key={comment.id}
          comment={comment}
          isMine={comment.authorId === currentUser?.id}
          showAvatar={showAvatar}
        />
      );
    });

    return elements;
  };

  return (
    <div
      style={{
        flex: '0 0 40%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--rp-bg-cream, var(--color-bg-secondary))',
        minWidth: 0,
      }}
    >
      {/* Chat header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--rp-text-muted, var(--color-text-secondary))',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          Thread
        </span>
        {comments.length > 0 && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 600,
              padding: '1px 7px',
              borderRadius: 9999,
              background: 'var(--rp-accent-blue-light)',
              color: 'var(--rp-accent-blue)',
            }}
          >
            {comments.length}
          </span>
        )}
      </div>

      {/* Messages scroll area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isLoading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : comments.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--color-text-tertiary)',
            }}
          >
            <svg
              width={32}
              height={32}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              opacity={0.4}
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span style={{ fontSize: 13, textAlign: 'center' }}>
              No comments yet.{'\n'}Start the conversation!
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {renderWithDividers()}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--color-bg-tertiary)',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                background: 'var(--color-bg-tertiary)',
                borderRadius: '18px 18px 18px 4px',
                padding: '2px 4px',
              }}
            >
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            background: 'var(--color-bg-primary)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 20,
            padding: '8px 8px 8px 14px',
            transition: 'border-color 150ms ease',
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              'var(--rp-accent-blue, var(--color-accent))';
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor =
              'var(--color-border)';
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              maxHeight: 100,
              overflowY: 'auto',
            }}
            onInput={(e) => {
              // Auto-grow textarea
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
            }}
          />
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={handleSend}
            disabled={!draft.trim() || createMutation.isPending}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: 'none',
              background: draft.trim()
                ? 'var(--rp-accent-blue, var(--color-accent))'
                : 'var(--color-bg-tertiary)',
              color: draft.trim() ? 'white' : 'var(--color-text-tertiary)',
              cursor: draft.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 200ms ease',
            }}
            title="Send (⌘+Enter)"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1={22} y1={2} x2={11} y2={13} />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </motion.button>
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            marginTop: 6,
          }}
        >
          ⌘+Enter to send
        </div>
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function LivingTaskModal({
  isOpen,
  onClose,
  projectId,
  task,
  statuses: externalStatuses,
}: LivingTaskModalProps) {
  const { data: fetchedStatuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
    enabled: isOpen && !externalStatuses,
  });

  const statuses = externalStatuses ?? fetchedStatuses;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && task && (
        <>
          {/* Backdrop */}
          <motion.div
            key="living-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 9800,
            }}
          />

          {/* Modal panel */}
          <motion.div
            key="living-modal-panel"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 30,
            }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9900,
              width: 'min(860px, 96vw)',
              height: 'min(600px, 90vh)',
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--rp-radius-modal, 24px)',
              boxShadow: 'var(--rp-shadow-float, 0 20px 48px rgba(0,0,0,0.14))',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Coloured status dot */}
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor:
                      statuses.find((s) => s.id === task.statusId)?.color ??
                      'var(--color-text-tertiary)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    letterSpacing: 0.3,
                  }}
                >
                  {statuses.find((s) => s.id === task.statusId)?.name ?? 'Task'}
                </span>
              </div>

              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
                title="Close (Esc)"
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                >
                  <line x1={18} y1={6} x2={6} y2={18} />
                  <line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>

            {/* Body: two panes */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <LeftPane
                task={task}
                projectId={projectId}
                statuses={statuses}
                onSaved={() => { /* parent refresh handled via queryClient */ }}
              />
              <ChatPane task={task} projectId={projectId} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
