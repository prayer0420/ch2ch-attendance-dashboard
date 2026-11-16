import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorshipJournal } from '../worship-journal';
export function createDataClient(): SupabaseClient;
export function hasDataStore(): boolean;
export function isLocal(): boolean;
export function configuration(): { provider: string; directory?: string };
export function readJournals(): WorshipJournal[];
export function saveJournal(journal: WorshipJournal): Promise<void>;
