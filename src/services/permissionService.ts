/**
 * Role & Permission Evaluation Service
 * Evaluates real ERPNext roles and permissions to govern UI visibility.
 * Note: Server enforcement is always authoritative.
 */

import { authService } from './authService';
import type { DocTypeMeta } from './types';

class PermissionService {
  /**
   * Checks whether the current user has read access to the specified DocType
   */
  public canRead(meta?: DocTypeMeta | null): boolean {
    const user = authService.getUser();
    if (!user) return false;
    if (this.isSuperUser(user.roles)) return true;
    if (!meta || !meta.permissions) return true; // Default to server authorization check

    return meta.permissions.some(
      (p) => user.roles.includes(p.role) && Boolean(p.read)
    );
  }

  /**
   * Checks whether the current user can create new records for this DocType
   */
  public canCreate(meta?: DocTypeMeta | null): boolean {
    const user = authService.getUser();
    if (!user) return false;
    if (this.isSuperUser(user.roles)) return true;
    if (!meta || !meta.permissions) return true;

    return meta.permissions.some(
      (p) => user.roles.includes(p.role) && Boolean(p.create)
    );
  }

  /**
   * Checks whether the current user can write/edit this DocType
   */
  public canWrite(meta?: DocTypeMeta | null): boolean {
    const user = authService.getUser();
    if (!user) return false;
    if (this.isSuperUser(user.roles)) return true;
    if (!meta || !meta.permissions) return true;

    return meta.permissions.some(
      (p) => user.roles.includes(p.role) && Boolean(p.write)
    );
  }

  /**
   * Checks whether the current user can submit this DocType
   */
  public canSubmit(meta?: DocTypeMeta | null): boolean {
    const user = authService.getUser();
    if (!user) return false;
    if (!meta?.is_submittable) return false;
    if (this.isSuperUser(user.roles)) return true;
    if (!meta.permissions) return true;

    return meta.permissions.some(
      (p) => user.roles.includes(p.role) && Boolean(p.submit)
    );
  }

  /**
   * Checks whether the current user can cancel this DocType
   */
  public canCancel(meta?: DocTypeMeta | null): boolean {
    const user = authService.getUser();
    if (!user) return false;
    if (!meta?.is_submittable) return false;
    if (this.isSuperUser(user.roles)) return true;
    if (!meta.permissions) return true;

    return meta.permissions.some(
      (p) => user.roles.includes(p.role) && Boolean(p.cancel)
    );
  }

  /**
   * Checks whether the current user can delete records of this DocType
   */
  public canDelete(meta?: DocTypeMeta | null): boolean {
    const user = authService.getUser();
    if (!user) return false;
    if (this.isSuperUser(user.roles)) return true;
    if (!meta || !meta.permissions) return false;

    return meta.permissions.some(
      (p) => user.roles.includes(p.role) && Boolean(p.delete)
    );
  }

  private isSuperUser(roles: string[]): boolean {
    return roles.includes('Administrator') || roles.includes('System Manager');
  }
}

export const permissionService = new PermissionService();
