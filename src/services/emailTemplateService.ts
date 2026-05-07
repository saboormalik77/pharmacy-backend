import { render } from '@react-email/render';
import RARequestTemplate from '../email-templates/RARequestTemplate';
import RAReminderTemplate from '../email-templates/RAReminderTemplate';
import { RAEmailTemplate, RAReminderTemplate as RAReminderTemplateType } from './raService';

/**
 * Email Template Service
 * 
 * Handles rendering React Email templates to HTML strings
 * for use in the email sending system.
 */

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface RARequestEmailData extends RAEmailTemplate {
  contactInfo?: ContactInfo;
}

export interface RAReminderEmailData extends RAReminderTemplateType {
  daysSinceRequest: number;
  contactInfo?: ContactInfo;
}

/**
 * Render RA Request email template to HTML
 */
export const renderRARequestEmail = async (data: RARequestEmailData): Promise<string> => {
  try {
    const html = await render(RARequestTemplate({
      memoNumber: data.memoNumber,
      pharmacyName: data.pharmacyName,
      destination: data.destination,
      labelerName: data.labelerName,
      totalItems: data.totalItems,
      totalAskValue: data.totalAskValue,
      items: data.items || [],
      contactInfo: data.contactInfo
    }));
    
    return html;
  } catch (error: any) {
    console.error('Error rendering RA request email template:', error);
    throw new Error(`Failed to render RA request email: ${error.message}`);
  }
};

/**
 * Render RA Reminder email template to HTML
 */
export const renderRAReminderEmail = async (data: RAReminderEmailData): Promise<string> => {
  try {
    const html = await render(RAReminderTemplate({
      memoNumber: data.memoNumber,
      pharmacyName: data.pharmacyName,
      requestCount: data.requestCount,
      originalDate: data.originalDate,
      daysSinceRequest: data.daysSinceRequest,
      contactInfo: data.contactInfo
    }));
    
    return html;
  } catch (error: any) {
    console.error('Error rendering RA reminder email template:', error);
    throw new Error(`Failed to render RA reminder email: ${error.message}`);
  }
};

/**
 * Generate enhanced RA request email with React template
 */
export const generateEnhancedRARequestEmail = async (
  baseTemplate: RAEmailTemplate,
  contactInfo?: ContactInfo
): Promise<{ subject: string; html: string }> => {
  const enhancedData: RARequestEmailData = {
    ...baseTemplate,
    contactInfo
  };
  
  const html = await renderRARequestEmail(enhancedData);
  
  // Generate subject line
  const subject = `RA Request: Debit Memo ${baseTemplate.memoNumber} - ${baseTemplate.pharmacyName}`;
  
  return { subject, html };
};

/**
 * Generate enhanced RA reminder email with React template
 */
export const generateEnhancedRAReminderEmail = async (
  baseTemplate: RAReminderTemplateType,
  daysSinceRequest: number,
  contactInfo?: ContactInfo
): Promise<{ subject: string; html: string }> => {
  const enhancedData: RAReminderEmailData = {
    ...baseTemplate,
    daysSinceRequest,
    contactInfo
  };
  
  const html = await renderRAReminderEmail(enhancedData);
  
  // Generate subject line with urgency indicator
  let urgencyPrefix = '';
  if (daysSinceRequest >= 30) {
    urgencyPrefix = 'URGENT - ';
  } else if (daysSinceRequest >= 21) {
    urgencyPrefix = 'REMINDER - ';
  }
  
  const subject = `${urgencyPrefix}RA Request Follow-up #${baseTemplate.requestCount}: ${baseTemplate.memoNumber} - ${baseTemplate.pharmacyName}`;
  
  return { subject, html };
};

/**
 * Get default contact information
 * This should be configured based on the client's requirements
 */
export const getDefaultContactInfo = (): ContactInfo => {
  return {
    name: process.env.CONTACT_NAME || 'Returns Department',
    email: process.env.CONTACT_EMAIL || 'returns@fcr-system.com',
    phone: process.env.CONTACT_PHONE || undefined
  };
};

/**
 * Validate email template data
 */
export const validateEmailTemplateData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.memoNumber) {
    errors.push('Memo number is required');
  }
  
  if (!data.pharmacyName) {
    errors.push('Pharmacy name is required');
  }
  
  if (!data.to) {
    errors.push('Recipient email is required');
  }
  
  // Validate email format
  if (data.to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.to)) {
    errors.push('Invalid recipient email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};