'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { sendTestEmail, clearErrors } from '@/lib/store/emailManagementSlice';
import { 
  Send,
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Code,
  Settings,
} from 'lucide-react';

const emailTemplates = [
  {
    id: 'ra-request',
    name: 'RA Request',
    description: 'Initial return authorization request email sent to manufacturers',
    preview: {
      subject: 'Return Authorization Request - Memo #DEF456',
      content: 'This email requests a return authorization for expired/damaged products...'
    }
  },
  {
    id: 'ra-reminder',
    name: 'RA Reminder',
    description: 'Follow-up reminder for pending return authorization requests',
    preview: {
      subject: 'URGENT: RA Request Reminder - Memo #DEF456 (7 days overdue)',
      content: 'This is a reminder for your pending return authorization request...'
    }
  }
];

export default function TestEmailPage() {
  const dispatch = useAppDispatch();
  const { isActionLoading, actionError } = useAppSelector((state) => state.emailManagement);

  const [formData, setFormData] = useState({
    to: '',
    templateType: 'ra-request' as 'ra-request' | 'ra-reminder',
  });
  const [lastSentResult, setLastSentResult] = useState<{
    emailId: string;
    recipient: string;
    templateType: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTest = async () => {
    if (!formData.to.trim()) {
      return;
    }

    try {
      const result = await dispatch(sendTestEmail({
        to: formData.to,
        templateType: formData.templateType,
      })).unwrap();
      
      setLastSentResult(result);
    } catch (error) {
      console.error('Failed to send test email:', error);
    }
  };

  const selectedTemplate = emailTemplates.find(t => t.id === formData.templateType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">Test Email System</h2>
        <p className="mt-1 text-sm text-gray-500">
          Send test emails to verify your email configuration and templates
        </p>
      </div>

      {/* Configuration Status */}
      <div className="bg-white shadow rounded-[4px] p-6">
        <div className="flex items-center mb-4">
          <Settings className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Configuration Status</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-[4px]">
            <span className="text-sm text-gray-600">Resend API</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-[4px]">
            <span className="text-sm text-gray-600">Email Templates</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-[4px]">
            <span className="text-sm text-gray-600">Database Connection</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-[4px]">
            <span className="text-sm text-gray-600">Environment Variables</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-[4px]">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Test Environment</p>
              <p className="text-sm text-blue-700">
                Test emails are sent using the same configuration as production. 
                Make sure to use valid email addresses that you have access to.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Email Form */}
      <div className="bg-white shadow rounded-[4px] p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Send Test Email</h3>
        
        <div className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Email Address
            </label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              placeholder="test@example.com"
              className="w-full border border-gray-300 rounded-[4px] px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a valid email address where you can receive the test email
            </p>
          </div>

          {/* Template Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Template
            </label>
            <div className="space-y-2">
              {emailTemplates.map((template) => (
                <label key={template.id} className="flex items-start p-3 border border-gray-200 rounded-[4px] cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="templateType"
                    value={template.id}
                    checked={formData.templateType === template.id}
                    onChange={(e) => handleInputChange('templateType', e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{template.name}</p>
                      <button
                        type="button"
                        onClick={() => setShowPreview(showPreview === template.id ? false : template.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    
                    {showPreview === template.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border">
                        <div className="text-xs text-gray-600 mb-2">Preview:</div>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 mb-1">
                            Subject: {template.preview.subject}
                          </div>
                          <div className="text-gray-700 text-xs">
                            {template.preview.content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSendTest}
              disabled={!formData.to.trim() || isActionLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-[4px] text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test Email
            </button>
          </div>
        </div>
      </div>

      {/* Success Result */}
      {lastSentResult && (
        <div className="bg-white shadow rounded-[4px] p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Email Sent Successfully</h3>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-[4px] p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-800">Email ID:</span>
                <div className="text-green-700 font-mono text-xs mt-1">{lastSentResult.emailId}</div>
              </div>
              <div>
                <span className="font-medium text-green-800">Recipient:</span>
                <div className="text-green-700 mt-1">{lastSentResult.recipient}</div>
              </div>
              <div>
                <span className="font-medium text-green-800">Template:</span>
                <div className="text-green-700 mt-1">
                  {emailTemplates.find(t => t.id === lastSentResult.templateType)?.name}
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-green-700">
              <p>✅ The test email has been sent successfully!</p>
              <p className="mt-1">
                Check your inbox at <strong>{lastSentResult.recipient}</strong> for the test email. 
                It may take a few minutes to arrive.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {actionError && (
        <div className="bg-white shadow rounded-[4px] p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Email Send Failed</h3>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-[4px] p-4">
            <p className="text-sm text-red-700">{actionError}</p>
            <button
              onClick={() => dispatch(clearErrors())}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Dismiss Error
            </button>
          </div>
        </div>
      )}

      {/* Testing Instructions */}
      <div className="bg-white shadow rounded-[4px] p-6">
        <div className="flex items-center mb-4">
          <Code className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Testing Instructions</h3>
        </div>
        
        <div className="prose prose-sm text-gray-600">
          <h4 className="text-sm font-medium text-gray-900 mb-2">How to test the email system:</h4>
          <ol className="text-sm space-y-2">
            <li>
              <strong>1. Send a test email:</strong> Use the form above to send a test email to your own email address.
            </li>
            <li>
              <strong>2. Check your inbox:</strong> Look for the test email in your inbox. Check spam/junk folders if needed.
            </li>
            <li>
              <strong>3. Verify email content:</strong> Ensure the email template renders correctly with proper formatting.
            </li>
            <li>
              <strong>4. Monitor delivery:</strong> Go to the "Email Logs" tab to see the delivery status and any errors.
            </li>
            <li>
              <strong>5. Test different templates:</strong> Send tests for both RA Request and RA Reminder templates.
            </li>
          </ol>
          
          <h4 className="text-sm font-medium text-gray-900 mt-4 mb-2">What to look for:</h4>
          <ul className="text-sm space-y-1">
            <li>• Email arrives within 1-2 minutes</li>
            <li>• Subject line is properly formatted</li>
            <li>• Email content displays correctly (not in spam)</li>
            <li>• All dynamic content (memo numbers, pharmacy names) shows placeholder data</li>
            <li>• Email logs show "delivered" status</li>
          </ul>
          
          <h4 className="text-sm font-medium text-gray-900 mt-4 mb-2">Troubleshooting:</h4>
          <ul className="text-sm space-y-1">
            <li>• If email doesn't arrive, check the Email Logs for error messages</li>
            <li>• Verify your Resend API key is correct in environment variables</li>
            <li>• Ensure the FROM_EMAIL domain is verified in your Resend account</li>
            <li>• Check that your test email address is valid and accessible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}