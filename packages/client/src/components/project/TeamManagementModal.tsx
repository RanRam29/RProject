import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from '../../api/permissions.api';
import { usersApi } from '../../api/users.api';
import { useUIStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ProjectRole } from '@pm/shared';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  OWNER: { label: 'Owner', color: '#8B5CF6', description: 'Full control over the project' },
  EDITOR: { label: 'Editor', color: '#3B82F6', description: 'Can create, edit, delete tasks and files' },
  VIEWER: { label: 'Viewer', color: '#6B7280', description: 'Read-only access' },
  CUSTOM: { label: 'Custom', color: '#F59E0B', description: 'Custom permissions' },
};

type InviteMode = 'search' | 'create';

export function TeamManagementModal({ isOpen, onClose, projectId }: TeamManagementModalProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteMode, setInviteMode] = useState<InviteMode>('search');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('EDITOR' as ProjectRole);
  const [editingPermId, setEditingPermId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<ProjectRole>('EDITOR' as ProjectRole);

  // Create user form state
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createError, setCreateError] = useState('');

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => permissionsApi.list(projectId),
    enabled: isOpen,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['users-search', searchQuery],
    queryFn: () => usersApi.list(searchQuery),
    enabled: showInvite && inviteMode === 'search' && searchQuery.length >= 2,
  });

  // Filter out users who already have permissions
  const existingUserIds = new Set(permissions.map((p) => p.userId));
  const availableUsers = searchResults.filter((u) => !existingUserIds.has(u.id));

  const inviteMutation = useMutation({
    mutationFn: (data: { userId: string; role: ProjectRole }) =>
      permissionsApi.invite(projectId, { userId: data.userId, role: data.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', projectId] });
      addToast({ type: 'success', message: 'Member added' });
      resetInviteForm();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error || 'Failed to add member';
      addToast({ type: 'error', message });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; password: string; displayName: string }) =>
      usersApi.create(data),
    onSuccess: (newUser) => {
      addToast({ type: 'success', message: `User "${newUser.displayName}" created` });
      // Auto-invite the new user to the project
      inviteMutation.mutate({ userId: newUser.id, role: selectedRole });
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error || (err as Error).message || 'Failed to create user';
      setCreateError(message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: { permId: string; role: ProjectRole }) =>
      permissionsApi.update(projectId, data.permId, { role: data.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', projectId] });
      addToast({ type: 'success', message: 'Role updated' });
      setEditingPermId(null);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update role' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (permId: string) => permissionsApi.remove(projectId, permId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', projectId] });
      addToast({ type: 'success', message: 'Member removed' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to remove member' });
    },
  });

  const resetInviteForm = () => {
    setShowInvite(false);
    setInviteMode('search');
    setSearchQuery('');
    setSelectedUserId('');
    setNewEmail('');
    setNewDisplayName('');
    setNewPassword('');
    setCreateError('');
  };

  const handleInvite = useCallback(() => {
    if (!selectedUserId) return;
    inviteMutation.mutate({ userId: selectedUserId, role: selectedRole });
  }, [selectedUserId, selectedRole, inviteMutation]);

  const handleCreateUser = useCallback(() => {
    setCreateError('');
    if (!newEmail.trim() || !newDisplayName.trim() || !newPassword) {
      setCreateError('All fields are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setCreateError('Please enter a valid email address.');
      return;
    }
    if (newPassword.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }
    createUserMutation.mutate({
      email: newEmail.trim(),
      password: newPassword,
      displayName: newDisplayName.trim(),
    });
  }, [newEmail, newDisplayName, newPassword, createUserMutation]);

  const memberRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    marginBottom: '8px',
    transition: 'background var(--transition-fast)',
  };

  const avatarStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-accent)',
    flexShrink: 0,
  };

  const selectStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    outline: 'none',
  };

  const roleBadgeStyle = (role: string): React.CSSProperties => {
    const r = ROLE_LABELS[role] || ROLE_LABELS.VIEWER;
    return {
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      backgroundColor: r.color + '18',
      color: r.color,
    };
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

  const errorBannerStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: 'var(--color-danger-light)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-danger)',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '8px',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Team Management" size="lg">
      <div>
        {/* Header with invite button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {permissions.length} member{permissions.length !== 1 ? 's' : ''}
          </span>
          {!showInvite && (
            <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
              + Add Member
            </Button>
          )}
        </div>

        {/* Invite section */}
        {showInvite && (
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              backgroundColor: 'var(--color-accent-light)',
            }}
          >
            {/* Tabs: Search existing / Create new */}
            <div style={{ display: 'flex', marginBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
              <button style={tabStyle(inviteMode === 'search')} onClick={() => setInviteMode('search')}>
                Search Existing User
              </button>
              <button style={tabStyle(inviteMode === 'create')} onClick={() => setInviteMode('create')}>
                Create New User
              </button>
            </div>

            {inviteMode === 'search' ? (
              <>
                <Input
                  label="Search users by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type at least 2 characters..."
                  fullWidth
                  autoFocus
                />

                {/* Search results */}
                {availableUsers.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg-elevated)',
                    }}
                  >
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: selectedUserId === user.id ? 'var(--color-accent-light)' : 'transparent',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <div style={{ ...avatarStyle, width: '28px', height: '28px', fontSize: '12px' }}>
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{user.displayName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{user.email}</div>
                        </div>
                        {selectedUserId === user.id && (
                          <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '14px' }}>&#10003;</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && availableUsers.length === 0 && searchResults.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    All matching users are already members
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    No users found.{' '}
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                      onClick={() => setInviteMode('create')}
                    >
                      Create a new user instead
                    </button>
                  </div>
                )}

                {/* Role selection + invite button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Role:</label>
                  <select
                    style={selectStyle}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <Button variant="ghost" size="sm" onClick={resetInviteForm}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleInvite}
                      disabled={!selectedUserId}
                      loading={inviteMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Create new user form */}
                {createError && <div style={errorBannerStyle}>{createError}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input
                    label="Display Name"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="John Doe"
                    fullWidth
                    autoFocus
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    fullWidth
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    fullWidth
                  />
                </div>

                {/* Role selection + create button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Project Role:</label>
                  <select
                    style={selectStyle}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <Button variant="ghost" size="sm" onClick={resetInviteForm}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCreateUser}
                      loading={createUserMutation.isPending}
                    >
                      Create & Add
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Members list */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
            Loading members...
          </div>
        ) : (
          <div>
            {permissions.map((perm) => {
              const isMe = perm.userId === currentUser?.id;
              const isPermOwner = perm.role === 'OWNER';
              const isEditing = editingPermId === perm.id;

              return (
                <div
                  key={perm.id}
                  style={memberRowStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={avatarStyle}>
                    {(perm.user?.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {perm.user?.displayName || 'Unknown'}
                      {isMe && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>(you)</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      {perm.user?.email}
                    </div>
                  </div>

                  {/* Role display/edit */}
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <select
                        style={selectStyle}
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as ProjectRole)}
                      >
                        <option value="OWNER">Owner</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateRoleMutation.mutate({ permId: perm.id, role: editRole })}
                        loading={updateRoleMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingPermId(null)}>
                        &#215;
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={roleBadgeStyle(perm.role)}>{ROLE_LABELS[perm.role]?.label || perm.role}</span>

                      {!isPermOwner && !isMe && (
                        <>
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: 'var(--color-text-tertiary)',
                              padding: '2px 4px',
                            }}
                            onClick={() => {
                              setEditingPermId(perm.id);
                              setEditRole(perm.role as ProjectRole);
                            }}
                            title="Change role"
                          >
                            &#9998;
                          </button>
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: 'var(--color-danger)',
                              padding: '2px 4px',
                            }}
                            onClick={() => {
                              if (confirm(`Remove ${perm.user?.displayName} from the project?`)) {
                                removeMutation.mutate(perm.id);
                              }
                            }}
                            title="Remove member"
                          >
                            &#215;
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Roles legend */}
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Role Permissions
          </div>
          {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'CUSTOM').map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={roleBadgeStyle(key)}>{val.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{val.description}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
