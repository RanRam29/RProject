/**
 * ZenInput — Floating natural-language task creation palette
 *
 * Trigger: Shift+Space (or via `isOpen` prop)
 *
 * UX:
 *  • Centred glassmorphism overlay (bg-black/20 backdrop-blur)
 *  • One large, borderless input for natural-language task creation
 *  • Inline parsing: "Fix login bug due tomorrow high priority"
 *    → fills title, dueDate, priority fields
 *  • Shows parsed preview chips below input before confirming
 *  • Smooth spring entrance/exit via Framer Motion
 *  • Escape to dismiss, Enter to create
 *  • Zero regressions: fully self-contained, fires callback on submit
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type FC,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDays, format } from 'date-fns';
import { TaskPriority } from '@pm/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZenInputResult {
  title: string;
  dueDate?: string;      // ISO date string YYYY-MM-DD
  priority?: TaskPriority;
}

interface ZenInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (result: ZenInputResult) => void;
}

// ─── Natural Language Parser ──────────────────────────────────────────────────

interface ParsedTask {
  title: string;
  dueDate: string | null;
  priority: TaskPriority | null;
  dueDateLabel: string | null;
}

const PRIORITY_KEYWORDS: Record<string, TaskPriority> = {
  urgent: TaskPriority.URGENT,
  critical: TaskPriority.URGENT,
  asap: TaskPriority.URGENT,
  high: TaskPriority.HIGH,
  important: TaskPriority.HIGH,
  medium: TaskPriority.MEDIUM,
  normal: TaskPriority.MEDIUM,
  low: TaskPriority.LOW,
  minor: TaskPriority.LOW,
};

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function parseNaturalLanguage(input: string): ParsedTask {
  let text = input;
  let dueDate: string | null = null;
  let dueDateLabel: string | null = null;
  let priority: TaskPriority | null = null;

  // ── Due date patterns ──────────────────────────────────────────────────────

  // "due tomorrow" / "by tomorrow"
  if (/\b(due|by)\s+tomorrow\b/i.test(text)) {
    dueDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    dueDateLabel = 'Tomorrow';
    text = text.replace(/\b(due|by)\s+tomorrow\b/gi, '').trim();
  }
  // "due today"
  else if (/\b(due|by)\s+today\b/i.test(text)) {
    dueDate = todayIso();
    dueDateLabel = 'Today';
    text = text.replace(/\b(due|by)\s+today\b/gi, '').trim();
  }
  // "due next monday / tuesday / ..."
  else {
    const dayMatch = text.match(
      /\b(due|by)\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );
    if (dayMatch) {
      const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const targetDay = dayNames.indexOf(dayMatch[3].toLowerCase());
      const today = new Date();
      const currentDay = today.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7; // always next occurrence
      if (dayMatch[2]) diff = 7 + (targetDay - currentDay + 7) % 7; // "next" prefix → skip this week
      dueDate = format(addDays(today, diff), 'yyyy-MM-dd');
      dueDateLabel = dayMatch[3].charAt(0).toUpperCase() + dayMatch[3].slice(1).toLowerCase();
      text = text.replace(dayMatch[0], '').trim();
    }
    // "due in 3 days"
    else {
      const inDaysMatch = text.match(/\b(due|by)\s+in\s+(\d+)\s+days?\b/i);
      if (inDaysMatch) {
        const n = parseInt(inDaysMatch[2], 10);
        dueDate = format(addDays(new Date(), n), 'yyyy-MM-dd');
        dueDateLabel = `In ${n} day${n === 1 ? '' : 's'}`;
        text = text.replace(inDaysMatch[0], '').trim();
      }
      // "due YYYY-MM-DD" or "due MM/DD"
      else {
        const isoMatch = text.match(/\bdue\s+(\d{4}-\d{2}-\d{2})\b/i);
        if (isoMatch) {
          dueDate = isoMatch[1];
          dueDateLabel = format(new Date(dueDate), 'MMM d');
          text = text.replace(isoMatch[0], '').trim();
        }
      }
    }
  }

  // ── Priority keywords ──────────────────────────────────────────────────────
  for (const [keyword, prio] of Object.entries(PRIORITY_KEYWORDS)) {
    const re = new RegExp(`\\b${keyword}\\b`, 'i');
    if (re.test(text)) {
      priority = prio;
      text = text.replace(re, '').trim();
      break;
    }
  }

  // Clean up extra whitespace and trailing punctuation
  const title = text.replace(/\s{2,}/g, ' ').replace(/[,\s]+$/, '').trim();

  return { title, dueDate, dueDateLabel, priority };
}

// ─── Priority label helper ────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'Urgent',
  [TaskPriority.HIGH]: 'High',
  [TaskPriority.MEDIUM]: 'Medium',
  [TaskPriority.LOW]: 'Low',
  [TaskPriority.NONE]: 'None',
};

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; color: string }> = {
  [TaskPriority.URGENT]: { bg: '#FFE4E6', color: '#FB7185' },
  [TaskPriority.HIGH]: { bg: '#FEF3C7', color: '#D97706' },
  [TaskPriority.MEDIUM]: { bg: '#EBF2FF', color: '#5B8DEF' },
  [TaskPriority.LOW]: { bg: '#F3F4F6', color: '#6B7280' },
  [TaskPriority.NONE]: { bg: '#F3F4F6', color: '#9CA3AF' },
};

// ─── Chip ─────────────────────────────────────────────────────────────────────

const Chip: FC<{ icon: string; label: string; bg: string; color: string }> = ({
  icon,
  label,
  bg,
  color,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 9999,
      background: bg,
      color,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: 0.3,
    }}
  >
    <span style={{ fontSize: 14 }}>{icon}</span>
    {label}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export function ZenInput({ isOpen, onClose, onSubmit }: ZenInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const parsed = parseNaturalLanguage(value);

  // Focus on open; clear on close
  useEffect(() => {
    if (isOpen) {
      setValue('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Global Shift+Space opens ZenInput
  // (This component only handles *external* open trigger via prop;
  //  the shortcut wiring lives in the parent layout.)

  const handleSubmit = useCallback(() => {
    const title = parsed.title.trim();
    if (!title) return;

    const result: ZenInputResult = { title };
    if (parsed.dueDate) result.dueDate = parsed.dueDate;
    if (parsed.priority) result.priority = parsed.priority;

    onSubmit(result);
    onClose();
  }, [parsed, onSubmit, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const showPreviewDivider =
    (parsed.dueDate || parsed.priority) && parsed.title.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="zen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.20)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              zIndex: 9950,
            }}
          />

          {/* Panel */}
          <motion.div
            key="zen-panel"
            initial={{ opacity: 0, scale: 0.94, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -16 }}
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 32,
            }}
            style={{
              position: 'fixed',
              top: '28vh',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9960,
              width: 'min(600px, 94vw)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1.5px solid rgba(255, 255, 255, 0.55)',
                borderRadius: 20,
                boxShadow:
                  '0 20px 48px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.07)',
                overflow: 'hidden',
              }}
            >
              {/* Input row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 20px',
                  gap: 12,
                }}
              >
                {/* Sparkle icon */}
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rp-accent-lavender, #A78BFA)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, opacity: 0.8 }}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>

                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="New task… try 'Fix login bug due tomorrow urgent'"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 17,
                    fontWeight: 500,
                    color: 'var(--rp-text-charcoal, #1C1F23)',
                    padding: '16px 0',
                    fontFamily: 'inherit',
                    letterSpacing: 0.1,
                  }}
                />

                {/* Enter to create button */}
                {parsed.title.trim() && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={handleSubmit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'var(--rp-accent-blue, #5B8DEF)',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                      letterSpacing: 0.3,
                    }}
                  >
                    Create
                    <kbd
                      style={{
                        fontSize: 11,
                        padding: '1px 5px',
                        borderRadius: 5,
                        background: 'rgba(255,255,255,0.25)',
                        fontFamily: 'inherit',
                      }}
                    >
                      ↵
                    </kbd>
                  </motion.button>
                )}
              </div>

              {/* Parsed preview chips */}
              <AnimatePresence>
                {showPreviewDivider && (
                  <motion.div
                    key="chips"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      overflow: 'hidden',
                      borderTop: '1px solid rgba(0,0,0,0.07)',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 20px 12px',
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      {/* Title chip */}
                      {parsed.title.trim() && (
                        <Chip
                          icon="✏️"
                          label={parsed.title.trim()}
                          bg="rgba(91,141,239,0.10)"
                          color="var(--rp-accent-blue, #5B8DEF)"
                        />
                      )}

                      {/* Due date chip */}
                      {parsed.dueDate && parsed.dueDateLabel && (
                        <Chip
                          icon="📅"
                          label={parsed.dueDateLabel}
                          bg="rgba(52,211,153,0.12)"
                          color="var(--rp-accent-mint, #34D399)"
                        />
                      )}

                      {/* Priority chip */}
                      {parsed.priority && parsed.priority !== TaskPriority.NONE && (
                        <Chip
                          icon="🔥"
                          label={PRIORITY_LABELS[parsed.priority]}
                          bg={PRIORITY_COLORS[parsed.priority].bg}
                          color={PRIORITY_COLORS[parsed.priority].color}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer hints */}
              <div
                style={{
                  padding: '8px 20px',
                  borderTop: '1px solid rgba(0,0,0,0.07)',
                  display: 'flex',
                  gap: 16,
                  fontSize: 11,
                  color: 'var(--rp-text-faint, #9CA3AF)',
                }}
              >
                <span>
                  <strong>due tomorrow</strong> · <strong>due Monday</strong> ·{' '}
                  <strong>due in 3 days</strong>
                </span>
                <span style={{ marginLeft: 'auto' }}>
                  <strong>urgent</strong> · <strong>high</strong> ·{' '}
                  <strong>medium</strong> · <strong>low</strong>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
