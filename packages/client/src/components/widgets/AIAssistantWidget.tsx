import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { aiApi } from '../../api/ai.api';
import type { WidgetProps } from './widget.types';
import { TaskPriority } from '@pm/shared';
import type { TaskStatusDTO, CreateTaskRequest } from '@pm/shared';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface PendingTask {
  title: string;
  statusId: string;
  statusName: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export function AIAssistantWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskCreationMode, setTaskCreationMode] = useState<'auto' | 'confirm'>('confirm');
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isStreamingRef = useRef(false);

  // ── Data queries ──────────────────────────────

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status', projectId],
    queryFn: () => aiApi.getStatus(projectId),
    staleTime: 5 * 60 * 1000,
    retry: false,
    meta: { silent: true },
  });
  const isAIEnabled = aiStatus?.available ?? false;

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskRequest) =>
      tasksApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => { statusMap[s.id] = s; });

  // ── Welcome message (set once when AI status resolves) ──

  useEffect(() => {
    const welcomeContent = isAIEnabled
      ? 'Hello! I\'m your **AI-powered** project assistant. Ask me anything about your project:\n\n' +
        '- **Analyze** your project status and risks\n' +
        '- **Create tasks** from natural language\n' +
        '- **Get insights** on bottlenecks and priorities\n' +
        '- **Generate** plans, reports, and recommendations\n\n' +
        'Try asking a question like "What are the biggest risks?" or use the quick actions above.'
      : 'Hello! I\'m your project assistant. I can help you:\n\n' +
        '- **Analyze** your project status\n' +
        '- **Create tasks** from natural language\n' +
        '- **Identify** overdue and at-risk items\n' +
        '- **Suggest** next steps\n\n' +
        'Try: "project summary", "create task: Design login page", or "what\'s overdue?"';

    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date(),
    }]);
  }, [isAIEnabled]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Helpers ───────────────────────────────────

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: new Date() },
    ]);
  }, []);

  // ── AI streaming handler ──────────────────────

  const handleAIMessage = useCallback(async (userInput: string) => {
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-20) // Keep last 20 messages for context
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true },
    ]);
    isStreamingRef.current = true;

    try {
      await aiApi.chatStream(
        projectId,
        { message: userInput, history },
        (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + text } : m,
            ),
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m,
            ),
          );
          isStreamingRef.current = false;
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || `Sorry, an error occurred: ${error}`, isStreaming: false }
                : m,
            ),
          );
          isStreamingRef.current = false;
        },
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, failed to connect to AI service.', isStreaming: false }
            : m,
        ),
      );
      isStreamingRef.current = false;
    }
  }, [projectId, messages]);

  // ── Client-side analysis functions (fallback) ─

  const getProjectSummary = useCallback((): string => {
    const totalTasks = tasks.length;
    if (totalTasks === 0) return 'This project has no tasks yet. Want me to help you create some?';

    const byStatus: Record<string, number> = {};
    statuses.forEach((s) => { byStatus[s.name] = 0; });
    tasks.forEach((t) => {
      const s = statusMap[t.statusId];
      if (s) byStatus[s.name] = (byStatus[s.name] || 0) + 1;
    });

    const completedStatus = statuses.find((s) => s.isFinal);
    const completed = completedStatus ? tasks.filter((t) => t.statusId === completedStatus.id).length : 0;
    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    const overdue = tasks.filter((t) => {
      const s = statusMap[t.statusId];
      return t.dueDate && new Date(t.dueDate) < new Date() && !s?.isFinal;
    });

    const withDates = tasks.filter((t) => t.startDate || t.dueDate);

    let summary = `**Project Summary** (${totalTasks} tasks)\n\n`;
    summary += `**Completion:** ${completionRate}% (${completed}/${totalTasks})\n\n`;
    summary += `**By Status:**\n`;
    Object.entries(byStatus).forEach(([name, count]) => {
      if (count > 0) summary += `- ${name}: ${count}\n`;
    });

    if (overdue.length > 0) {
      summary += `\n**Overdue (${overdue.length}):**\n`;
      overdue.forEach((t) => {
        summary += `- "${t.title}" (due ${new Date(t.dueDate!).toLocaleDateString()})\n`;
      });
    }

    if (withDates.length < totalTasks) {
      summary += `\n**Note:** ${totalTasks - withDates.length} task(s) have no dates assigned.`;
    }

    return summary;
  }, [tasks, statuses, statusMap]);

  const getOverdueAnalysis = useCallback((): string => {
    const overdue = tasks.filter((t) => {
      const s = statusMap[t.statusId];
      return t.dueDate && new Date(t.dueDate) < new Date() && !s?.isFinal;
    });

    if (overdue.length === 0) {
      return 'No overdue tasks. Everything is on track!';
    }

    let result = `**${overdue.length} Overdue Task(s):**\n\n`;
    overdue
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .forEach((t) => {
        const daysOverdue = Math.ceil(
          (new Date().getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
        );
        const status = statusMap[t.statusId];
        result += `- **${t.title}** - ${daysOverdue} day(s) overdue (Status: ${status?.name || '?'})\n`;
      });

    result += '\n**Recommendation:** Prioritize these tasks or update their due dates.';
    return result;
  }, [tasks, statusMap]);

  const getSuggestions = useCallback((): string => {
    const totalTasks = tasks.length;
    if (totalTasks === 0) {
      return 'Your project is empty! Here are some suggestions:\n\n' +
        '1. Start by creating key milestones\n' +
        '2. Break down the project into phases\n' +
        '3. Assign due dates to track progress\n\n' +
        'Try: "create task: Setup project structure"';
    }

    const suggestions: string[] = [];

    const noDates = tasks.filter((t) => !t.startDate && !t.dueDate);
    if (noDates.length > 0) {
      suggestions.push(`**${noDates.length} task(s)** have no dates. Add dates to track them on the timeline.`);
    }

    const finalStatus = statuses.find((s) => s.isFinal);
    const completed = finalStatus ? tasks.filter((t) => t.statusId === finalStatus.id).length : 0;
    const rate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

    if (rate > 80) {
      suggestions.push('You\'re almost done! Focus on completing the remaining tasks.');
    } else if (rate < 20 && totalTasks > 5) {
      suggestions.push('Progress is slow. Consider breaking large tasks into smaller ones.');
    }

    const statusCounts: Record<string, number> = {};
    tasks.forEach((t) => { statusCounts[t.statusId] = (statusCounts[t.statusId] || 0) + 1; });
    const maxInOneStatus = Math.max(...Object.values(statusCounts));
    if (maxInOneStatus > totalTasks * 0.7 && totalTasks > 3) {
      const bottleneckId = Object.entries(statusCounts).find(([, c]) => c === maxInOneStatus)?.[0];
      const bottleneck = bottleneckId ? statusMap[bottleneckId] : null;
      if (bottleneck && !bottleneck.isFinal) {
        suggestions.push(`**Bottleneck:** ${maxInOneStatus} tasks are in "${bottleneck.name}". Consider moving some forward.`);
      }
    }

    if (suggestions.length === 0) {
      return 'Everything looks well-balanced! Keep up the great work.';
    }

    return '**Suggestions:**\n\n' + suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
  }, [tasks, statuses, statusMap]);

  // ── Client-side task creation with NLP parsing ─

  const handleLocalTaskCreation = useCallback(
    async (taskText: string): Promise<string | null> => {
      const defaultStatus = statuses.find((s) => !s.isFinal) || statuses[0];
      if (!defaultStatus) return 'No statuses configured. Please add statuses first.';

      let text = taskText;

      // Parse priority from text
      let priority: TaskPriority | undefined;
      const priorityPatterns: [RegExp, TaskPriority][] = [
        [/,?\s*(urgent|critical)\s*(?:priority)?/i, TaskPriority.URGENT],
        [/,?\s*high\s*(?:priority)?/i, TaskPriority.HIGH],
        [/,?\s*medium\s*(?:priority)?/i, TaskPriority.MEDIUM],
        [/,?\s*low\s*(?:priority)?/i, TaskPriority.LOW],
      ];
      for (const [pattern, pValue] of priorityPatterns) {
        if (pattern.test(text)) {
          priority = pValue;
          text = text.replace(pattern, '');
          break;
        }
      }

      // Parse due date from text
      let dueDate: string | undefined;
      const dueDatePatterns: [RegExp, () => Date][] = [
        [/,?\s*due\s*(?:by\s+)?tomorrow/i, () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; }],
        [/,?\s*due\s*(?:by\s+)?today/i, () => new Date()],
        [/,?\s*due\s*(?:by\s+)?(?:next\s+)?friday/i, () => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); return d; }],
        [/,?\s*due\s*(?:by\s+)?(?:next\s+)?monday/i, () => { const d = new Date(); d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7 || 7)); return d; }],
        [/,?\s*due\s*(?:in\s+)?(\d+)\s*days?/i, () => { const m = text.match(/due\s*(?:in\s+)?(\d+)\s*days?/i); const d = new Date(); d.setDate(d.getDate() + (m ? parseInt(m[1]) : 7)); return d; }],
      ];
      for (const [pattern, getDate] of dueDatePatterns) {
        if (pattern.test(text)) {
          const d = getDate();
          dueDate = d.toISOString().slice(0, 10);
          text = text.replace(pattern, '');
          break;
        }
      }

      const title = text.replace(/\s+/g, ' ').trim();
      const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

      // Confirm mode: show preview card
      if (taskCreationMode === 'confirm') {
        setPendingTask({
          title: capitalizedTitle,
          statusId: defaultStatus.id,
          statusName: defaultStatus.name,
          priority,
          dueDate,
        });
        let preview = `**Task Preview:**\n- Title: **${capitalizedTitle}**\n- Status: ${defaultStatus.name}`;
        if (priority) preview += `\n- Priority: **${priority}**`;
        if (dueDate) preview += `\n- Due: **${dueDate}**`;
        preview += '\n\nClick **Create** below to confirm, or **Cancel** to discard.';
        return preview;
      }

      // Auto mode: create immediately
      try {
        await createTaskMutation.mutateAsync({
          title: capitalizedTitle,
          statusId: defaultStatus.id,
          priority,
          dueDate,
        });
        let response = `Task created: **"${capitalizedTitle}"** in "${defaultStatus.name}"`;
        if (priority) response += ` | Priority: **${priority}**`;
        if (dueDate) response += ` | Due: **${dueDate}**`;
        return response;
      } catch {
        return 'Failed to create task. Please try again.';
      }
    },
    [statuses, taskCreationMode, createTaskMutation],
  );

  // ── Client-side command parser (fallback mode) ─

  const parseAndExecute = useCallback(
    async (userInput: string) => {
      const lower = userInput.toLowerCase().trim();

      if (lower.includes('summary') || lower.includes('status') || lower.includes('overview')) {
        return getProjectSummary();
      }

      if (lower.includes('overdue') || lower.includes('late') || lower.includes('behind')) {
        return getOverdueAnalysis();
      }

      if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('what should') || lower.includes('next step')) {
        return getSuggestions();
      }

      const createMatch = lower.match(/create\s+task[:\s]+(.+)/i) || lower.match(/add\s+task[:\s]+(.+)/i) || lower.match(/new\s+task[:\s]+(.+)/i);
      if (createMatch) {
        const result = await handleLocalTaskCreation(createMatch[1].trim());
        if (result) return result;
      }

      if (lower.includes('workload') || lower.includes('stats') || lower.includes('statistics')) {
        const total = tasks.length;
        const withDues = tasks.filter((t) => t.dueDate).length;
        const thisWeek = tasks.filter((t) => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          const now = new Date();
          const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return due >= now && due <= weekLater;
        });

        let result = `**Project Statistics:**\n\n`;
        result += `- Total tasks: ${total}\n`;
        result += `- Tasks with due dates: ${withDues}\n`;
        result += `- Due this week: ${thisWeek.length}\n`;

        if (thisWeek.length > 0) {
          result += `\n**Due This Week:**\n`;
          thisWeek.forEach((t) => {
            result += `- ${t.title} (${new Date(t.dueDate!).toLocaleDateString()})\n`;
          });
        }

        return result;
      }

      if (lower.includes('help') || lower === '?') {
        return '**Available Commands:**\n\n' +
          '- **"project summary"** - Overview of project status\n' +
          '- **"what\'s overdue?"** - Show overdue tasks\n' +
          '- **"suggest"** - Get recommendations\n' +
          '- **"create task: [title]"** - Create a new task\n' +
          '- **"create task: Fix login bug, high priority, due Friday"** - With priority & date\n' +
          '- **"stats"** - Show project statistics\n' +
          '- **"workload"** - Analyze workload distribution\n\n' +
          '**Task creation supports:**\n' +
          '- Priority: urgent, high, medium, low\n' +
          '- Due date: today, tomorrow, Friday, Monday, "in 3 days"';
      }

      return 'I didn\'t quite understand that. Try:\n' +
        '- "project summary"\n' +
        '- "create task: [task name]"\n' +
        '- "what\'s overdue?"\n' +
        '- "suggest next steps"\n' +
        '- "help" for all commands';
    },
    [tasks, statuses, statusMap, getProjectSummary, getOverdueAnalysis, getSuggestions, handleLocalTaskCreation]
  );

  // ── Unified message handler ───────────────────

  const processMessage = useCallback(
    async (userInput: string) => {
      if (isAIEnabled) {
        await handleAIMessage(userInput);
      } else {
        const response = await parseAndExecute(userInput);
        addMessage('assistant', response);
      }
    },
    [isAIEnabled, handleAIMessage, parseAndExecute, addMessage],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isProcessing) return;

      const userMsg = input.trim();
      setInput('');
      addMessage('user', userMsg);
      setIsProcessing(true);

      try {
        await processMessage(userMsg);
      } catch {
        addMessage('assistant', 'Sorry, something went wrong. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [input, isProcessing, addMessage, processMessage],
  );

  // ── Task confirmation handlers ────────────────

  const handleConfirmTask = useCallback(async () => {
    if (!pendingTask) return;
    try {
      await createTaskMutation.mutateAsync({
        title: pendingTask.title,
        statusId: pendingTask.statusId,
        priority: pendingTask.priority,
        dueDate: pendingTask.dueDate,
      });
      addMessage('assistant', `Task created: **"${pendingTask.title}"** in "${pendingTask.statusName}"`);
    } catch {
      addMessage('assistant', 'Failed to create task. Please try again.');
    }
    setPendingTask(null);
  }, [pendingTask, createTaskMutation, addMessage]);

  const handleCancelTask = useCallback(() => {
    setPendingTask(null);
    addMessage('assistant', 'Task creation cancelled.');
  }, [addMessage]);

  // ── Quick actions ─────────────────────────────

  const quickActions = [
    { label: 'Summary', command: 'project summary' },
    { label: 'Overdue', command: "what's overdue?" },
    { label: 'Suggestions', command: 'suggest next steps' },
    { label: 'Stats', command: 'stats' },
  ];

  const handleQuickAction = useCallback((command: string) => {
    if (isProcessing) return;
    addMessage('user', command);
    setIsProcessing(true);
    processMessage(command).finally(() => setIsProcessing(false));
  }, [isProcessing, addMessage, processMessage]);

  // ── Styles ────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '300px',
  };

  const chatAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const msgStyle = (role: 'user' | 'assistant'): React.CSSProperties => ({
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    lineHeight: 1.5,
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    backgroundColor: role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
    color: role === 'user' ? 'white' : 'var(--color-text-primary)',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  });

  const inputAreaStyle: React.CSSProperties = {
    borderTop: '1px solid var(--color-border)',
    padding: '8px 12px',
  };

  const pillStyle: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: '11px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  };

  const badgeStyle: React.CSSProperties = {
    padding: '2px 6px',
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: isAIEnabled ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
    color: isAIEnabled ? 'white' : 'var(--color-text-tertiary)',
    textTransform: 'uppercase',
  };

  // ── Markdown rendering ────────────────────────

  const renderLine = (line: string, key: number) => {
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
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => renderLine(line, i));
  };

  // ── Render ────────────────────────────────────

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
          {taskCreationMode === 'confirm' ? '✓ Confirm' : '⚡ Auto'}
        </button>

        {/* AI/Local badge */}
        <span style={badgeStyle}>
          {isAIEnabled ? 'AI' : 'Local'}
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
