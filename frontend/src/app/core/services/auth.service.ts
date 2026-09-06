import { Injectable, computed, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile, mapProfileRow } from '../models/profile.model';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ---- Signals (single source of truth for auth state) ----
  private readonly _session = signal<Session | null>(null);
  private readonly _profile = signal<Profile | null>(null);
  private readonly _initializing = signal<boolean>(true);

  readonly session = this._session.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly initializing = this._initializing.asReadonly();

  readonly isAuthenticated = computed(() => !!this._session());
  readonly isAdmin = computed(() => this._profile()?.role === 'admin');
  readonly currentUserName = computed(() => this._profile()?.fullName ?? '');

  constructor(private readonly supabase: SupabaseService) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    this._session.set(data.session);
    if (data.session) {
      await this.loadProfile(data.session.user.id);
    }
    this._initializing.set(false);

    this.supabase.client.auth.onAuthStateChange(async (_event, session) => {
      this._session.set(session);
      if (session) {
        await this.loadProfile(session.user.id);
      } else {
        this._profile.set(null);
      }
    });
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      this._profile.set(mapProfileRow(data));
    }
  }

  async login(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: this.toFriendlyMessage(error.message) };
    }
    return { error: null };
  }

  async logout(): Promise<void> {
    try {
      // Ask Supabase to invalidate the refresh token server-side, but don't
      // let a network hiccup (or an already-expired session) block the
      // user from being signed out locally — see catch below.
      await this.supabase.client.auth.signOut();
    } catch (err) {
      console.error('signOut() request failed; clearing local session anyway.', err);
    } finally {
      this._session.set(null);
      this._profile.set(null);
    }
  }

  async sendPasswordReset(email: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) {
      return { error: this.toFriendlyMessage(error.message) };
    }
    return { error: null };
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: this.toFriendlyMessage(error.message) };
    }
    return { error: null };
  }

  /** Central place to keep Supabase's raw auth errors out of the UI. */
  private toFriendlyMessage(raw: string): string {
    if (raw.toLowerCase().includes('invalid login credentials')) {
      return 'Incorrect email or password.';
    }
    if (raw.toLowerCase().includes('email not confirmed')) {
      return 'Please confirm your email before logging in.';
    }
    return 'Something went wrong. Please try again.';
  }

  hasPermission(perm: keyof Profile): boolean {
    const profile = this._profile();
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    const value = profile[perm];
    return typeof value === 'boolean' ? value : false;
  }
}
