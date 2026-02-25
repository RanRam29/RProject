import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityLogDTO } from '../../api/activity.api';
import { card, ClockIcon } from './shared';
import { formatAction, timeAgo } from '../../utils/activity.utils';
import { Skeleton, SkeletonText } from '../ui/Skeleton';

export const ActivityWidget: React.FC = () => {
    const navigate = useNavigate();
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['my-activity'],
        queryFn: () => activityApi.listUserActivity(12),
        staleTime: 30_000,
    });

    return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Recent Activity</h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {isLoading ? (
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px' }}>
                                <Skeleton width="30px" height="30px" borderRadius="50%" />
                                <div style={{ flex: 1 }}>
                                    <SkeletonText lines={2} gap="6px" lineHeight="12px" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                        No recent activity yet.
                    </div>
                ) : logs.map((log: ActivityLogDTO) => {
                    const { verb } = formatAction(log.action, log.metadata as Record<string, unknown>);
                    const initial = log.user?.displayName?.charAt(0).toUpperCase() || '?';
                    return (
                        <div
                            key={log.id}
                            onClick={() => navigate(`/projects/${log.projectId}`)}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 18px', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #5B8DEF, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                {log.user?.avatarUrl
                                    ? <img src={log.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{initial}</span>
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                                    <span style={{ fontWeight: 600 }}>{log.user?.displayName || 'Someone'}</span>
                                    {' '}<span style={{ color: 'var(--color-text-secondary)' }}>{verb}</span>
                                    {log.project && (
                                        <> {' '}
                                            <span style={{ fontWeight: 500, color: 'var(--color-accent)' }}>{log.project.name}</span>
                                        </>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', color: 'var(--color-text-tertiary)', fontSize: '11.5px' }}>
                                    <ClockIcon />
                                    {timeAgo(log.createdAt)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
