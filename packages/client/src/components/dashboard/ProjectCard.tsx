import React from 'react';
import type { ProjectDTO } from '@pm/shared';
import { card, cardHover } from './shared';

const PROJECT_GRADIENTS = [
    ['#5B8DEF', '#A78BFA'], ['#34D399', '#5B8DEF'], ['#FB7185', '#FBBF24'],
    ['#A78BFA', '#FB7185'], ['#38BDF8', '#34D399'], ['#FBBF24', '#FB7185'],
];

interface ProjectCardProps { project: ProjectDTO; index: number; onClick: () => void; }

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, onClick }) => {
    const [g1, g2] = PROJECT_GRADIENTS[index % PROJECT_GRADIENTS.length];
    return (
        <div
            onClick={onClick}
            style={{ ...card, padding: '18px 20px', cursor: 'pointer', transition: 'all var(--transition-fast)', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}
            onMouseEnter={cardHover.onEnter} onMouseLeave={cardHover.onLeave}
        >
            <div style={{ height: '3px', borderRadius: '999px', background: `linear-gradient(90deg, ${g1}, ${g2})`, marginBottom: '4px' }} />

            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
            </div>

            {project.description && (
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {project.description}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: project.status === 'ACTIVE' ? '#D1FAE5' : 'var(--color-bg-tertiary)',
                    color: project.status === 'ACTIVE' ? '#065F46' : 'var(--color-text-secondary)',
                }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: project.status === 'ACTIVE' ? '#34D399' : 'var(--color-text-secondary)' }} />
                    {project.status}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </div>
        </div>
    );
};
