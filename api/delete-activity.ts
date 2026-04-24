import { createClient } from '@supabase/supabase-js';
type DeleteRequestBody = { activityId?: string; teacherPassword?: string };
type DeletePayload = { success: boolean; deletedSubmissions: number; deletedActivities: number; error?: string };

function fail(res: any, status: number, error: string, deletedSubmissions = 0, deletedActivities = 0) {
  const payload: DeletePayload = { success: false, deletedSubmissions, deletedActivities, error };
  return res.status(status).json(payload);
}

function readBody(body: unknown): DeleteRequestBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as DeleteRequestBody;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as DeleteRequestBody;
  return {};
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasClientSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
        hasClientSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return fail(res, 405, 'Method not allowed. Use POST.');
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return fail(res, 500, 'Missing env vars');
    }

    const { activityId, teacherPassword } = readBody(req.body);

    if (!activityId) {
      return fail(res, 400, 'Missing activityId.');
    }

    const globalTeacherPassword = 'intel123';

    if (!teacherPassword || teacherPassword !== globalTeacherPassword) {
      return fail(res, 401, 'Invalid teacher password.');
    }

    const supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: deletedSubmissionsRows, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('activity_id', activityId)
      .select('id');

    if (submissionError) {
      return fail(res, 500, `Failed deleting submissions: ${submissionError.message}`);
    }

    const { data: deletedActivitiesRows, error: activityError } = await supabaseAdmin
      .from('activities')
      .delete()
      .eq('id', activityId)
      .select('id');

    if (activityError) {
      return fail(res, 500, `Failed deleting activity: ${activityError.message}`, deletedSubmissionsRows?.length ?? 0, 0);
    }

    const deletedActivities = deletedActivitiesRows?.length ?? 0;

    if (!deletedActivities) {
      return fail(res, 404, `Activity ${activityId} not found.`, deletedSubmissionsRows?.length ?? 0, deletedActivities);
    }

    return res.status(200).json({
      success: true,
      deletedSubmissions: deletedSubmissionsRows?.length ?? 0,
      deletedActivities
    });
  } catch (err: any) {
    console.error(err);
    return fail(res, 500, err?.message || 'Unexpected server error');
  }
}
