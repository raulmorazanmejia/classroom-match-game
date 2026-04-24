import { createClient } from '@supabase/supabase-js';
type DeleteRequestBody = { activityId?: string; teacherPassword?: string };

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({
        success: false,
        deletedSubmissions: 0,
        deletedActivities: 0,
        error: 'Method not allowed. Use POST.'
      });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    const { activityId, teacherPassword } = (req.body ?? {}) as DeleteRequestBody;

    if (!activityId) {
      return res.status(400).json({
        success: false,
        deletedSubmissions: 0,
        deletedActivities: 0,
        error: 'Missing activityId.'
      });
    }

    const globalTeacherPassword = 'intel123';

    if (!teacherPassword || teacherPassword !== globalTeacherPassword) {
      return res.status(401).json({
        success: false,
        deletedSubmissions: 0,
        deletedActivities: 0,
        error: 'Invalid teacher password.'
      });
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
      return res.status(500).json({
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
      return res.status(500).json({
        success: false,
        deletedSubmissions: deletedSubmissionsRows?.length ?? 0,
        deletedActivities: 0,
        error: `Failed deleting activity: ${activityError.message}`
      });
    }

    const deletedActivities = deletedActivitiesRows?.length ?? 0;

    if (!deletedActivities) {
      return res.status(404).json({
        success: false,
        deletedSubmissions: deletedSubmissionsRows?.length ?? 0,
        deletedActivities,
        error: `Activity ${activityId} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      deletedSubmissions: deletedSubmissionsRows?.length ?? 0,
      deletedActivities
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
