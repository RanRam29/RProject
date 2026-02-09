import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { useProjectPermission } from '../../hooks/usePermission';
import { useUIStore } from '../../stores/ui.store';
import { useWSStore } from '../../stores/ws.store';
import { TeamManagementModal } from './TeamManagementModal';
import { ProjectSettings } from './ProjectSettings';
import type { ProjectDTO } from '@pm/shared';

interface ProjectHeaderProps {
  project: ProjectDTO;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const { isOwner } = useProjectPermission(project.id);
  const onlineUsers = useWSStore((s) => s.onlineUsers);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [showTeam, setShowTeam] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: { name: string }) => projectsApi.update(project.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      setIsEditing(false);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update project name' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => projectsApi.updateStatus(project.id, 'ARCHIVED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      addToast({ type: 'success', message: 'Project archived' });
    },
  });

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
  };

  const leftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const rightStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const statusBadgeStyle: React.CSSProperties = {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 500,
    backgroundColor:
      project.status === 'ACTIVE' ? 'var(--color-success-light)' : 'var(--color-bg-tertiary)',
    color:
      project.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-secondary)',
  };

  const avatarGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
  };

  const onlineAvatarStyle = (index: number): React.CSSProperties => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-accent)',
    border: '2px solid var(--color-bg-elevated)',
    marginLeft: index > 0 ? '-8px' : '0',
  });

  const menuBtnStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    padding: '4px 10px',
    fontSize: '16px',
    color: 'var(--color-text-secondary)',
  };

  return (
    <div style={headerStyle}>
      <div style={leftStyle}>
        {isEditing && isOwner ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ name });
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onBlur={() => setIsEditing(false)}
              style={{
                fontSize: '20px',
                fontWeight: 700,
                border: 'none',
                borderBottom: '2px solid var(--color-accent)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-primary)',
                outline: 'none',
                padding: '0 0 2px',
              }}
            />
          </form>
        ) : (
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              margin: 0,
              cursor: isOwner ? 'pointer' : 'default',
            }}
            onClick={() => isOwner && setIsEditing(true)}
            title={isOwner ? 'Click to edit' : undefined}
          >
            {project.name}
          </h1>
        )}
        <span style={statusBadgeStyle}>{project.status}</span>
      </div>

      <div style={rightStyle}>
        {onlineUsers.length > 0 && (
          <div style={avatarGroupStyle}>
            {onlineUsers.slice(0, 5).map((user, i) => (
              <div key={user.id} style={onlineAvatarStyle(i)} title={user.displayName}>
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
            {onlineUsers.length > 5 && (
              <div style={onlineAvatarStyle(5)}>+{onlineUsers.length - 5}</div>
            )}
          </div>
        )}

        {isOwner && (
          <>
            <button
              style={{ ...menuBtnStyle, fontSize: '13px' }}
              onClick={() => setShowSettings(true)}
              title="Project Settings"
            >
              &#9881; Settings
            </button>
            <button
              style={{ ...menuBtnStyle, fontSize: '13px' }}
              onClick={() => setShowTeam(true)}
              title="Team & Permissions"
            >
              &#128101; Team
            </button>
            <button
              style={{ ...menuBtnStyle, fontSize: '13px' }}
              onClick={() => archiveMutation.mutate()}
              title="Archive project"
            >
              &#128451;
            </button>
          </>
        )}
      </div>

      <TeamManagementModal
        isOpen={showTeam}
        onClose={() => setShowTeam(false)}
        projectId={project.id}
      />

      <ProjectSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        projectId={project.id}
      />
    </div>
  );
}
