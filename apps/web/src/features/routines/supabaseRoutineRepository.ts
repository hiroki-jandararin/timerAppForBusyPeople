import { getSupabaseClient } from '../../lib/supabaseClient';
import type { RoutineRepository } from '@timeapp/core';
import type { Routine, RoutineItem } from '@timeapp/core';

type RoutineRow = {
  id: string;
  user_id: string;
  name: string;
  target_duration_sec: number | null;
  items: RoutineItem[];
  created_at: string;
  updated_at: string;
};

type RoutineQueryResult<T = unknown> = { data: T; error: { message: string } | null };

type RoutineQuery = PromiseLike<RoutineQueryResult> & {
  select: (columns: string) => RoutineQuery;
  eq: (column: string, value: string) => RoutineQuery;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => PromiseLike<RoutineQueryResult<RoutineRow[]>>;
  limit: (count: number) => RoutineQuery;
  maybeSingle: () => Promise<{ data: RoutineRow | null; error: { message: string } | null }>;
  upsert: (row: RoutineRow) => Promise<{ error: { message: string } | null }>;
  delete: () => RoutineQuery;
};

export type SupabaseRoutineClient = {
  from: (table: 'routines') => RoutineQuery;
};

const SELECT_COLUMNS = 'id,user_id,name,target_duration_sec,items,created_at,updated_at';

export class SupabaseRoutineRepository implements RoutineRepository {
  constructor(
    private readonly userId: string,
    private readonly client: SupabaseRoutineClient = getSupabaseClient() as unknown as SupabaseRoutineClient,
  ) {}

  async findAll(): Promise<Routine[]> {
    const { data, error } = await this.client
      .from('routines')
      .select(SELECT_COLUMNS)
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(toRoutine);
  }

  async findById(id: string): Promise<Routine | null> {
    const { data, error } = await this.client
      .from('routines')
      .select(SELECT_COLUMNS)
      .eq('id', id)
      .eq('user_id', this.userId)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toRoutine(data) : null;
  }

  async save(routine: Routine): Promise<void> {
    const { error } = await this.client.from('routines').upsert(toRow(routine, this.userId));
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) throw new Error(error.message);
  }
}

function toRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    targetDurationSec: row.target_duration_sec,
    items: row.items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(routine: Routine, userId: string): RoutineRow {
  return {
    id: routine.id,
    user_id: userId,
    name: routine.name,
    target_duration_sec: routine.targetDurationSec ?? null,
    items: routine.items,
    created_at: routine.createdAt,
    updated_at: routine.updatedAt,
  };
}
