"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { DEAForm222Generator } from '@/lib/dea/form222';
import type { DEAForm222 } from '@/lib/dea/types';
import { formatCurrency } from '@/lib/utils/format';

interface DEAForm222GeneratorProps {
  returnId: string;
  items: Array<{
    ndc: string;
    drugName: string;
    manufacturer: string;
    quantity: number;
    lotNumber: string;
    expirationDate: string;
    strength?: string;
    dosageForm?: string;
    nonProprietaryName?: string;
    packageSize?: number;
  }>;
  registrantInfo?: {
    businessName: string;
    deaNumber: string;
    addresses: {
      registered: {
        street: string;
        city: string;
        state: string;
        zip: string;
      };
    };
  };
}

export function DEAForm222GeneratorComponent({ 
  returnId, 
  items,
  registrantInfo 
}: DEAForm222GeneratorProps) {
  const [forms, setForms] = useState<DEAForm222[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock registrant info if not provided
  const defaultRegistrant = registrantInfo || {
    businessName: 'HealthCare Pharmacy',
    deaNumber: 'AB1234567',
    addresses: {
      registered: {
        street: '123 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
      },
    },
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setErrors([]);

    try {
      // Filter only controlled substances (CII items)
      const controlledItems = items.filter(item => {
        // In production, this would check the product's DEA schedule
        // For now, we'll assume all items in this context are controlled
        return true;
      });

      if (controlledItems.length === 0) {
        setErrors(['No controlled substances found in this return']);
        setIsGenerating(false);
        return;
      }

      const generatedForms = DEAForm222Generator.generateForm(
        defaultRegistrant,
        controlledItems.map(item => ({
          ndc: item.ndc,
          nonProprietaryName: item.drugName,
          productName: item.drugName,
          strength: item.strength || '',
          dosageForm: item.dosageForm || '',
          quantity: item.quantity,
          packageSize: item.packageSize || 100,
        }))
      );

      // Validate each form
      const validationErrors: string[] = [];
      generatedForms.forEach((form, index) => {
        const formErrors = DEAForm222Generator.validateForm(form);
        if (formErrors.length > 0) {
          validationErrors.push(`Form ${index + 1}: ${formErrors.join(', ')}`);
        }
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      } else {
        setForms(generatedForms);
      }
    } catch (error) {
      setErrors([`Failed to generate forms: ${error}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = (form: DEAForm222) => {
    const blob = DEAForm222Generator.exportToPDF(form);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DEA-Form-222-${form.formNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    forms.forEach(form => handleDownloadPDF(form));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>DEA Form 222 Generator</CardTitle>
            <CardDescription>
              Generate DEA Form 222 for Schedule II controlled substances
            </CardDescription>
          </div>
          {forms.length > 0 && (
            <Button onClick={handleDownloadAll} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download All ({forms.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Registrant Info Display */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Registrant Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <span className="ml-2 font-medium">{defaultRegistrant.businessName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">DEA Number:</span>
              <span className="ml-2 font-medium font-mono">{defaultRegistrant.deaNumber}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Address:</span>
              <span className="ml-2">
                {defaultRegistrant.addresses.registered.street}, {defaultRegistrant.addresses.registered.city}, {defaultRegistrant.addresses.registered.state} {defaultRegistrant.addresses.registered.zip}
              </span>
            </div>
          </div>
        </div>

        {/* Items Summary */}
        <div>
          <h3 className="font-semibold mb-2">Controlled Substances ({items.length} items)</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex-1">
                  <p className="font-medium">{item.drugName}</p>
                  <p className="text-muted-foreground text-xs">
                    NDC: {item.ndc} | Lot: {item.lotNumber} | Qty: {item.quantity}
                  </p>
                </div>
                <Badge variant="error" className="ml-2">CII</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 mb-1">Validation Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        {forms.length === 0 && (
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate DEA Form 222'}
          </Button>
        )}

        {/* Generated Forms */}
        {forms.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">Successfully generated {forms.length} form(s)</p>
            </div>

            {forms.map((form, index) => (
              <div key={form.formNumber} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">Form {index + 1}</h4>
                    <p className="text-sm text-muted-foreground">
                      Form Number: {form.formNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {form.totalLines} line item(s) • Date: {form.dateExecuted.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={form.status === 'DRAFT' ? 'warning' : 'success'}>
                      {form.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(form)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>

                {/* Form Preview */}
                <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                  <p className="font-medium mb-2">Line Items:</p>
                  <div className="space-y-1">
                    {form.lineItems.map((lineItem) => (
                      <div key={lineItem.lineNumber} className="flex justify-between">
                        <span>
                          Line {lineItem.lineNumber}: {lineItem.nameOfItem}
                        </span>
                        <span className="text-muted-foreground">
                          {lineItem.numberOfPackages} pkg × {lineItem.sizeOfPackage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Note:</strong> DEA Form 222 must be completed, signed, and submitted according to DEA regulations. 
                This generated form is a draft and requires proper signatures before use.
              </p>
              <Button
                variant="outline"
                onClick={() => setForms([])}
                className="w-full"
              >
                Generate New Forms
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

