import puppeteer, { Browser } from 'puppeteer';
import { CheckPdfData } from './pharmacyPaymentService';
import { AppError } from '../utils/appError';

// Convert number to words for check amounts
function numberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 
                'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 
                'EIGHTEEN', 'NINETEEN'];
  
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  
  const thousands = ['', 'THOUSAND', 'MILLION', 'BILLION'];

  if (num === 0) return 'ZERO';
  
  const dollars = Math.floor(num);
  const cents = Math.round((num - dollars) * 100);
  
  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  }
  
  function convertNumber(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    let thousandIndex = 0;
    
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk !== 0) {
        const chunkWords = convertLessThanThousand(chunk);
        result = chunkWords + thousands[thousandIndex] + ' ' + result;
      }
      n = Math.floor(n / 1000);
      thousandIndex++;
    }
    
    return result.trim();
  }
  
  const dollarWords = convertNumber(dollars);
  const centsPart = cents.toString().padStart(2, '0');
  
  return `${dollarWords} & ${centsPart}/100`;
}

// Generate check HTML template
function generateCheckHtml(data: CheckPdfData): string {
  const { payment, pharmacy, manufacturerCredits, rsiAddress } = data;
  
  const checkAmountWords = numberToWords(payment.pharmacyPayout || 0);
  const checkDate = payment.checkDate ? new Date(payment.checkDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const serviceDate = payment.serviceDate ? new Date(payment.serviceDate).toLocaleDateString('en-US') : '';

  // Calculate totals for credit summary
  const includedTotal = manufacturerCredits.included.reduce((sum, credit) => sum + credit.creditAmount, 0);
  const directTotal = manufacturerCredits.direct.reduce((sum, credit) => sum + credit.creditAmount, 0);
  const porTotal = manufacturerCredits.por.reduce((sum, credit) => sum + credit.creditAmount, 0);
  const grossCredit = includedTotal + directTotal + porTotal;
  
  const rsiFeeIncluded = includedTotal * ((payment.rsiFeeIncludedPercent || 14.90) / 100);
  const rsiFeeDeducts = directTotal * ((payment.rsiFeeDirectPercent || 14.90) / 100);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RSI Check #${payment.checkNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .check-header {
            text-align: left;
            margin-bottom: 10px;
        }
        
        .check-format {
            border: 2px solid #000;
            padding: 15px;
            margin: 20px 0;
            background: #f9f9f9;
        }
        
        .check-number {
            text-align: right;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .pay-to-order {
            margin: 15px 0;
        }
        
        .amount-line {
            border-bottom: 1px solid #000;
            display: inline-block;
            min-width: 200px;
            padding: 2px 5px;
            margin-left: 10px;
        }
        
        .amount-words {
            border-bottom: 1px solid #000;
            padding: 5px;
            margin: 10px 0;
            text-transform: uppercase;
        }
        
        .signature-line {
            margin-top: 20px;
            text-align: right;
        }
        
        .credit-breakdown {
            margin: 30px 0;
        }
        
        .manufacturer-list {
            margin: 10px 0;
        }
        
        .manufacturer-item {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
        }
        
        .credit-summary {
            margin: 20px 0;
            border-top: 1px solid #000;
            padding-top: 10px;
        }
        
        .summary-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        
        .section-title {
            font-weight: bold;
            margin: 15px 0 5px 0;
            text-decoration: underline;
        }
        
        .explanation-text {
            font-style: italic;
            margin: 10px 0;
            color: #666;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            border-top: 1px solid #000;
            padding-top: 10px;
        }

        .currency {
            font-weight: bold;
        }

        .controlled-notation {
            font-size: 10px;
            color: #666;
        }
    </style>
</head>
<body>
    <!-- Header Section -->
    <div class="check-header">
        <div>${rsiAddress.street}</div>
        <div>${rsiAddress.city}, ${rsiAddress.state} ${rsiAddress.zipCode}</div>
    </div>
    
    <!-- Check Format Section -->
    <div class="check-format">
        <div class="check-number">${payment.checkNumber}</div>
        <div style="margin-bottom: 15px;">${checkDate}</div>
        
        <div class="pay-to-order">
            <strong>PAY TO THE<br>ORDER OF :</strong>
            <span class="amount-line">${pharmacy.pharmacyName}</span>
            <span style="float: right;"><strong>$ ${(payment.pharmacyPayout || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
        </div>
        
        <div class="amount-words">
            ${checkAmountWords} --------------------- DOLLARS
        </div>
        
        <div style="margin: 15px 0;">
            <strong>FOR :</strong> ${pharmacy.pharmacyName}<br>
            ${pharmacy.address}<br>
            ${pharmacy.city} ${pharmacy.state} ${pharmacy.zipCode}
        </div>
        
        <div class="signature-line">
            <strong>RETURN SOLUTIONS, INC.</strong> ${payment.checkNumber}
        </div>
    </div>
    
    <!-- Credit Breakdown Section -->
    <div class="credit-breakdown">
        <div><strong>Ref # ${payment.returnReferenceNumber || 'N/A'}</strong> - These manufacturer credits are included in this check. Account # ${payment.pharmacyAccountNumber || 'N/A'} Service Date:${serviceDate} Check Date:${checkDate}</div>
        
        ${manufacturerCredits.included.length > 0 ? `
        <div class="manufacturer-list">
            ${manufacturerCredits.included.map(credit => `
                <div class="manufacturer-item">
                    <span>${credit.manufacturerName}${credit.isControlledSubstance ? ' (CIII-CV)' : ''}</span>
                    <span class="currency">$${credit.creditAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${manufacturerCredits.direct.length > 0 ? `
        <div style="margin-top: 20px;">
            <div><strong>Ref # ${payment.returnReferenceNumber || 'N/A'}</strong> - The following manufacturers issue credit directly to pharmacies. You will receive these credits as a check from the manufacturer or credit through your wholesaler. The amount of expected credit from each is listed below, and our fee for these is deducted from this check.</div>
            <div class="manufacturer-list">
                ${manufacturerCredits.direct.map(credit => `
                    <div class="manufacturer-item">
                        <span>${credit.manufacturerName}${credit.isControlledSubstance ? ' (CIII-CV)' : ''}</span>
                        <span class="currency">$${credit.creditAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${manufacturerCredits.por.length > 0 ? `
        <div style="margin-top: 20px;">
            <div class="explanation-text">These returns did not meet our pedigree policy and have been processed under our Pay-On-Receipt program. Fees for these have not been taken out of this check, and will only be applied if we receive credit and, in turn, pay you. Please note an additional 2% processing fee may apply.</div>
            <div class="manufacturer-list">
                ${manufacturerCredits.por.map(credit => `
                    <div class="manufacturer-item">
                        <span>${credit.manufacturerName}${credit.isControlledSubstance ? ' (CIII-CV)' : ''}</span>
                        <span class="currency">$${credit.creditAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    </div>
    
    <!-- Credit Summary Section -->
    <div class="credit-summary">
        <div class="section-title">CREDIT SUMMARY:</div>
        <div class="summary-line">
            <span>Included in this check:</span>
            <span><strong>$${includedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
        </div>
        <div class="summary-line">
            <span>Credit for manufacturers included in this check:</span>
            <span>$${includedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-line">
            <span>Direct from manufacturer:</span>
            <span>$${directTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-line">
            <span>RSI Fee (@ ${(payment.rsiFeeIncludedPercent || 14.90).toFixed(2)}%) for manufacturers included in this check:</span>
            <span><strong>- $${rsiFeeIncluded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
        </div>
        <div class="summary-line">
            <span>Gross Credit:</span>
            <span>$${grossCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-line">
            <span>RSI Fee (@ ${(payment.rsiFeeDirectPercent || 14.90).toFixed(2)}%) for direct crediting manufacturers:</span>
            <span>- $${rsiFeeDeducts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-line" style="border-top: 1px solid #000; padding-top: 5px; margin-top: 10px;">
            <span><strong>TOTAL FOR CHECK:</strong></span>
            <span><strong>${(payment.pharmacyPayout || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, style: 'currency', currency: 'USD' })}</strong></span>
        </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
        <strong>-- 1 of 1 --</strong>
    </div>
</body>
</html>
  `;
}

// Generate PDF from check data
export async function generateCheckPdf(data: CheckPdfData): Promise<Buffer> {
  let browser: Browser | null = null;
  
  try {
    // Generate HTML
    const html = generateCheckHtml(data);
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set content and generate PDF
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });
    
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating check PDF:', error);
    throw new AppError('Failed to generate check PDF', 500);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Convert amount to written format for checks
export function formatCheckAmount(amount: number): string {
  return numberToWords(amount);
}