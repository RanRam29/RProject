import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '../api/templates.api';
import { projectsApi } from '../api/projects.api';
import { useUIStore } from '../stores/ui.store';
import type { TemplateDTO } from '@pm/shared';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDTO | null>(null);
  const [projectName, setProjectName] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });

  const instantiateMutation = useMutation({
    mutationFn: (data: { templateId: string; name: string }) =>
      projectsApi.instantiate({ templateId: data.templateId, name: data.name }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      addToast({ type: 'success', message: 'Project created from template!' });
      navigate(`/projects/${project.id}`);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create project from template' });
    },
  });

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  };

  const cardStyle: React.CSSProperties = {
    padding: '20px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  };

  if (isLoading) {
    return <div style={{ ...containerStyle, textAlign: 'center', padding: '60px' }}>Loading...</div>;
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Templates</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
        Start a new project from a pre-configured template
      </p>

      <div style={gridStyle}>
        {templates.map((template) => (
          <div
            key={template.id}
            style={cardStyle}
            onClick={() => {
              setSelectedTemplate(template);
              setProjectName(`${template.name} Project`);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              {template.name}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              {template.description || 'No description'}
            </p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
              {template.isPublic && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-accent-light)',
                    color: 'var(--color-accent)',
                    fontWeight: 500,
                  }}
                >
                  Public
                </span>
              )}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>
            No templates available yet
          </div>
        )}
      </div>

      {/* Simple modal for instantiation */}
      {selectedTemplate && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'var(--color-bg-overlay)',
              zIndex: 300,
            }}
            onClick={() => setSelectedTemplate(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '400px',
              zIndex: 301,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
              Create from "{selectedTemplate.name}"
            </h3>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box' as const,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (projectName.trim()) {
                    instantiateMutation.mutate({
                      templateId: selectedTemplate.id,
                      name: projectName.trim(),
                    });
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Create Project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
