import { createClient } from '@supabase/supabase-js';
import { GLOBAL_TEACHER_PASSWORD } from '../src/features/auth/constants';

type DeleteRequestBody = { activityId?: string; teacherPassword?: string };

type JsonResponse = {
  success: boolean;
  deletedSubmissions: number;
  deletedActivities: number;
  error?: string;
};

function json(res: any, status: number, payload: JsonResponse) {
  res.status(status).json(payload);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { success: false, deletedSubmissions: 0, deletedActivities: 0, error: 'Method not allowed. Use POST.' });
    }

    const { activityId, teacherPassword } = (req.body ?? {}) as DeleteRequestBody;
    if (!activityId) {
      return json(res, 400, { success: false, deletedSubmissions: 0, deletedActivities: 0, error: 'Missing activityId.' });
    }

    if (!teacherPassword || teacherPassword !== GLOBAL_TEACHER_PASSWORD) {
      return json(res, 401, { success: false, deletedSubmissions: 0, deletedActivities: 0, error: 'Invalid teacher password.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return json(res, 500, {
        success: false,
        deletedSubmissions: 0,
        deletedActivities: 0,
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: deletedSubmissionsRows, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('activity_id', activityId)
      .select('id');

    if (submissionError) {
      return json(res, 500, {
        success: false,
        deletedSubmissions: 0,
        deletedActivities: 0,
        error: `Failed deleting submissions: ${submissionError.message}`
      });
    }

    const { data: deletedActivitiesRows, error: activityError } = await supabaseAdmin
      .from('activities')
      .delete()
      .eq('id', activityId)
      .select('id');

    if (activityError) {
      return json(res, 500, {
        success: false,
        deletedSubmissions: deletedSubmissionsRows?.length ?? 0,
        deletedActivities: 0,
        error: `Failed deleting activity: ${activityError.message}`
      });
    }

    const deletedActivities = deletedActivitiesRows?.length ?? 0;
    if (!deletedActivities) {
      return json(res, 404, {
        success: false,
        deletedSubmissions: deletedSubmissionsRows?.length ?? 0,
        deletedActivities,
        error: `Activity ${activityId} not found.`
      });
    }

    return json(res, 200, {
      success: true,
      deletedSubmissions: deletedSubmissionsRows?.length ?? 0,
      deletedActivities
    });
  } catch (error) {
    const message = (error as Error).message || 'Unknown server error.';
    console.error('[api/delete-activity] Unhandled server error', error);
    return json(res, 500, { success: false, deletedSubmissions: 0, deletedActivities: 0, error: message });
  }
}
