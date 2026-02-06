import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../api/users.api';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { BreadcrumbNav } from '../components/layout/BreadcrumbNav';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s) => s.addToast);

  // Profile form
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: (data: { displayName?: string; avatarUrl?: string }) =>
      usersApi.update(user!.id, data),
    onSuccess: (updated) => {
      setUser(updated);
      addToast({ type: 'success', message: 'Profile updated' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update profile' });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => usersApi.changePassword(user!.id, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast({ type: 'success', message: 'Password changed' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to change password. Check your current password.' });
    },
  });

  const handleProfileSubmit = () => {
    if (!displayName.trim()) return;
    profileMutation.mutate({
      displayName: displayName.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
    });
  };

  const handlePasswordSubmit = () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) {
      addToast({ type: 'error', message: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    passwordMutation.mutate();
  };

  if (!user) return null;

  const initial = user.displayName.charAt(0).toUpperCase();

  return (
    <div style={pageStyle}>
      <BreadcrumbNav items={[{ label: 'Profile' }]} />

      <div style={contentStyle}>
        {/* Avatar + Info */}
        <div style={headerStyle}>
          <div style={avatarStyle}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} style={avatarImgStyle} />
            ) : (
              <span style={avatarInitialStyle}>{initial}</span>
            )}
          </div>
          <div>
            <h2 style={nameStyle}>{user.displayName}</h2>
            <p style={emailStyle}>{user.email}</p>
            <span style={roleBadgeStyle}>{user.systemRole.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Profile Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Profile Information</h3>

          <div style={fieldGroup}>
            <label style={labelStyle}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Avatar URL</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Member Since</label>
            <input
              type="text"
              value={new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <button
            onClick={handleProfileSubmit}
            disabled={profileMutation.isPending}
            style={primaryBtnStyle}
          >
            {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Password Section */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Change Password</h3>

          <div style={fieldGroup}>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            onClick={handlePasswordSubmit}
            disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            style={{
              ...primaryBtnStyle,
              opacity: (!currentPassword || !newPassword || !confirmPassword) ? 0.5 : 1,
            }}
          >
            {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  padding: '24px',
  height: '100%',
  overflowY: 'auto',
};

const contentStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  padding: '24px',
  backgroundColor: 'var(--color-bg-elevated)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
};

const avatarStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  backgroundColor: 'var(--color-accent)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  overflow: 'hidden',
};

const avatarImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const avatarInitialStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 600,
  color: 'white',
};

const nameStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: 0,
};

const emailStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  margin: '4px 0',
};

const roleBadgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  padding: '2px 8px',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'var(--color-accent-light, rgba(59, 130, 246, 0.15))',
  color: 'var(--color-accent)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const sectionStyle: React.CSSProperties = {
  padding: '20px',
  backgroundColor: 'var(--color-bg-elevated)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: 0,
  paddingBottom: '8px',
  borderBottom: '1px solid var(--color-border)',
};

const fieldGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  outline: 'none',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: '14px',
  fontWeight: 500,
  backgroundColor: 'var(--color-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  alignSelf: 'flex-start',
};
