import React from 'react';
import type { WidgetProps } from './widget.types';
import { useAIAssistant } from './useAIAssistant';
import {
  containerStyle,
  chatAreaStyle,
  msgStyle,
  inputAreaStyle,
  pillStyle,
  badgeStyle,
} from './ai-assistant.styles';

// ── Quick actions config ─────────────────────

const quickActions = [
  { label: 'Summary', command: 'project summary' },
  { label: 'Overdue', command: "what's overdue?" },
  { label: 'Suggestions', command: 'suggest next steps' },
  { label: 'Stats', command: 'stats' },
];

// ── Markdown rendering ──────────────────────

function renderLine(line: string, key: number) {
  if (!line) return <div key={key}>&nbsp;</div>;

  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return <div key={key}>{parts.length > 0 ? parts : line}</div>;
}

function renderContent(content: string) {
  return content.split('\n').map((line, i) => renderLine(line, i));
}

// ── Component ────────────────────────────────

export function AIAssistantWidget({ projectId }: WidgetProps) {
  const {
    messages,
    input,
    setInput,
    isProcessing,
    isAIEnabled,
    aiError,
    taskCreationMode,
    setTaskCreationMode,
    pendingTask,
    chatEndRef,
    handleSubmit,
    handleConfirmTask,
    handleCancelTask,
    handleQuickAction,
  } = useAIAssistant(projectId);

  return (
    <div style={containerStyle}>
      {/* Header bar: quick actions + mode badge + settings */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--color-border)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.command)}
            disabled={isProcessing}
            style={pillStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            {action.label}
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Task creation mode toggle */}
        <button
          onClick={() => setTaskCreationMode((m) => m === 'auto' ? 'confirm' : 'auto')}
          title={`Task creation: ${taskCreationMode}. Click to toggle.`}
          style={{
            ...pillStyle,
            fontSize: '10px',
            opacity: 0.7,
          }}
        >
          {taskCreationMode === 'confirm' ? '\u2713 Confirm' : '\u26A1 Auto'}
        </button>

        {/* AI/Local badge */}
        <span style={badgeStyle(isAIEnabled, !!aiError)} title={aiError ? String(aiError) : undefined}>
          {isAIEnabled ? 'AI \u2728' : aiError ? '\u26A0 Local' : 'Local'}
        </span>
      </div>

      {/* Chat area */}
      <div style={chatAreaStyle}>
        {messages.map((msg) => (
          <div key={msg.id} style={msgStyle(msg.role)}>
            {renderContent(msg.content)}
            {msg.isStreaming && (
              <span style={{ opacity: 0.5, fontSize: '12px' }}> ●</span>
            )}
          </div>
        ))}

        {/* Pending task confirmation card */}
        {pendingTask && (
          <div style={{
            alignSelf: 'flex-start',
            maxWidth: '85%',
            padding: '8px 12px',
            display: 'flex',
            gap: '6px',
          }}>
            <button
              onClick={handleConfirmTask}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Create
            </button>
            <button
              onClick={handleCancelTask}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Processing indicator (only for non-AI mode; AI mode shows inline streaming) */}
        {isProcessing && !isAIEnabled && (
          <div style={{ ...msgStyle('assistant'), opacity: 0.6 }}>
            Thinking...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={inputAreaStyle}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isAIEnabled ? 'Ask anything about your project...' : 'Try "project summary" or "create task: ..."'}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
