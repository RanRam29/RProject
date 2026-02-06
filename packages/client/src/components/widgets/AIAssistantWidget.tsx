import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import type { WidgetProps } from './widget.types';
import type { TaskStatusDTO } from '@pm/shared';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistantWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your project AI assistant. I can help you:\n\n' +
        '- **Analyze** your project status\n' +
        '- **Create tasks** from natural language\n' +
        '- **Identify** overdue and at-risk items\n' +
        '- **Suggest** next steps\n\n' +
        'Try: "project summary", "create task: Design login page", or "what\'s overdue?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; statusId: string; startDate?: string; dueDate?: string }) =>
      tasksApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => { statusMap[s.id] = s; });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: new Date() },
    ]);
  }, []);

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

    // Check tasks without dates
    const noDates = tasks.filter((t) => !t.startDate && !t.dueDate);
    if (noDates.length > 0) {
      suggestions.push(`**${noDates.length} task(s)** have no dates. Add dates to track them on the timeline.`);
    }

    // Check completion rate
    const finalStatus = statuses.find((s) => s.isFinal);
    const completed = finalStatus ? tasks.filter((t) => t.statusId === finalStatus.id).length : 0;
    const rate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

    if (rate > 80) {
      suggestions.push('You\'re almost done! Focus on completing the remaining tasks.');
    } else if (rate < 20 && totalTasks > 5) {
      suggestions.push('Progress is slow. Consider breaking large tasks into smaller ones.');
    }

    // Check if all tasks are in same status
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

  const parseAndExecute = useCallback(
    async (userInput: string) => {
      const lower = userInput.toLowerCase().trim();

      // Project summary
      if (lower.includes('summary') || lower.includes('status') || lower.includes('overview')) {
        return getProjectSummary();
      }

      // Overdue analysis
      if (lower.includes('overdue') || lower.includes('late') || lower.includes('behind')) {
        return getOverdueAnalysis();
      }

      // Suggestions
      if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('what should') || lower.includes('next step')) {
        return getSuggestions();
      }

      // Create task
      const createMatch = lower.match(/create\s+task[:\s]+(.+)/i) || lower.match(/add\s+task[:\s]+(.+)/i) || lower.match(/new\s+task[:\s]+(.+)/i);
      if (createMatch) {
        const title = createMatch[1].trim();
        const defaultStatus = statuses.find((s) => !s.isFinal) || statuses[0];
        if (!defaultStatus) return 'No statuses configured. Please add statuses first.';

        try {
          await createTaskMutation.mutateAsync({
            title: title.charAt(0).toUpperCase() + title.slice(1),
            statusId: defaultStatus.id,
          });
          return `Task created: **"${title}"** in "${defaultStatus.name}" status.`;
        } catch {
          return 'Failed to create task. Please try again.';
        }
      }

      // Workload / stats
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

      // Help
      if (lower.includes('help') || lower === '?') {
        return '**Available Commands:**\n\n' +
          '- **"project summary"** - Overview of project status\n' +
          '- **"what\'s overdue?"** - Show overdue tasks\n' +
          '- **"suggest"** - Get recommendations\n' +
          '- **"create task: [title]"** - Create a new task\n' +
          '- **"stats"** - Show project statistics\n' +
          '- **"workload"** - Analyze workload distribution';
      }

      return 'I didn\'t quite understand that. Try:\n' +
        '- "project summary"\n' +
        '- "create task: [task name]"\n' +
        '- "what\'s overdue?"\n' +
        '- "suggest next steps"\n' +
        '- "help" for all commands';
    },
    [tasks, statuses, statusMap, getProjectSummary, getOverdueAnalysis, getSuggestions, createTaskMutation]
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
        const response = await parseAndExecute(userMsg);
        addMessage('assistant', response);
      } catch {
        addMessage('assistant', 'Sorry, something went wrong. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [input, isProcessing, addMessage, parseAndExecute]
  );

  const quickActions = [
    { label: 'Summary', command: 'project summary' },
    { label: 'Overdue', command: "what's overdue?" },
    { label: 'Suggestions', command: 'suggest next steps' },
    { label: 'Stats', command: 'stats' },
  ];

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

  // Safe markdown-like rendering (no dangerouslySetInnerHTML)
  const renderLine = (line: string, key: number) => {
    if (!line) return <div key={key}>&nbsp;</div>;

    // Split on **bold** markers and render as React elements
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

  return (
    <div style={containerStyle}>
      {/* Quick actions */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--color-border)',
        flexWrap: 'wrap',
      }}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              setInput(action.command);
              // Auto-submit
              addMessage('user', action.command);
              setIsProcessing(true);
              parseAndExecute(action.command).then((r) => {
                addMessage('assistant', r);
                setIsProcessing(false);
              });
            }}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
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
      </div>

      {/* Chat area */}
      <div style={chatAreaStyle}>
        {messages.map((msg) => (
          <div key={msg.id} style={msgStyle(msg.role)}>
            {renderContent(msg.content)}
          </div>
        ))}
        {isProcessing && (
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
            placeholder='Try "project summary" or "create task: ..."'
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
