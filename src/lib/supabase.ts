import { createClient } from '@supabase/supabase-js';
import type { Activity, Pair, Submission } from '../types/models';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cpouyxzsnmoiskxhrcut.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7y7O2Q93oG9iRqSlNAudXA_L1gbvzra';
export const GLOBAL_TEACHER_PASSWORD = 'intel123';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function listActivities(): Promise<Activity[]> {
  const { data, error } = await supabase.from('activities').select('id,title,teacher_name,teacher_password,pairs,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function getActivity(activityId: string): Promise<Activity> {
  const { data, error } = await supabase.from('activities').select('id,title,teacher_name,teacher_password,pairs,created_at').eq('id', activityId).single();
  if (error) throw error;
  return data as Activity;
}

export async function createActivity(payload: { title: string; teacherName: string; pairs: Pair[] }): Promise<Activity> {
  const { data, error } = await supabase.from('activities').insert([{ title: payload.title, teacher_name: payload.teacherName, teacher_password: GLOBAL_TEACHER_PASSWORD, pairs: payload.pairs }]).select('id,title,teacher_name,teacher_password,pairs,created_at').single();
  if (error) throw error;
  return data as Activity;
}

export async function deleteActivityAndSubmissions(activityId: string): Promise<void> {
  const { error: submissionErr } = await supabase.from('submissions').delete().eq('activity_id', activityId);
  if (submissionErr) throw submissionErr;
  const { error: activityErr } = await supabase.from('activities').delete().eq('id', activityId);
  if (activityErr) throw activityErr;
}

export async function saveSubmission(payload: Submission): Promise<void> {
  const { error } = await supabase.from('submissions').insert([payload]);
  if (error) throw error;
}

export async function listSubmissions(activityId: string): Promise<Submission[]> {
  const { data, error } = await supabase.from('submissions').select('id,activity_id,student_name,score,total,attempts,duration_seconds,created_at').eq('activity_id', activityId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Submission[];
}
