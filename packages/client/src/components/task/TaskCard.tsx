/**
 * TaskCard — Soft-minimalism task card
 *
 * Features:
 *  • Hover elevation: -translate-y-1 + shadow lift (via Framer Motion)
 *  • "Done" Celebration: canvas-confetti burst on isFinal status change
 *  • "Stuck" Alert: soft red pulse ring when overdue
 *  • Status badge with colour-coded pill
 *  • Priority dot, label chips, assignee avatar, due date
 *  • Zero regressions: composable, no direct API calls
 */

import { useRef, useCallback, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { format, isPast, parseISO, isValid } from 'date-fns';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';
import { TaskPriority, PRIORITY_CONFIG } from '@pm/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskCardProps {
  task: TaskDTO;
  status: TaskStatusDTO | undefined;
  /** Called when the user wants to open the full detail modal */
  onClick: () => void;
  /** Optional: callback when status quick-change is applied */
  onStatusChange?: (newStatusId: string) => void;
  statuses?: TaskStatusDTO[];
  /** If true the card is in a selection context and shows a checkbox */
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (taskId: string, selected: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] ?? '?').toUpperCase();
}

function formatDue(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = parseISO(dateStr);
  if (!isValid(d)) return '';
  return format(d, 'MMM d');
}

/** Fire a small confetti burst anchored to the card element */
function fireConfetti(originEl: HTMLElement) {
  const rect = originEl.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 22,
    decay: 0.88,
    scalar: 0.9,
    origin: { x, y },
    colors: ['#34D399', '#5B8DEF', '#A78BFA', '#FB7185', '#FCD34D'],
    zIndex: 9999,
  });
}

// ─── Status colours ───────────────────────────────────────────────────────────

const PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.3,
  whiteSpace: 'nowrap',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TaskCard: FC<TaskCardProps> = ({
  task,
  status,
  onClick,
  onStatusChange,
  statuses = [],
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prevFinalRef = useRef<boolean>(status?.isFinal ?? false);

  const isDone = status?.isFinal ?? false;
  const isOverdue = !isDone && task.dueDate != null && isPast(parseISO(task.dueDate));
  const isStuck = isOverdue; // treat overdue as "stuck"

  // Fire confetti when task transitions to a final status
  const handleStatusChange = useCallback(
    (newStatusId: string) => {
      const newStatus = statuses.find((s) => s.id === newStatusId);
      const nowFinal = newStatus?.isFinal ?? false;
      if (nowFinal && !prevFinalRef.current && cardRef.current) {
        fireConfetti(cardRef.current);
      }
      prevFinalRef.current = nowFinal;
      onStatusChange?.(newStatusId);
    },
    [statuses, onStatusChange]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectionMode) {
        e.stopPropagation();
        onSelectionChange?.(task.id, !isSelected);
      } else {
        onClick();
      }
    },
    [selectionMode, isSelected, task.id, onClick, onSelectionChange]
  );

  // Pill colours derived from status or stuck state
  const statusPillBg = isStuck
    ? 'var(--rp-accent-coral-light, #FFE4E6)'
    : isDone
    ? 'var(--rp-accent-mint-light, #D1FAE5)'
    : 'var(--color-bg-tertiary)';
  const statusPillColor = isStuck
    ? 'var(--rp-accent-coral, #FB7185)'
    : isDone
    ? 'var(--rp-accent-mint, #34D399)'
    : 'var(--color-text-secondary)';

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{
        y: -4,
        boxShadow: 'var(--rp-shadow-card-hover, 0 8px 24px rgba(0,0,0,0.10))',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={handleClick}
      className={isStuck ? 'rp-stuck-pulse' : undefined}
      style={{
        position: 'relative',
        background: isSelected
          ? 'var(--color-accent-light)'
          : 'var(--color-bg-elevated)',
        borderRadius: 'var(--rp-radius-card, 16px)',
        padding: '14px 16px',
        cursor: selectionMode ? 'pointer' : 'pointer',
        border: isSelected
          ? '1.5px solid var(--color-accent)'
          : isStuck
          ? '1.5px solid rgba(251,113,133,0.4)'
          : '1.5px solid var(--color-border)',
        boxShadow: 'var(--rp-shadow-card, 0 2px 12px rgba(0,0,0,0.06))',
        userSelect: 'none',
        // Stuck glow is handled by .rp-stuck-pulse CSS class
      }}
    >
      {/* ── Selection checkbox ── */}
      {selectionMode && (
        <div
          style={{ position: 'absolute', top: 12, right: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectionChange?.(task.id, !isSelected)}
            style={{ cursor: 'pointer', width: 16, height: 16 }}
          />
        </div>
      )}

      {/* ── Top row: priority dot + title + stuck icon ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 10,
        }}
      >
        {/* Priority dot */}
        {task.priority && task.priority !== TaskPriority.NONE && (
          <span
            style={{
              width: 8,
              height: 8,
              minWidth: 8,
              borderRadius: '50%',
              backgroundColor: PRIORITY_CONFIG[task.priority].color,
              marginTop: 5,
              flexShrink: 0,
            }}
            title={PRIORITY_CONFIG[task.priority].label}
          />
        )}

        {/* Title */}
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.45,
            color: 'var(--rp-text-charcoal, var(--color-text-primary))',
            textDecoration: isDone ? 'line-through' : 'none',
            opacity: isDone ? 0.55 : 1,
          }}
        >
          {task.title}
        </span>

        {/* Stuck warning icon */}
        <AnimatePresence>
          {isStuck && (
            <motion.span
              key="stuck-icon"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              title="Overdue — task is stuck!"
              style={{ flexShrink: 0 }}
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--rp-accent-coral, #FB7185)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1={12} y1={9} x2={12} y2={13} />
                <line x1={12} y1={17} x2={12.01} y2={17} />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Label chips ── */}
      {task.labels && task.labels.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginBottom: 10,
          }}
        >
          {task.labels.slice(0, 4).map((tl) => (
            <span
              key={tl.id}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 9999,
                backgroundColor: `${tl.label?.color ?? '#6B7280'}18`,
                color: tl.label?.color ?? '#6B7280',
                border: `1px solid ${tl.label?.color ?? '#6B7280'}30`,
                letterSpacing: 0.3,
              }}
            >
              {tl.label?.name}
            </span>
          ))}
          {task.labels.length > 4 && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--color-text-tertiary)',
                alignSelf: 'center',
              }}
            >
              +{task.labels.length - 4}
            </span>
          )}
        </div>
      )}

      {/* ── Bottom row: status pill + due date + comments + assignee ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* Status pill / dropdown */}
        {onStatusChange && statuses.length > 0 ? (
          <select
            value={task.statusId}
            onChange={(e) => {
              e.stopPropagation();
              handleStatusChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...PILL_STYLE,
              background: statusPillBg,
              color: statusPillColor,
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: 10,
              // Keep native select for accessibility
            }}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span
            style={{
              ...PILL_STYLE,
              background: statusPillBg,
              color: statusPillColor,
              border: 'none',
            }}
          >
            {status?.name ?? '—'}
          </span>
        )}

        {/* Due date */}
        {task.dueDate && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: isStuck
                ? 'var(--rp-accent-coral, #FB7185)'
                : 'var(--color-text-secondary)',
              fontWeight: 500,
            }}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4.5 1a.5.5 0 00-1 0V2H2a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2h-1.5V1a.5.5 0 00-1 0V2h-7V1zM1 6v8a1 1 0 001 1h12a1 1 0 001-1V6H1z" />
            </svg>
            {formatDue(task.dueDate)}
          </span>
        )}

        {/* Comment count */}
        {task.comments && task.comments.length > 0 && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 12,
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M2 1a1 1 0 00-1 1v8a1 1 0 001 1h9.586a2 2 0 011.414.586l2 2V2a1 1 0 00-1-1H2z" />
            </svg>
            {task.comments.length}
          </span>
        )}

        {/* Subtask progress */}
        {task.subtasks && task.subtasks.length > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 4,
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              fontWeight: 600,
            }}
          >
            {task.subtasks.filter((s) => {
              const st = statuses.find((st) => st.id === s.statusId);
              return st?.isFinal;
            }).length}
            /{task.subtasks.length}
          </span>
        )}

        {/* Blocked indicator */}
        {task.blockedBy && task.blockedBy.length > 0 && (
          <span
            title={`Blocked by ${task.blockedBy.length} task(s)`}
            style={{ color: 'var(--rp-accent-coral, var(--color-danger))' }}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 1a2 2 0 012 2v4H6V3a2 2 0 012-2zm3 6V3a3 3 0 00-6 0v4a2 2 0 00-2 2v5a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2z" />
            </svg>
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Assignee avatar */}
        {task.assigneeId && (
          <div
            title={task.assignee?.displayName ?? 'Assigned'}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--rp-accent-blue-light, var(--color-accent-light))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--rp-accent-blue, var(--color-accent))',
              flexShrink: 0,
              border: '1.5px solid rgba(91,141,239,0.25)',
            }}
          >
            {getInitials(task.assignee?.displayName)}
          </div>
        )}
      </div>
    </motion.div>
  );
};
