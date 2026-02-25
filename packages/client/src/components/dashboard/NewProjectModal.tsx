import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { useUIStore } from '../../stores/ui.store';
import { card } from './shared';

interface NewProjectModalProps { isOpen: boolean; onClose: () => void; }

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const addToast = useUIStore(s => s.addToast);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const createMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) => projectsApi.create(data),
        onSuccess: (project) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            addToast({ type: 'success', message: 'Project created!' });
            setName(''); setDescription(''); onClose();
            navigate(`/projects/${project.id}`);
        },
        onError: () => addToast({ type: 'error', message: 'Failed to create project' }),
    });

    if (!isOpen) return null;

    const inp: React.CSSProperties = {
        width: '100%', padding: '10px 13px',
        border: '1.5px solid var(--color-border)',
        borderRadius: '9px', fontSize: '14px',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        outline: 'none', transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
        boxSizing: 'border-box',
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--color-bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '24px', animation: 'fadeIn var(--transition-fast) ease', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                style={{ ...card, padding: '28px', width: '100%', maxWidth: '460px', animation: 'scaleIn var(--transition-fast) ease', boxShadow: 'var(--shadow-xl)' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>New Project</h2>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '3px 0 0' }}>Set up your workspace</p>
                    </div>
                    <button onClick={onClose} style={{ width: '30px', height: '30px', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >&times;</button>
                </div>

                <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; createMutation.mutate({ name: name.trim(), description: description.trim() || undefined }); }}>
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.2px' }}>
                            Project Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website Redesign" autoFocus
                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-light)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <div style={{ marginBottom: '22px' }}>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.2px' }}>Description</label>
                        <textarea style={{ ...inp, minHeight: '76px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?"
                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-light)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '9px 16px', border: '1.5px solid var(--color-border)', borderRadius: '9px', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >Cancel</button>
                        <button type="submit" disabled={!name.trim() || createMutation.isPending}
                            style={{ padding: '9px 20px', border: 'none', borderRadius: '9px', background: 'linear-gradient(135deg, #5B8DEF, #4A7ADE)', color: '#fff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', transition: 'all var(--transition-fast)', opacity: !name.trim() || createMutation.isPending ? 0.6 : 1, boxShadow: '0 2px 8px rgba(91,141,239,0.3)' }}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
