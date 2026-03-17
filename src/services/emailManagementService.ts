import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

function ensureAdmin() {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);
  return supabaseAdmin;
}

// ============================================================
// Interfaces
// ============================================================

export interface EmailLog {
  id: string;
  raRequestId: string;
  resendEmailId: string | null;
  emailType: string;
  recipientEmail: string;
  subject: string | null;
  status: 'sent' | 'delivered' | 'bounced' | 'failed' | 'complained';
  sentAt: string;
  deliveredAt: string | null;
  bouncedAt: string | null;
  errorMessage: string | null;
  resendResponse: any;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  total_sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  pending: number;
  delivery_rate: number;
  bounce_rate: number;
}

export interface EmailLogWithMemoInfo extends EmailLog {
  debitMemoId: string;
  memoNumber: string;
  pharmacyName: string;
  destination: string;
  labelerName: string;
  totalAskValue: number;
}

// ============================================================
// Email Log Management
// ============================================================

export const listEmailLogs = async (filters: {
  status?: string;
  emailType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: EmailLogWithMemoInfo[]; pagination: any }> => {
  const sb = ensureAdmin();
  
  let query = sb
    .from('email_logs_with_memo_info')
    .select('*')
    .order('sent_at', { ascending: false });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.emailType) {
    query = query.eq('email_type', filters.emailType);
  }
  
  if (filters.dateFrom) {
    query = query.gte('sent_at', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('sent_at', filters.dateTo);
  }
  
  if (filters.search) {
    query = query.or(`memo_number.ilike.%${filters.search}%,pharmacy_name.ilike.%${filters.search}%,recipient_email.ilike.%${filters.search}%`);
  }

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;
  
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  
  if (error) throw new AppError(`Failed to list email logs: ${error.message}`, 400);

  return {
    data: data as EmailLogWithMemoInfo[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  };
};

export const getEmailLog = async (id: string): Promise<EmailLogWithMemoInfo> => {
  const sb = ensureAdmin();
  
  const { data, error } = await sb
    .from('email_logs_with_memo_info')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw new AppError(`Failed to get email log: ${error.message}`, 400);
  if (!data) throw new AppError('Email log not found', 404);
  
  return data as EmailLogWithMemoInfo;
};

// ============================================================
// Email Statistics
// ============================================================

export const getEmailStats = async (
  dateFrom?: string,
  dateTo?: string
): Promise<EmailStats> => {
  const sb = ensureAdmin();
  
  const { data, error } = await sb.rpc('get_email_stats', {
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null
  });
  
  if (error) throw new AppError(`Failed to get email stats: ${error.message}`, 400);
  
  return data as EmailStats;
};

export const getEmailStatsByType = async (
  emailType?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ [key: string]: EmailStats }> => {
  const sb = ensureAdmin();
  
  let query = sb
    .from('email_logs')
    .select('email_type, status, sent_at');

  if (emailType) {
    query = query.eq('email_type', emailType);
  }
  
  if (dateFrom) {
    query = query.gte('sent_at', dateFrom);
  }
  
  if (dateTo) {
    query = query.lte('sent_at', dateTo);
  }

  const { data, error } = await query;
  
  if (error) throw new AppError(`Failed to get email stats by type: ${error.message}`, 400);

  // Group and calculate stats by email type
  const statsByType: { [key: string]: EmailStats } = {};
  
  data?.forEach((log: any) => {
    const type = log.email_type;
    if (!statsByType[type]) {
      statsByType[type] = {
        total_sent: 0,
        delivered: 0,
        bounced: 0,
        failed: 0,
        pending: 0,
        delivery_rate: 0,
        bounce_rate: 0
      };
    }
    
    statsByType[type].total_sent++;
    
    switch (log.status) {
      case 'delivered':
        statsByType[type].delivered++;
        break;
      case 'bounced':
        statsByType[type].bounced++;
        break;
      case 'failed':
        statsByType[type].failed++;
        break;
      case 'sent':
        statsByType[type].pending++;
        break;
    }
  });

  // Calculate rates
  Object.values(statsByType).forEach(stats => {
    if (stats.total_sent > 0) {
      stats.delivery_rate = Math.round((stats.delivered / stats.total_sent) * 100 * 100) / 100;
      stats.bounce_rate = Math.round((stats.bounced / stats.total_sent) * 100 * 100) / 100;
    }
  });

  return statsByType;
};

// ============================================================
// Email Retry and Management
// ============================================================

export const retryFailedEmail = async (emailLogId: string): Promise<{ success: boolean; newEmailId?: string }> => {
  const sb = ensureAdmin();
  
  // Get the original email log
  const emailLog = await getEmailLog(emailLogId);
  
  if (emailLog.status !== 'failed' && emailLog.status !== 'bounced') {
    throw new AppError('Can only retry failed or bounced emails', 400);
  }

  // Get the RA request details to resend
  const { data: raRequest, error: raError } = await sb
    .from('ra_requests')
    .select('*')
    .eq('id', emailLog.raRequestId)
    .single();
    
  if (raError || !raRequest) {
    throw new AppError('Associated RA request not found', 404);
  }

  try {
    // Import the RA service to resend the email
    const { resendRARequest } = await import('./raService');
    
    const result = await resendRARequest(raRequest.debit_memo_id);
    
    return {
      success: true,
      newEmailId: result.request.resend_email_id || undefined
    };
  } catch (error: any) {
    throw new AppError(`Failed to retry email: ${error.message}`, 500);
  }
};

export const markEmailAsResolved = async (emailLogId: string, notes?: string): Promise<void> => {
  const sb = ensureAdmin();
  
  const { error } = await sb
    .from('email_logs')
    .update({
      status: 'resolved',
      error_message: notes ? `Manually resolved: ${notes}` : 'Manually resolved',
      updated_at: new Date().toISOString()
    })
    .eq('id', emailLogId);
    
  if (error) throw new AppError(`Failed to mark email as resolved: ${error.message}`, 400);
};

// ============================================================
// Email Health Monitoring
// ============================================================

export const getEmailHealthReport = async (): Promise<{
  overall: EmailStats;
  byType: { [key: string]: EmailStats };
  recentIssues: EmailLogWithMemoInfo[];
  recommendations: string[];
}> => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get overall stats for last 30 days
  const overall = await getEmailStats(thirtyDaysAgo);
  
  // Get stats by type
  const byType = await getEmailStatsByType(undefined, thirtyDaysAgo);
  
  // Get recent issues (bounced/failed emails in last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentIssuesResult = await listEmailLogs({
    status: 'bounced,failed',
    dateFrom: sevenDaysAgo,
    limit: 10
  });

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (overall.bounce_rate > 5) {
    recommendations.push('High bounce rate detected. Consider reviewing recipient email addresses.');
  }
  
  if (overall.delivery_rate < 95) {
    recommendations.push('Low delivery rate. Check email content and sender reputation.');
  }
  
  if (overall.failed > overall.total_sent * 0.1) {
    recommendations.push('High failure rate. Check email service configuration.');
  }
  
  if (recentIssuesResult.data.length > 5) {
    recommendations.push('Multiple recent email issues. Consider investigating email infrastructure.');
  }

  return {
    overall,
    byType,
    recentIssues: recentIssuesResult.data,
    recommendations
  };
};