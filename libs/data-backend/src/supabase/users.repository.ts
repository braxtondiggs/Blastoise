import { getSupabaseClient } from './supabase.client';
import { User, UserPreferences, UpdateUserPreferencesDto } from '@blastoise/shared';

export class UsersRepository {
  private supabase = getSupabaseClient();

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find user: ${error.message}`);
    }

    if (!data) return null;

    // Map from database structure to User model
    return {
      id,
      email: '', // Will be fetched from auth
      created_at: data.created_at,
      updated_at: data.updated_at,
      preferences: data as UserPreferences,
    } as User;
  }

  async updatePreferences(
    userId: string,
    preferences: UpdateUserPreferencesDto
  ): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw new Error(`Failed to update preferences: ${error.message}`);
    return data as UserPreferences;
  }
}
