import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi, type MyTaskDTO } from '../../api/users.api';
import { PRIORITY_CONFIG } from '@pm/shared';
import { card } from './shared';
import { Skeleton } from '../ui/Skeleton';

export const priorityBadge = (priority: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
        URGENT: { bg: '#FEE2E2', color: '#991B1B' },
        HIGH: { bg: '#FFE4E6', color: '#9F1239' },
        MEDIUM: { bg: '#FEF3C7', color: '#92400E' },
        LOW: { bg: '#D1FAE5', color: '#065F46' },
    };
    const c = map[priority] ?? { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' };
    return { ...c, padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600, whiteSpace: 'nowrap' };
};

export const MyTasksWidget: React.FC = () => {
    const navigate = useNavigate();
    const { data: myTasks = [], isLoading } = useQuery({
        queryKey: ['my-tasks'],
        queryFn: () => usersApi.getMyTasks(8),
        staleTime: 30_000,
    });

    return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>My Tasks</h3>
            </div>
            <div style={{ padding: '6px 0', flex: 1, overflowY: 'auto' }}>
                {isLoading ? (
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} height="20px" width="100%" borderRadius="4px" />
                        ))}
                    </div>
                ) : myTasks.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>No tasks assigned.</div>
                ) : myTasks.map((task: MyTaskDTO) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.status?.isFinal;
                    return (
                        <div
                            key={task.id}
                            onClick={() => navigate(`/projects/${task.projectId}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 18px', cursor: 'pointer', transition: 'background var(--transition-fast)', borderBottom: '1px solid transparent' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {task.priority !== 'NONE' && (() => {
                                const cfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                                return cfg ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} /> : null;
                            })()}
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: task.status?.isFinal ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', textDecoration: task.status?.isFinal ? 'line-through' : 'none' }}>
                                {task.title}
                            </span>
                            {task.priority && task.priority !== 'NONE' && (
                                <span style={priorityBadge(task.priority)}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', padding: '2px 6px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                {task.project?.name}
                            </span>
                            {task.dueDate && (
                                <span style={{ fontSize: '11.5px', fontWeight: 500, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
