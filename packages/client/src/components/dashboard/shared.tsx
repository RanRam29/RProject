import React from 'react';

export const card: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-elevated)',
    backdropFilter: 'blur(24px) saturate(1.8)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
};

export const cardHover = {
    onEnter: (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
    },
    onLeave: (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'translateY(0)';
    },
};

export const PlusIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

export const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export const FolderIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

export const ClockIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
