/**
 * ImportHistory Repository (T014)
 * Handles CRUD operations for import_history table
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ImportHistory,
  CreateImportHistoryDto,
  UpdateImportHistoryDto,
} from '@blastoise/shared';

export class ImportHistoryRepository {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env['SUPABASE_URL'] || '';
    const supabaseKey = process.env['SUPABASE_SERVICE_KEY'] || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a new import history record
   */
  async create(dto: CreateImportHistoryDto): Promise<ImportHistory> {
    const { data, error } = await this.supabase
      .from('import_history')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create import history: ${error.message}`);
    }

    return data as ImportHistory;
  }

  /**
   * Update an existing import history record (e.g., job completion)
   */
  async update(dto: UpdateImportHistoryDto): Promise<ImportHistory> {
    const { id, ...updateData } = dto;

    const { data, error } = await this.supabase
      .from('import_history')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update import history: ${error.message}`);
    }

    return data as ImportHistory;
  }

  /**
   * Get import history by user ID (T081)
   * Returns list ordered by imported_at DESC (most recent first)
   */
  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<ImportHistory[]> {
    const { data, error } = await this.supabase
      .from('import_history')
      .select('*')
      .eq('user_id', userId)
      .order('imported_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch import history: ${error.message}`);
    }

    return (data as ImportHistory[]) || [];
  }

  /**
   * Get import history by job ID
   */
  async findByJobId(jobId: string): Promise<ImportHistory | null> {
    const { data, error } = await this.supabase
      .from('import_history')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch import history: ${error.message}`);
    }

    return data as ImportHistory;
  }

  /**
   * Get import history by ID
   */
  async findById(id: string): Promise<ImportHistory | null> {
    const { data, error } = await this.supabase
      .from('import_history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch import history: ${error.message}`);
    }

    return data as ImportHistory;
  }

  /**
   * Count total imports for a user
   */
  async countByUserId(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('import_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to count import history: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get recent imports (last 24 hours) for rate limiting
   */
  async countRecentImports(userId: string, hours = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { count, error } = await this.supabase
      .from('import_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('imported_at', since);

    if (error) {
      throw new Error(
        `Failed to count recent imports: ${error.message}`
      );
    }

    return count || 0;
  }
}
