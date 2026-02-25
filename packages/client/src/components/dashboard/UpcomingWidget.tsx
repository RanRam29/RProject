import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi, type MyTaskDTO } from '../../api/users.api';
import { card } from './shared';
import { Skeleton } from '../ui/Skeleton';

export const UpcomingWidget: React.FC = () => {
    const navigate = useNavigate();
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 86400_000);

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['upcoming-deadlines'],
        queryFn: () => usersApi.getMyTasks(8, { dueAfter: now.toISOString(), dueBefore: week.toISOString() }),
        staleTime: 60_000,
    });

    const dueLabel = (dateStr: string) => {
        const d = new Date(dateStr);
        const diff = Math.ceil((d.getTime() - now.getTime()) / 86400_000);
        if (diff <= 0) return { label: 'Today', color: 'var(--color-danger)' };
        if (diff === 1) return { label: 'Tomorrow', color: 'var(--color-warning)' };
        return { label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), color: 'var(--color-text-secondary)' };
    };

    return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Upcoming Deadlines</h3>
                <p style={{ fontSize: '11.5px', color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>Next 7 days</p>
            </div>
            <div style={{ padding: '6px 0', flex: 1, overflowY: 'auto' }}>
                {isLoading ? (
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} height="20px" width="100%" borderRadius="4px" />
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                        🎉 No upcoming deadlines!
                    </div>
                ) : tasks.map((task: MyTaskDTO) => {
                    const cfg = task.dueDate ? dueLabel(task.dueDate) : null;
                    return (
                        <div
                            key={task.id}
                            onClick={() => navigate(`/projects/${task.projectId}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 18px', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>{task.title}</span>
                            <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '6px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{task.project?.name}</span>
                            {cfg && (
                                <span style={{ fontSize: '12px', fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
