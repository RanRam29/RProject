import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';
import { card, cardHover } from './shared';
import { Skeleton } from '../ui/Skeleton';

const STAT_CONFIGS = [
    { key: 'totalTasks', label: 'Active Tasks', color: '#5B8DEF', bg: '#EBF2FF', icon: '📋' },
    { key: 'overdueTasks', label: 'Overdue', color: '#F87171', bg: '#FEE2E2', icon: '⚠️' },
    { key: 'completedThisWeek', label: 'Done This Week', color: '#34D399', bg: '#D1FAE5', icon: '✅' },
    { key: 'teamMembers', label: 'Team Members', color: '#A78BFA', bg: '#EDE9FE', icon: '👥' },
] as const;

export const StatsCardsWidget: React.FC = () => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['my-stats'],
        queryFn: () => usersApi.getMyStats(),
        staleTime: 60_000,
    });

    return (
        <div className="db-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', height: '100%' }}>
            {STAT_CONFIGS.map(cfg => {
                const value = stats?.[cfg.key] ?? '—';
                return (
                    <div key={cfg.key} style={{ ...card, padding: '18px 20px', transition: 'all var(--transition-fast)', cursor: 'default', display: 'flex', flexDirection: 'column', height: '100%' }}
                        onMouseEnter={cardHover.onEnter} onMouseLeave={cardHover.onLeave}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>
                                {cfg.icon}
                            </div>
                        </div>
                        {isLoading ? (
                            <Skeleton width="60px" height="26px" borderRadius="4px" />
                        ) : (
                            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-1px' }}>{value}</div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '5px', fontWeight: 500 }}>{cfg.label}</div>
                    </div>
                );
            })}
        </div>
    );
};
