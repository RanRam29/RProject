import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { activityApi } from '../../api/activity.api';
import { card } from './shared';
import { Skeleton } from '../ui/Skeleton';

export const VelocityWidget: React.FC = () => {
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['my-activity', 'velocity'],
        queryFn: () => activityApi.listUserActivity(100),
        staleTime: 60_000,
    });

    const chartData = useMemo(() => {
        if (!logs.length) return [];

        // Create an array for the last 7 days
        const days: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
            days[dateStr] = 0;
        }

        // Filter for task.completed or status changes to final
        logs.forEach(log => {
            if (log.action === 'task.status_changed') {
                // rough approximation: if we had a specific completed action we'd use it, 
                // but let's count any activity as 'engagement' or specifically task closures if metadata is available.
            }

            const d = new Date(log.createdAt);
            const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
            if (days[dateStr] !== undefined) {
                // Count activity volume
                days[dateStr] += 1;
            }
        });

        return Object.entries(days).map(([name, Activity]) => ({ name, Activity }));
    }, [logs]);

    return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Activity Velocity</h3>
                <p style={{ fontSize: '11.5px', color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>Engagement over last 7 days</p>
            </div>
            <div style={{ flex: 1, padding: '16px 20px 20px 0', minHeight: 0 }}>
                {isLoading ? (
                    <div style={{ paddingLeft: '20px', height: '100%', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} width="100%" height={`${Math.random() * 60 + 20}%`} borderRadius="4px" />
                        ))}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} dx={-10} allowDecimals={false} />
                            <Tooltip
                                cursor={{ fill: 'var(--color-bg-tertiary)' }}
                                contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}
                            />
                            <Bar dataKey="Activity" fill="#5B8DEF" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
