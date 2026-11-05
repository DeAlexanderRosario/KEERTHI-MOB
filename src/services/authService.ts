/**
 * Authentication & Session Management Service
 * Manages ERPNext authentication flow, session validation, active roles, and health.
 */

import { httpClient } from './httpClient';
import { ErpError } from './errors';
import type { SessionUser, SessionHealth } from './types';

type SessionListener = (user: SessionUser | null, health: SessionHealth) => void;

class AuthService {
  private currentUser: SessionUser | null = null;
  private health: SessionHealth = 'unauthenticated';
  private listeners: Set<SessionListener> = new Set();
  private initPromise: Promise<SessionUser | null> | null = null;

  constructor() {
    // Remove legacy JavaScript-readable ERP credentials left by earlier app versions.
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('keerthi_erp_sid');
        window.sessionStorage.removeItem('keerthi_erp_csrf');
        window.sessionStorage.removeItem('keerthi_vms_shop_kyc');
        window.localStorage.removeItem('keerthi_vms_shop_kyc');
      }
    } catch {
      // Storage may be disabled by the browser.
    }
  }

  public subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser, this.health);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser, this.health);
    }
  }

  public getUser(): SessionUser | null {
    return this.currentUser;
  }

  public getHealth(): SessionHealth {
    return this.health;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentUser && this.health === 'healthy');
  }

  public hasRole(roleName: string): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.roles.includes('Administrator') || this.currentUser.roles.includes('System Manager')) {
      return true;
    }
    return this.currentUser.roles.includes(roleName);
  }

  public hasAnyRole(roles: string[]): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.roles.includes('Administrator') || this.currentUser.roles.includes('System Manager')) {
      return true;
    }
    return roles.some((r) => this.currentUser!.roles.includes(r));
  }

  private clearSensitiveKycCache(): void {
    try {
      if (typeof window !== 'undefined') {
        for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
          const key = window.sessionStorage.key(index);
          if (key?.startsWith('keerthi_vms_shop_kyc')) {
            window.sessionStorage.removeItem(key);
          }
        }
        // Remove sensitive KYC metadata persisted by older app versions.
        window.localStorage.removeItem('keerthi_vms_shop_kyc');
      }
    } catch {
      // Storage may be disabled by the browser.
    }
  }
  /**
   * Initializes session from server
   */
  public async initialize(): Promise<SessionUser | null> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const session = await httpClient<{
          authenticated: boolean;
          user?: string;
          email?: string;
          fullName?: string;
          roles?: string[];
          company?: string;
          currency?: string;
          fiscalYear?: string;
        }>('/api/erp/auth/session');

        if (session.authenticated && session.user && session.user !== 'Guest') {
          this.currentUser = {
            authenticated: true,
            user: session.user,
            email: session.email || session.user,
            fullName: session.fullName || session.user,
            roles: session.roles || [],
            company: session.company,
            currency: session.currency || 'INR',
            fiscalYear: session.fiscalYear,
          };
          this.health = 'healthy';
        } else {
          this.currentUser = null;
          this.health = 'unauthenticated';
        }
      } catch (err: any) {
        if (err instanceof ErpError && err.code === 'UNAUTHENTICATED') {
          this.currentUser = null;
          this.health = 'expired';
        } else {
          this.health = 'unauthenticated';
        }
      } finally {
        this.notify();
      }

      return this.currentUser;
    })();

    return this.initPromise;
  }

  /**
   * Logs in using real ERPNext username/password
   */
  public async login(usr: string, pwd: string): Promise<SessionUser> {
    try {
      const response = await httpClient<{
        authenticated: boolean;
        user: string;
        email?: string;
        fullName?: string;
        roles?: string[];
        company?: string;
        currency?: string;
        fiscalYear?: string;
      }>('/api/erp/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usr: usr.trim(), pwd }),
      });

      this.clearSensitiveKycCache();
      this.currentUser = {
        authenticated: true,
        user: response.user,
        email: response.email || usr.trim(),
        fullName: response.fullName || response.user,
        roles: response.roles || [],
        company: response.company,
        currency: response.currency || 'INR',
        fiscalYear: response.fiscalYear,
      };
      this.health = 'healthy';
      this.notify();
      return this.currentUser;
    } catch (err) {
      this.currentUser = null;
      this.health = 'unauthenticated';
      this.notify();
      throw err;
    }
  }

  /**
   * Clears session in ERPNext and locally
   */
  public async logout(): Promise<void> {
    try {
      await httpClient('/api/erp/auth/logout', { method: 'POST' });
    } catch (err) {
      // Continue cleanup on failure
    } finally {
      this.clearSensitiveKycCache();
      this.currentUser = null;
      this.health = 'unauthenticated';
      this.initPromise = null;
      this.notify();
    }
  }
}

export const authService = new AuthService();
