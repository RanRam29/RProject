import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usersApi } from '../../api/users.api';
import { card } from './shared';
import { Skeleton } from '../ui/Skeleton';

const COLORS = ['#5B8DEF', '#34D399', '#A78BFA', '#FB7185', '#FBBF24', '#38BDF8'];

export const DistributionWidget: React.FC = () => {
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['my-tasks', 'distribution'],
        queryFn: () => usersApi.getMyTasks(100),
        staleTime: 60_000,
    });

    const chartData = useMemo(() => {
        if (!tasks.length) return [];
        const projCounts: Record<string, number> = {};

        tasks.forEach(task => {
            if (task.status?.isFinal) return; // Only count active tasks
            const pName = task.project?.name || 'Unknown Project';
            projCounts[pName] = (projCounts[pName] || 0) + 1;
        });

        return Object.entries(projCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // top 5 projects
    }, [tasks]);

    return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Workload Distribution</h3>
                <p style={{ fontSize: '11.5px', color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>Active Tasks by Project</p>
            </div>
            <div style={{ flex: 1, padding: '16px 20px', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLoading ? (
                    <Skeleton width="150px" height="150px" borderRadius="50%" />
                ) : chartData.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>No active tasks to display.</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}
                                itemStyle={{ color: 'var(--color-text-primary)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-secondary)', paddingTop: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
