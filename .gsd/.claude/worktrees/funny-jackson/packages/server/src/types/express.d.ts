import { SystemRole } from '@pm/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        sub: string;
        email: string;
        systemRole: SystemRole;
        iat: number;
        exp: number;
      };
      projectPermission?: {
        id: string;
        projectId: string;
        userId: string;
        role: string;
        capabilities: Record<string, boolean>;
        customRole?: {
          id: string;
          name: string;
          capabilities: Record<string, boolean>;
        } | null;
      };
      projectCapabilities?: Record<string, boolean>;
    }
  }
}

export {};
