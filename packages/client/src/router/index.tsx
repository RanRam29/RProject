import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Retry wrapper for lazy imports — handles stale chunks after deploys.
 * When Vercel deploys new code, old chunk filenames become 404s.
 * This retries the import and reloads the page on final failure.
 */
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType }>, name: string) {
  return lazy(() =>
    importFn().catch((err) => {
      console.warn(`[lazyWithRetry] First import failed for ${name}:`, err);
      // First retry after a short delay
      return new Promise<{ default: React.ComponentType }>((resolve) => {
        setTimeout(() => {
          resolve(
            importFn().catch(async (finalErr) => {
              console.error(`[lazyWithRetry] Final import failed for ${name}:`, finalErr);
              // Final failure — unregister SW to dump the stale index.html cache, then reload.
              if ('serviceWorker' in navigator) {
                console.log(`[lazyWithRetry] Unregistering service workers...`);
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                  await registration.unregister();
                }
              }
              console.log(`[lazyWithRetry] Triggering window.location.reload() for ${name}`);
              window.location.reload();
              return { default: () => null } as { default: React.ComponentType };
            })
          );
        }, 1000);
      });
    })
  );
}

const DashboardPage = lazyWithRetry(() => import('../pages/DashboardPage'), 'DashboardPage');
const ProjectPage = lazyWithRetry(() => import('../pages/ProjectPage'), 'ProjectPage');
const TemplatesPage = lazyWithRetry(() => import('../pages/TemplatesPage'), 'TemplatesPage');
const ArchivePage = lazyWithRetry(() => import('../pages/ArchivePage'), 'ArchivePage');
const AdminPage = lazyWithRetry(() => import('../pages/AdminPage'), 'AdminPage');
const ProfilePage = lazyWithRetry(() => import('../pages/ProfilePage'), 'ProfilePage');
const SettingsPage = lazyWithRetry(() => import('../pages/SettingsPage'), 'SettingsPage');

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '300px',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

export function AppRouter() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects/:projectId" element={<ProjectPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
