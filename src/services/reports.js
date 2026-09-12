import api from '../api';

/* Reporting content, and the moderator queue it lands in.

   The Report button used to be decoration — it opened nothing and sent
   nothing. A report is now a row a moderator sees next to the AI-flagged
   recipes. */

export const REPORT_TARGETS = ['recipe', 'forum_post', 'forum_comment'];

/* The reason list comes from the backend: those ids are what moderators filter
   the queue by, so there can only be one copy of them. */
export async function getReportReasons(targetType = '') {
  const { data } = await api.get('/reports/reasons', {
    params: { target_type: targetType },
  });
  return data.reasons || [];
}

export async function sendReport({ targetType, targetId, reason, details = '' }) {
  const { data } = await api.post('/reports', {
    target_type: targetType,
    target_id: targetId,
    reason,
    details,
  });
  return data; // { ok, already_reported }
}

/* What this account has already reported, as "type:id" keys — so the button
   can say "Reported" instead of looking like it did nothing. */
export async function getMyReports() {
  const { data } = await api.get('/reports/mine');
  return new Set(data.reported || []);
}

// ---------- moderator side ----------

export async function getReportQueue(status = 'open') {
  const { data } = await api.get('/admin/reports', { params: { status } });
  return data;
}

export async function actOnReport(id, action) {
  const { data } = await api.post(`/admin/reports/${id}`, { action });
  return data;
}
