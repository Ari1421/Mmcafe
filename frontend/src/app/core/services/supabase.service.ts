import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Thin wrapper around the Supabase JS client.
 *
 * IMPORTANT: only the public anon key is used here (see environment.ts).
 * The service_role key must NEVER be shipped to the browser. Any operation
 * that truly requires elevated privileges (e.g. inviting a user, bulk admin
 * actions) must go through a Supabase Edge Function instead.
 *
 * Every feature service (SalesService, ExpenseService, ...) should inject
 * this service and use `supabaseService.client` rather than creating its
 * own client instance.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
}
