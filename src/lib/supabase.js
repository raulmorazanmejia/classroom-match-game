import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cpouyxzsnmoiskxhrcut.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7y7O2Q93oG9iRqSlNAudXA_L1gbvzra';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function listActivities() {
  const { data, error } = await supabase.from('activities').select('id,title,created_at,pairs').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getActivity(activityId) {
  const { data, error } = await supabase.from('activities').select('id,title,pairs').eq('id', activityId).single();
  if (error) throw error;
  return data;
}

export async function deleteActivityAndSubmissions(activityId) {
  const { error: submissionErr } = await supabase.from('submissions').delete().eq('activity_id', activityId);
  if (submissionErr) throw submissionErr;
  const { error: activityErr } = await supabase.from('activities').delete().eq('id', activityId);
  if (activityErr) throw activityErr;
}

export async function saveSubmission(payload) {
  const { error } = await supabase.from('submissions').insert([payload]);
  if (error) throw error;
}
