import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '../api/permissions.api';
import { useAuthStore } from '../stores/auth.store';
import { ROLE_CAPABILITIES } from '@pm/shared';
import type { ProjectRole } from '@pm/shared';

export function useProjectPermission(projectId: string | null) {
  const user = useAuthStore((s) => s.user);

  const { data: permissions } = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => permissionsApi.list(projectId!),
    enabled: !!projectId && !!user,
  });

  const myPermission = permissions?.find((p) => p.userId === user?.id);
  const myRole = myPermission?.role as ProjectRole | undefined;

  const hasCapability = (capability: string): boolean => {
    if (!myRole) return false;
    if (myRole === 'OWNER') return true;

    const roleCaps = ROLE_CAPABILITIES[myRole];
    if (roleCaps && roleCaps[capability] !== undefined) {
      return roleCaps[capability];
    }

    if (myRole === 'CUSTOM' && myPermission?.capabilities) {
      return myPermission.capabilities[capability] === true;
    }

    return false;
  };

  const isOwner = myRole === 'OWNER';
  const isEditor = myRole === 'EDITOR' || isOwner;
  const isViewer = !!myRole;

  return { myRole, myPermission, hasCapability, isOwner, isEditor, isViewer };
}
