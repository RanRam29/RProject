import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/projects.api';
import { ProjectHeader } from '../components/project/ProjectHeader';
import { ProjectCanvas } from '../components/project/ProjectCanvas';
import { useProjectSocket } from '../hooks/useWebSocket';
import { useProjectStore } from '../stores/project.store';
import { useEffect } from 'react';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);

  useEffect(() => {
    setActiveProjectId(projectId || null);
    return () => setActiveProjectId(null);
  }, [projectId, setActiveProjectId]);

  useProjectSocket(projectId || null);

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '48px', opacity: 0.3 }}>!</span>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Project not found</h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          The project may have been deleted or you don't have access.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ProjectHeader project={project} />
      <ProjectCanvas projectId={project.id} />
    </div>
  );
}
