"use client";

import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Download, Printer, QrCode } from 'lucide-react';
import JsBarcode from 'jsbarcode';

export default function BarcodeGeneratorPage() {
  const [ndcCode, setNdcCode] = useState('16729009712');
  const [itemName, setItemName] = useState('Quetiapine 400mg ER Tablet');
  const [manufacturer, setManufacturer] = useState('ACCORD HEALTHCARE');
  const [lotNumber, setLotNumber] = useState('RXM2114938');
  const [expirationDate, setExpirationDate] = useState('2024-09-24');
  const [quantity, setQuantity] = useState(1);
  const [creditAmount, setCreditAmount] = useState(4.62);
  const [pricePerUnit, setPricePerUnit] = useState(4.62);
  
  const barcodeRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate barcode data string with all information: NDC|LOT|EXP
  const generateBarcodeData = () => {
    return `${ndcCode}|${lotNumber}|${expirationDate}`;
  };

  // Generate barcode with all data (NDC|LOT|EXP)
  useEffect(() => {
    if (barcodeRef.current && ndcCode) {
      try {
        // Generate barcode data string with all information: NDC|LOT|EXP
        const barcodeData = generateBarcodeData();
        JsBarcode(barcodeRef.current, barcodeData, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [ndcCode, lotNumber, expirationDate]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && containerRef.current) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Barcode Label</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                margin: 0;
              }
              .barcode-container {
                border: 2px solid #000;
                padding: 20px;
                max-width: 400px;
                margin: 0 auto;
              }
              .barcode-info {
                margin-bottom: 15px;
              }
              .barcode-info h3 {
                margin: 0 0 10px 0;
                font-size: 18px;
              }
              .barcode-info p {
                margin: 5px 0;
                font-size: 12px;
              }
              .barcode-display {
                text-align: center;
                margin: 20px 0;
              }
              @media print {
                body {
                  padding: 0;
                }
                .barcode-container {
                  border: 1px solid #000;
                }
              }
            </style>
          </head>
          <body>
            ${containerRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDownload = () => {
    if (containerRef.current) {
      // Create a canvas to capture the barcode
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 800;
      canvas.height = 600;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Draw text information
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(itemName, 30, 50);
      
      ctx.font = '16px Arial';
      ctx.fillText(`NDC: ${ndcCode}`, 30, 80);
      ctx.fillText(`Manufacturer: ${manufacturer}`, 30, 105);
      ctx.fillText(`Lot: ${lotNumber}`, 30, 130);
      ctx.fillText(`Exp: ${expirationDate}`, 30, 155);
      ctx.fillText(`Qty: ${quantity}`, 30, 180);
      ctx.fillText(`Price: $${pricePerUnit.toFixed(2)}`, 30, 205);
      ctx.fillText(`Credit: $${creditAmount.toFixed(2)}`, 30, 230);

      // Draw barcode text
      ctx.fillText('Barcode: ' + ndcCode, 30, 280);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `barcode-${ndcCode}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    }
  };


  const copyBarcodeData = () => {
    const data = generateBarcodeData();
    navigator.clipboard.writeText(data);
    // alert('Barcode data copied to clipboard!');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Barcode Generator</h1>
          <p className="text-gray-600">Generate barcodes for pharmaceutical products</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>Enter product details to generate barcode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">NDC Code *</label>
                <Input
                  value={ndcCode}
                  onChange={(e) => setNdcCode(e.target.value)}
                  placeholder="16729009712"
                  className="font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Item Name *</label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Quetiapine 400mg ER Tablet"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Manufacturer *</label>
                <Input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="ACCORD HEALTHCARE"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Lot Number</label>
                  <Input
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="RXM2114938"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Expiration Date</label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Price per Unit</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Credit Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">Barcode Data String:</p>
                <div className="flex gap-2">
                  <Input
                    value={generateBarcodeData()}
                    readOnly
                    className="font-mono text-xs bg-gray-50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyBarcodeData}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Format: NDC|LOT|EXP (can be scanned and parsed automatically)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Barcode Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Barcode Preview</CardTitle>
              <CardDescription>Preview and download the generated barcode</CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={containerRef} className="border-2 border-gray-800 p-6 bg-white">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">{itemName}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>NDC Code:</strong> {ndcCode}</p>
                    <p><strong>Manufacturer:</strong> {manufacturer}</p>
                    <p><strong>Lot Number:</strong> {lotNumber}</p>
                    <p><strong>Expiration Date:</strong> {expirationDate}</p>
                    <p><strong>Quantity:</strong> {quantity}</p>
                    <p><strong>Price per Unit:</strong> ${pricePerUnit.toFixed(2)}</p>
                    <p><strong>Credit Amount:</strong> ${creditAmount.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex justify-center items-center my-6 bg-white p-4">
                  {ndcCode ? (
                    <svg ref={barcodeRef} className="w-full" />
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <QrCode className="h-16 w-16 mx-auto mb-2" />
                      <p>Enter NDC code to generate barcode</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

