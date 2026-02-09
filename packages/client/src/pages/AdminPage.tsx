import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { usersApi } from '../api/users.api';
import { useUIStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { UserDTO, ApiResponse, PaginatedResponse } from '@pm/shared';

type AdminTab = 'users' | 'logs';

const SYSTEM_ROLES = [
  { value: 'VIEWER_ONLY', label: 'Viewer Only' },
  { value: 'PROJECT_CREATOR', label: 'Project Creator' },
  { value: 'TEMPLATE_MANAGER', label: 'Template Manager' },
  { value: 'SYS_ADMIN', label: 'System Admin' },
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create user form
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSystemRole, setNewSystemRole] = useState('PROJECT_CREATOR');
  const [createError, setCreateError] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<UserDTO>>('/users');
      return res.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ users: number; projects: number; tasks: number }>>('/admin/stats');
      return res.data.data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; password: string; displayName: string; systemRole?: string }) =>
      usersApi.create(data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      addToast({ type: 'success', message: `User "${user.displayName}" created successfully` });
      resetCreateForm();
    },
    onError: (err: Error) => {
      setCreateError(err.message || 'Failed to create user');
    },
  });

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewDisplayName('');
    setNewEmail('');
    setNewPassword('');
    setNewSystemRole('PROJECT_CREATOR');
    setCreateError('');
  };

  const handleCreateUser = () => {
    setCreateError('');
    if (!newDisplayName.trim() || !newEmail.trim() || !newPassword) {
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
      systemRole: newSystemRole,
    });
  };

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    maxWidth: '1100px',
    margin: '0 auto',
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  };

  const statCardStyle: React.CSSProperties = {
    padding: '20px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
    textAlign: 'center' as const,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: active ? 600 : 400,
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '16px',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left' as const,
    padding: '10px 12px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '14px',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: '13px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    outline: 'none',
    width: '100%',
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>Admin Panel</h1>

      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-accent)' }}>
            {statsData?.users || 0}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Total Users
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-success)' }}>
            {statsData?.projects || 0}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Total Projects
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-warning)' }}>
            {statsData?.tasks || 0}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Total Tasks
          </div>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
        <button style={tabStyle(activeTab === 'users')} onClick={() => setActiveTab('users')}>
          Users
        </button>
        <button style={tabStyle(activeTab === 'logs')} onClick={() => setActiveTab('logs')}>
          Activity Logs
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Create User button / form */}
          <div style={{ marginBottom: '16px' }}>
            {!showCreateForm ? (
              <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
                + Create User
              </Button>
            ) : (
              <div
                style={{
                  padding: '20px',
                  border: '1px solid var(--color-accent)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-accent-light)',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
                  Create New User
                </div>
                {createError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-danger-light)',
                      border: '1px solid var(--color-danger)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-danger)',
                      fontSize: '12px',
                      fontWeight: 500,
                      marginBottom: '12px',
                    }}
                  >
                    {createError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                      System Role
                    </label>
                    <select
                      style={selectStyle}
                      value={newSystemRole}
                      onChange={(e) => setNewSystemRole(e.target.value)}
                    >
                      {SYSTEM_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                  <Button variant="ghost" size="sm" onClick={resetCreateForm}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateUser}
                    loading={createUserMutation.isPending}
                  >
                    Create User
                  </Button>
                </div>
              </div>
            )}
          </div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersData?.data?.map((user) => (
                <UserRow key={user.id} user={user} selectStyle={selectStyle} tdStyle={tdStyle} />
              )) || (
                <tr>
                  <td style={tdStyle} colSpan={6}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {activeTab === 'logs' && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>
          Activity logs will appear here
        </div>
      )}
    </div>
  );
}

/* ─── UserRow sub-component ─── */

function UserRow({
  user,
  selectStyle,
  tdStyle,
}: {
  user: UserDTO;
  selectStyle: React.CSSProperties;
  tdStyle: React.CSSProperties;
}) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = user.id === currentUserId;

  const roleMutation = useMutation({
    mutationFn: (newRole: string) => usersApi.updateRole(user.id, newRole),
    onSuccess: (_data, newRole) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      const label = SYSTEM_ROLES.find((r) => r.value === newRole)?.label ?? newRole;
      addToast({ type: 'success', message: `${user.displayName}'s role changed to ${label}` });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Failed to update role' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => usersApi.deactivate(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      addToast({ type: 'success', message: `${user.displayName} has been deactivated` });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Failed to deactivate user' });
    },
  });

  const badgeStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: active ? 'var(--color-success-light, rgba(34,197,94,0.12))' : 'var(--color-danger-light, rgba(239,68,68,0.12))',
    color: active ? 'var(--color-success, #22c55e)' : 'var(--color-danger, #ef4444)',
  });

  return (
    <tr>
      <td style={tdStyle}>
        <div style={{ fontWeight: 500 }}>{user.displayName}</div>
      </td>
      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{user.email}</td>
      <td style={tdStyle}>
        {isSelf ? (
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            {SYSTEM_ROLES.find((r) => r.value === user.systemRole)?.label ?? user.systemRole}
          </span>
        ) : (
          <select
            style={{ ...selectStyle, width: 'auto', minWidth: '140px' }}
            value={user.systemRole}
            disabled={roleMutation.isPending}
            onChange={(e) => roleMutation.mutate(e.target.value)}
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </td>
      <td style={tdStyle}>
        <span style={badgeStyle(user.isActive)}>{user.isActive ? 'Active' : 'Inactive'}</span>
      </td>
      <td style={{ ...tdStyle, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td style={tdStyle}>
        {isSelf ? (
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>You</span>
        ) : user.isActive ? (
          <span style={{ color: 'var(--color-danger)', fontSize: '12px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to deactivate ${user.displayName}?`)) {
                  deactivateMutation.mutate();
                }
              }}
              loading={deactivateMutation.isPending}
            >
              Deactivate
            </Button>
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Deactivated</span>
        )}
      </td>
    </tr>
  );
}
