import { createClient } from '@supabase/supabase-js';
import { GLOBAL_TEACHER_PASSWORD } from '../features/auth/constants';
import type { Activity, Pair, Submission } from '../types/models';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cpouyxzsnmoiskxhrcut.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7y7O2Q93oG9iRqSlNAudXA_L1gbvzra';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function withSafeTitle(activity: Partial<Activity>): Activity {
  const trimmed = (activity.title ?? '').trim();
  const fallbackFromPair = activity.pairs?.[0]?.left?.trim();
  return {
    ...(activity as Activity),
    title: trimmed || fallbackFromPair || 'Untitled Activity'
  };
}

export async function listActivities(): Promise<Activity[]> {
  const { data, error } = await supabase.from('activities').select('id,title,teacher_name,teacher_password,pairs,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Activity[]).map(withSafeTitle);
}

export async function getActivity(activityId: string): Promise<Activity> {
  const { data, error } = await supabase.from('activities').select('id,title,teacher_name,teacher_password,pairs,created_at').eq('id', activityId).single();
  if (error) throw error;
  return withSafeTitle(data as Activity);
}

export async function createActivity(payload: { title: string; teacherName: string; pairs: Pair[] }): Promise<Activity> {
  const safeTitle = payload.title.trim();
  if (!safeTitle) throw new Error('Please enter an activity title.');
  const { data, error } = await supabase.from('activities').insert([{ title: safeTitle, teacher_name: payload.teacherName, teacher_password: GLOBAL_TEACHER_PASSWORD, pairs: payload.pairs }]).select('id,title,teacher_name,teacher_password,pairs,created_at').single();
  if (error) throw error;
  return withSafeTitle(data as Activity);
}

export type DeleteActivityResponse = {
  success: boolean;
  deletedSubmissions: number;
  deletedActivities: number;
  error?: string;
};

export async function deleteActivityAndSubmissions(activityId: string, teacherPassword: string): Promise<DeleteActivityResponse> {
  if (!activityId) throw new Error('Missing activity id for delete.');
  if (!teacherPassword) throw new Error('Missing teacher password for secure delete.');

  const response = await fetch('/api/delete-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId, teacherPassword })
  });

  const rawBody = await response.text();
  let payload: DeleteActivityResponse | null = null;
  try {
    payload = JSON.parse(rawBody) as DeleteActivityResponse;
  } catch {
    payload = null;
  }

  if (!payload) {
    const nonJsonMessage = rawBody?.trim() || `Non-JSON response (HTTP ${response.status})`;
    throw new Error(nonJsonMessage);
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || `Delete failed for ${activityId}.`);
  }

  return payload;
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
