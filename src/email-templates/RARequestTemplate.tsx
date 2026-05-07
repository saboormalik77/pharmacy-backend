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

interface RARequestEmailProps {
  memoNumber: string;
  pharmacyName: string;
  destination: string | null;
  labelerName: string | null;
  totalItems: number;
  totalAskValue: number;
  items?: Array<{
    ndc: string;
    productName: string;
    quantity: number;
    askPrice: number;
  }>;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function RARequestEmail({
  memoNumber,
  pharmacyName,
  destination,
  labelerName,
  totalItems,
  totalAskValue,
  items = [],
  contactInfo
}: RARequestEmailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Html>
      <Head />
      <Preview>RA Request for Debit Memo {memoNumber} - {pharmacyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Return Authorization Request</Heading>
            <Text style={subtitle}>Debit Memo: {memoNumber}</Text>
          </Section>

          {/* Memo Details */}
          <Section style={section}>
            <Heading style={h2}>Memo Information</Heading>
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Debit Memo:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{memoNumber}</Text>
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
            
            {destination && (
              <Row style={infoRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Destination:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>{destination}</Text>
                </Column>
              </Row>
            )}
            
            {labelerName && (
              <Row style={infoRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Manufacturer:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>{labelerName}</Text>
                </Column>
              </Row>
            )}
            
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Total Items:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{totalItems.toLocaleString()}</Text>
              </Column>
            </Row>
            
            <Row style={infoRow}>
              <Column style={labelColumn}>
                <Text style={label}>Total Ask Value:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={valueHighlight}>{formatCurrency(totalAskValue)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          {/* Items List */}
          {items.length > 0 && (
            <Section style={section}>
              <Heading style={h2}>Items for Return</Heading>
              <Text style={itemsNote}>
                The following items are included in this return request:
              </Text>
              
              {items.slice(0, 10).map((item, index) => (
                <div key={index} style={itemContainer}>
                  <Row style={itemRow}>
                    <Column style={itemLabelColumn}>
                      <Text style={itemLabel}>NDC:</Text>
                    </Column>
                    <Column style={itemValueColumn}>
                      <Text style={itemValue}>{item.ndc}</Text>
                    </Column>
                  </Row>
                  
                  <Row style={itemRow}>
                    <Column style={itemLabelColumn}>
                      <Text style={itemLabel}>Product:</Text>
                    </Column>
                    <Column style={itemValueColumn}>
                      <Text style={itemValue}>{item.productName}</Text>
                    </Column>
                  </Row>
                  
                  <Row style={itemRow}>
                    <Column style={itemLabelColumn}>
                      <Text style={itemLabel}>Quantity:</Text>
                    </Column>
                    <Column style={itemValueColumn}>
                      <Text style={itemValue}>{item.quantity.toLocaleString()}</Text>
                    </Column>
                  </Row>
                  
                  <Row style={itemRow}>
                    <Column style={itemLabelColumn}>
                      <Text style={itemLabel}>Ask Price:</Text>
                    </Column>
                    <Column style={itemValueColumn}>
                      <Text style={itemValue}>{formatCurrency(item.askPrice)}</Text>
                    </Column>
                  </Row>
                  
                  {index < Math.min(items.length - 1, 9) && <Hr style={itemSeparator} />}
                </div>
              ))}
              
              {items.length > 10 && (
                <Text style={moreItemsNote}>
                  ... and {items.length - 10} more items. Please see attached debit memo for complete details.
                </Text>
              )}
            </Section>
          )}

          <Hr style={hr} />

          {/* Request Action */}
          <Section style={section}>
            <Heading style={h2}>Action Required</Heading>
            <Text style={requestText}>
              Please provide a Return Authorization (RA) number for this debit memo to proceed with the return shipment.
            </Text>
            <Text style={requestText}>
              Reply to this email with the RA number and any additional instructions.
            </Text>
          </Section>

          {/* Contact Information */}
          <Section style={section}>
            <Heading style={h2}>Contact Information</Heading>
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
                Please reply to this email for any questions or clarifications.
              </Text>
            )}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated request from the First Class Returns system.
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
  backgroundColor: '#1f2937',
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
  color: '#d1d5db',
  fontSize: '16px',
  margin: '0',
  textAlign: 'center' as const,
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
  color: '#059669',
  fontSize: '14px',
  margin: '0',
  fontWeight: 'bold',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const itemsNote = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 16px',
};

const itemContainer = {
  marginBottom: '16px',
};

const itemRow = {
  marginBottom: '4px',
};

const itemLabelColumn = {
  width: '80px',
  verticalAlign: 'top' as const,
};

const itemValueColumn = {
  verticalAlign: 'top' as const,
};

const itemLabel = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
  fontWeight: '500',
};

const itemValue = {
  color: '#374151',
  fontSize: '12px',
  margin: '0',
};

const itemSeparator = {
  borderColor: '#f3f4f6',
  margin: '12px 0',
};

const moreItemsNote = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '16px 0 0',
  fontStyle: 'italic',
};

const requestText = {
  color: '#1f2937',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const contactText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 8px',
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