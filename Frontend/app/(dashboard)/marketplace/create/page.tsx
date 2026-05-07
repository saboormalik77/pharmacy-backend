"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, AlertTriangle, CheckCircle, Save, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { NDCProduct } from '@/data/mockNDCProducts';
import { productsService } from '@/lib/api/services';

export default function CreateListingPage() {
  const router = useRouter();
  const [ndcInput, setNdcInput] = useState('');
  const [product, setProduct] = useState<NDCProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Listing form state
  const [formData, setFormData] = useState({
    lotNumber: '',
    expirationDate: '',
    quantity: 0,
    pricePerUnit: 0,
    condition: 'unopened',
    location: {
      city: '',
      state: '',
    },
    notes: '',
    visibility: 'public' as 'public' | 'private',
    // Advanced features
    pricingStrategy: 'FIXED' as 'FIXED' | 'NEGOTIABLE' | 'AUCTION',
    tierPricing: [] as Array<{ minQuantity: number; price: number }>,
    shipping: {
      methods: [] as string[],
      locations: [] as string[],
      estimatedDays: 5,
      cost: 0,
    },
    compliance: {
      requiresLicenseVerification: true,
      requiresPedigree: false,
      restrictedStates: [] as string[],
    },
  });

  const lookupNDC = async (ndc: string) => {
    if (!ndc.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await productsService.validateNDC(ndc);
      
      if (!result.valid || !result.product) {
        setError(result.error || 'NDC not found');
        setProduct(null);
        return;
      }
      
      // Transform Product to NDCProduct
      const transformedProduct: NDCProduct = {
        ndc: result.product.ndc,
        labelerCode: result.product.ndc.split('-')[0] || '',
        productCode: result.product.ndc.split('-')[1] || '',
        packageCode: result.product.ndc.split('-')[2] || '',
        proprietaryName: result.product.productName,
        nonProprietaryName: result.product.productName,
        manufacturerName: result.product.manufacturer || '',
        labelerName: result.product.manufacturer || '',
        dosageForm: result.product.dosageForm || '',
        strength: result.product.strength || '',
        routeOfAdministration: [],
        rxRequired: false,
        packageDescription: '',
        packageSize: result.product.packageSize || 1,
        packageUnit: 'unit',
        wac: result.product.wac || 0,
        awp: result.product.awp || 0,
        returnEligibility: {
          eligible: true,
          returnWindow: 90,
          creditPercentage: 100,
          destructionRequired: false,
          requiresDEAForm: false,
          requiresWitnessDestruction: false,
          hazardousWaste: false,
        },
      };
      
      setProduct(transformedProduct);
      
      // Pre-fill price based on WAC
      if (transformedProduct.wac) {
        setFormData(prev => ({
          ...prev,
          pricePerUnit: transformedProduct.wac * 0.85, // Default to 85% of WAC
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to lookup NDC. Please try again.');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNDCSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupNDC(ndcInput);
  };

  const handleSave = async () => {
    if (!product) {
      setError('Please select a product first');
      return;
    }

    // Validate required fields
    if (!formData.lotNumber || !formData.expirationDate || formData.quantity <= 0) {
      setError('Please fill in all required fields (lot number, expiration date, and quantity)');
      return;
    }

    if (formData.pricePerUnit <= 0) {
      setError('Please set a valid price per unit');
      return;
    }

    if (!formData.location.city || !formData.location.state) {
      setError('Please provide location (city and state)');
      return;
    }

    // Check compliance requirements
    const complianceWarnings: string[] = [];
    
    if (product.deaSchedule) {
      complianceWarnings.push(
        `This is a Schedule ${product.deaSchedule} controlled substance. Ensure you have proper DEA registration and documentation.`
      );
    }

    if (product.returnEligibility?.requiresDEAForm) {
      complianceWarnings.push('DEA Form 222 may be required for this listing.');
    }

    // In production, this would save to the backend
    const listing = {
      product,
      ...formData,
      complianceWarnings,
    };

    console.log('Saving listing:', listing);
    
    // Navigate back to marketplace
    router.push('/marketplace');
  };

  const totalValue = formData.quantity * formData.pricePerUnit;
  const wacValue = product ? (formData.quantity * (product.wac || 0)) : 0;
  const discount = wacValue > 0 ? ((1 - totalValue / wacValue) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Marketplace Listing</h1>
            <p className="text-muted-foreground">List pharmaceutical inventory for sale</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        {/* NDC Product Lookup */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Search for product by NDC code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleNDCSubmit} className="flex gap-2">
              <Input
                type="text"
                value={ndcInput}
                onChange={(e) => setNdcInput(e.target.value)}
                placeholder="Enter NDC (e.g., 12345-6789-01)"
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {product && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {product.proprietaryName || product.nonProprietaryName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {product.strength} {product.dosageForm}
                    </p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>NDC: {product.ndc}</p>
                      <p>Manufacturer: {product.labelerName}</p>
                      <p>Package: {product.packageDescription}</p>
                      <p>WAC: {formatCurrency(product.wac || 0)}</p>
                    </div>
                    
                    {product.deaSchedule && (
                      <Badge variant="error" className="mt-2">
                        DEA Schedule {product.deaSchedule}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-600" />
                    <p className="text-sm font-medium text-green-600">Product Found</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listing Details */}
        {product && (
          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
              <CardDescription>Provide information about your inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Lot Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lotNumber}
                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                    placeholder="Enter lot number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Expiration Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unit: {product.packageUnit}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Price Per Unit <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="pl-7"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    WAC: {formatCurrency(product.wac || 0)} | 
                    Discount: {discount.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="unopened">Unopened / Sealed</option>
                  <option value="opened">Opened (partial)</option>
                  <option value="damaged">Damaged Packaging</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.location.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, city: e.target.value }
                    })}
                    placeholder="City"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.location.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, state: e.target.value }
                    })}
                    placeholder="State"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'private' })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="public">Public - Visible to all buyers</option>
                  <option value="private">Private - Only visible to approved buyers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information about the listing..."
                  className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                />
              </div>

              {/* Pricing Strategy */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Pricing Strategy</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="radio"
                      name="pricing"
                      value="FIXED"
                      checked={formData.pricingStrategy === 'FIXED'}
                      onChange={(e) => setFormData({ ...formData, pricingStrategy: e.target.value as any })}
                    />
                    <span>Fixed Price</span>
                  </label>
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="radio"
                      name="pricing"
                      value="NEGOTIABLE"
                      checked={formData.pricingStrategy === 'NEGOTIABLE'}
                      onChange={(e) => setFormData({ ...formData, pricingStrategy: e.target.value as any })}
                    />
                    <span>Negotiable</span>
                  </label>
                  <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="radio"
                      name="pricing"
                      value="AUCTION"
                      checked={formData.pricingStrategy === 'AUCTION'}
                      onChange={(e) => setFormData({ ...formData, pricingStrategy: e.target.value as any })}
                    />
                    <span>Auction</span>
                  </label>
                </div>

                {formData.pricingStrategy === 'FIXED' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Tier Pricing (Optional)</label>
                    <div className="space-y-2">
                      {formData.tierPricing.map((tier, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min quantity"
                            value={tier.minQuantity}
                            onChange={(e) => {
                              const newTiers = [...formData.tierPricing];
                              newTiers[index].minQuantity = parseInt(e.target.value) || 0;
                              setFormData({ ...formData, tierPricing: newTiers });
                            }}
                            className="w-32"
                          />
                          <Input
                            type="number"
                            placeholder="Price per unit"
                            value={tier.price}
                            onChange={(e) => {
                              const newTiers = [...formData.tierPricing];
                              newTiers[index].price = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, tierPricing: newTiers });
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                tierPricing: formData.tierPricing.filter((_, i) => i !== index)
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            tierPricing: [...formData.tierPricing, { minQuantity: 0, price: 0 }]
                          });
                        }}
                      >
                        + Add Pricing Tier
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Options */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Shipping Options</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Shipping Methods</label>
                    <div className="space-y-2">
                      {['UPS', 'FedEx', 'USPS', 'Ground'].map((method) => (
                        <label key={method} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.shipping.methods.includes(method)}
                            onChange={(e) => {
                              const methods = e.target.checked
                                ? [...formData.shipping.methods, method]
                                : formData.shipping.methods.filter(m => m !== method);
                              setFormData({
                                ...formData,
                                shipping: { ...formData.shipping, methods }
                              });
                            }}
                          />
                          <span>{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Delivery Days</label>
                    <Input
                      type="number"
                      value={formData.shipping.estimatedDays}
                      onChange={(e) => setFormData({
                        ...formData,
                        shipping: { ...formData.shipping, estimatedDays: parseInt(e.target.value) || 5 }
                      })}
                      min="1"
                    />
                    <label className="block text-sm font-medium mb-2 mt-4">Shipping Cost</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={formData.shipping.cost}
                        onChange={(e) => setFormData({
                          ...formData,
                          shipping: { ...formData.shipping, cost: parseFloat(e.target.value) || 0 }
                        })}
                        className="pl-7"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Requirements */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Compliance Requirements</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.compliance.requiresLicenseVerification}
                      onChange={(e) => setFormData({
                        ...formData,
                        compliance: {
                          ...formData.compliance,
                          requiresLicenseVerification: e.target.checked
                        }
                      })}
                    />
                    <span>Require buyer license verification</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.compliance.requiresPedigree}
                      onChange={(e) => setFormData({
                        ...formData,
                        compliance: {
                          ...formData.compliance,
                          requiresPedigree: e.target.checked
                        }
                      })}
                    />
                    <span>Include pedigree documentation</span>
                  </label>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Restricted States (will not ship to)
                  </label>
                  <select
                    multiple
                    className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({
                        ...formData,
                        compliance: {
                          ...formData.compliance,
                          restrictedStates: selected
                        }
                      });
                    }}
                  >
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="FL">Florida</option>
                    <option value="TX">Texas</option>
                    <option value="IL">Illinois</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hold Ctrl/Cmd to select multiple states
                  </p>
                </div>
              </div>

              {/* Compliance Warnings */}
              {(product.deaSchedule || product.returnEligibility?.requiresDEAForm) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 mb-1">Compliance Notice</p>
                      {product.deaSchedule && (
                        <p className="text-sm text-yellow-700">
                          This is a Schedule {product.deaSchedule} controlled substance. 
                          Ensure you have proper DEA registration and documentation before listing.
                        </p>
                      )}
                      {product.returnEligibility?.requiresDEAForm && (
                        <p className="text-sm text-yellow-700 mt-1">
                          DEA Form 222 may be required for transactions involving this product.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Total Listing Value:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formData.quantity} units × {formatCurrency(formData.pricePerUnit)}</span>
                  <span>vs WAC: {formatCurrency(wacValue)}</span>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!product && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Search for a product by NDC code to create a listing.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

