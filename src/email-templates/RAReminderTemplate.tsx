import React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Heading,
  Row,
  Column
} from '@react-email/components';

interface RAReminderEmailProps {
  memoNumber: string;
  pharmacyName: string;
  requestCount: number;
  originalDate: string | null;
  daysSinceRequest: number;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function RAReminderEmail({
  memoNumber,
  pharmacyName,
  requestCount,
  originalDate,
  daysSinceRequest,
  contactInfo
}: RAReminderEmailProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUrgencyLevel = () => {
    if (daysSinceRequest >= 30) return 'high';
    if (daysSinceRequest >= 21) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();
  const urgencyColor = urgencyLevel === 'high' ? '#dc2626' : urgencyLevel === 'medium' ? '#d97706' : '#059669';

  return (
    <Html>
      <Head />
      <Preview>REMINDER: RA Request for Debit Memo {memoNumber} - {pharmacyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Return Authorization Reminder</Heading>
            <Text style={subtitle}>Follow-up Request #{requestCount}</Text>
          </Section>

          {/* Urgency Banner */}
          <Section style={{...urgencyBanner, backgroundColor: urgencyColor}}>
            <Text style={urgencyText}>
              {urgencyLevel === 'high' && '🚨 URGENT: '}
              {urgencyLevel === 'medium' && '⚠️ ATTENTION: '}
              {urgencyLevel === 'low' && '📋 REMINDER: '}
              RA request pending for {daysSinceRequest} days
            </Text>
          </Section>

          {/* Memo Details */}
          <Section style={section}>
            <Heading style={h2}>Outstanding RA Request</Heading>
            <Text style={reminderText}>
              We are following up on our Return Authorization request for the following debit memo:
            </Text>
            
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Debit Memo:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={valueHighlight}>{memoNumber}</Text>
              </Column>
            </Row>
            
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Pharmacy:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{pharmacyName}</Text>
              </Column>
            </Row>
            
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Original Request:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{formatDate(originalDate)}</Text>
              </Column>
            </Row>
            
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Days Pending:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={{...value, color: urgencyColor, fontWeight: 'bold'}}>
                  {daysSinceRequest} days
                </Text>
              </Column>
            </Row>
            
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Request Count:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>#{requestCount}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          {/* Action Required */}
          <Section style={section}>
            <Heading style={h2}>Action Required</Heading>
            <Text style={requestText}>
              <strong>We need your Return Authorization (RA) number to proceed with this return shipment.</strong>
            </Text>
            <Text style={requestText}>
              Please reply to this email with:
            </Text>
            <ul style={actionList}>
              <li style={actionItem}>The RA number for debit memo {memoNumber}</li>
              <li style={actionItem}>Any specific shipping instructions</li>
              <li style={actionItem}>Expected processing timeline</li>
            </ul>
            
            {urgencyLevel === 'high' && (
              <Text style={urgentNote}>
                <strong>URGENT:</strong> This request has been pending for over 30 days. 
                Please prioritize this return to avoid delays in our processing workflow.
              </Text>
            )}
            
            {urgencyLevel === 'medium' && (
              <Text style={warningNote}>
                <strong>ATTENTION:</strong> This request has been pending for over 3 weeks. 
                Your prompt response would be greatly appreciated.
              </Text>
            )}
          </Section>

          {/* Status Timeline */}
          <Section style={section}>
            <Heading style={h2}>Request Timeline</Heading>
            <div style={timelineContainer}>
              <div style={timelineItem}>
                <Text style={timelineDate}>{formatDate(originalDate)}</Text>
                <Text style={timelineEvent}>Initial RA request sent</Text>
              </div>
              
              {requestCount > 1 && (
                <div style={timelineItem}>
                  <Text style={timelineDate}>
                    {new Date(Date.now() - (daysSinceRequest - 14) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text style={timelineEvent}>First reminder sent</Text>
                </div>
              )}
              
              <div style={{...timelineItem, ...currentTimelineItem}}>
                <Text style={currentTimelineDate}>
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Text style={currentTimelineEvent}>
                  {requestCount === 2 ? 'Second' : requestCount === 3 ? 'Third' : `${requestCount}th`} reminder sent
                </Text>
              </div>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Contact Information */}
          <Section style={section}>
            <Heading style={h2}>Need Assistance?</Heading>
            {contactInfo?.name && (
              <Text style={contactText}>
                <strong>Contact:</strong> {contactInfo.name}
              </Text>
            )}
            {contactInfo?.email && (
              <Text style={contactText}>
                <strong>Email:</strong> {contactInfo.email}
              </Text>
            )}
            {contactInfo?.phone && (
              <Text style={contactText}>
                <strong>Phone:</strong> {contactInfo.phone}
              </Text>
            )}
            {!contactInfo?.name && !contactInfo?.email && !contactInfo?.phone && (
              <Text style={contactText}>
                Please reply to this email or contact our returns department for assistance.
              </Text>
            )}
            
            <Text style={helpText}>
              If you have any questions about this debit memo or need assistance with the RA process, 
              please don't hesitate to reach out.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated reminder from the First Class Returns system.
            </Text>
            <Text style={footerText}>
              Generated on {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#dc2626',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const subtitle = {
  color: '#fecaca',
  fontSize: '16px',
  margin: '0',
  textAlign: 'center' as const,
};

const urgencyBanner = {
  padding: '12px 24px',
  textAlign: 'center' as const,
};

const urgencyText = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const section = {
  padding: '24px',
};

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const reminderText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const infoRow = {
  marginBottom: '8px',
};

const labelColumn = {
  width: '140px',
  verticalAlign: 'top' as const,
};

const valueColumn = {
  verticalAlign: 'top' as const,
};

const label = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  fontWeight: '500',
};

const value = {
  color: '#1f2937',
  fontSize: '14px',
  margin: '0',
};

const valueHighlight = {
  color: '#dc2626',
  fontSize: '14px',
  margin: '0',
  fontWeight: 'bold',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const requestText = {
  color: '#1f2937',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const actionList = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '12px 0',
  paddingLeft: '20px',
};

const actionItem = {
  margin: '4px 0',
};

const urgentNote = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '16px 0',
  padding: '12px',
};

const warningNote = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fed7aa',
  borderRadius: '6px',
  color: '#d97706',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '16px 0',
  padding: '12px',
};

const timelineContainer = {
  borderLeft: '2px solid #e5e7eb',
  paddingLeft: '16px',
};

const timelineItem = {
  marginBottom: '16px',
  position: 'relative' as const,
};

const currentTimelineItem = {
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  padding: '12px',
  marginLeft: '-16px',
  paddingLeft: '28px',
};

const timelineDate = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0 0 4px',
};

const currentTimelineDate = {
  color: '#dc2626',
  fontSize: '12px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const timelineEvent = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
};

const currentTimelineEvent = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const contactText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 8px',
};

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '16px 0 0',
};

const footer = {
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderTop: '1px solid #e5e7eb',
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 4px',
  textAlign: 'center' as const,
};