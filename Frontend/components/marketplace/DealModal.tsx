'use client'

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Minus, Plus, Package, Calendar, Tag, Building2, Check, Loader2 } from 'lucide-react'
import { useMarketplaceStore } from '@/lib/store/marketplaceStore'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils/format'

interface DealModalProps {
  onShowToast?: (message: string) => void
}

export function DealModal({ onShowToast }: DealModalProps) {
  const { isDealModalOpen, selectedDeal, closeDealModal, addToCart, isCartLoading } = useMarketplaceStore()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (selectedDeal) {
      const minQty = selectedDeal.minimumBuyQuantity || 1
      const availableQty = selectedDeal.quantity
      const effectiveMinQty = availableQty < minQty ? availableQty : minQty
      setQuantity(effectiveMinQty)
    }
  }, [selectedDeal])

  if (!isDealModalOpen || !selectedDeal) return null

  const minQuantity = selectedDeal.minimumBuyQuantity || 1
  const availableQty = selectedDeal.quantity
  const effectiveMinQuantity = availableQty < minQuantity ? availableQty : minQuantity
  const totalPrice = quantity * selectedDeal.dealPrice
  const savings = (selectedDeal.originalPrice - selectedDeal.dealPrice) * quantity
  const maxQuantity = selectedDeal.quantity

  const handleAddToCart = async () => {
    if (selectedDeal.status !== 'active') {
      onShowToast?.('This deal is no longer available')
      return
    }
    
    if (quantity < effectiveMinQuantity) {
      onShowToast?.(
        availableQty < minQuantity
          ? `Only ${availableQty} ${selectedDeal.unit} remaining (minimum order was ${minQuantity} ${selectedDeal.unit})`
          : `Minimum order quantity is ${minQuantity} ${selectedDeal.unit}`
      )
      return
    }
    
    if (quantity > availableQty) {
      onShowToast?.(`Only ${availableQty} ${selectedDeal.unit} available`)
      return
    }
    
    setIsAdding(true)
    const success = await addToCart(selectedDeal.id, quantity)
    setIsAdding(false)
    
    if (success) {
      onShowToast?.(`${quantity} ${selectedDeal.unit} of ${selectedDeal.productName} added to cart`)
      closeDealModal()
    } else {
      onShowToast?.('Failed to add item to cart')
    }
  }

  const isDisabled = selectedDeal.status !== 'active' || isAdding

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-300"
        onClick={closeDealModal}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[4px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-[#e2e2e2]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#e2e2e2]">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#000000] font-serif">Deal Details</h2>
              <Badge className="text-xs rounded-full bg-[#f5f2f1] text-[#505454]">{selectedDeal.dealNumber}</Badge>
              {selectedDeal.status !== 'active' && (
                <Badge className={`text-xs rounded-full capitalize ${selectedDeal.status === 'sold' ? 'bg-[#516057] text-white' : 'bg-red-500 text-white'}`}>
                  {selectedDeal.status}
                </Badge>
              )}
            </div>
            <button
              onClick={closeDealModal}
              className="p-1.5 hover:bg-[#f5f2f1] rounded-[4px] transition-colors"
            >
              <X className="h-5 w-5 text-[#505454]" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
              {/* Image Gallery */}
              <div>
                <div className="w-full h-[300px] bg-[#f5f2f1] rounded-[4px] border border-[#e2e2e2] overflow-hidden mb-2 relative">
                  <img 
                    src={selectedDeal.imageUrl || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop&q=80&${selectedDeal.id}`} 
                    alt={selectedDeal.productName} 
                    className="w-full h-full object-cover" 
                  />
                  {selectedDeal.inCart && (
                    <div className="absolute top-2 left-2">
                      <Badge className="text-xs rounded-full bg-[#516057] text-white">
                        <Check className="h-3 w-3 mr-1" />
                        In Cart ({selectedDeal.cartQuantity})
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                {/* Discount Badge */}
                <div className="inline-flex gap-2">
                  <Badge className="rounded-full bg-red-500 text-white">{selectedDeal.savings}% OFF</Badge>
                  <Badge className="rounded-full bg-[#f5f2f1] text-[#505454]">{selectedDeal.category}</Badge>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-[#000000] font-serif">{selectedDeal.productName}</h3>

                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedDeal.ndc && (
                    <div>
                      <p className="text-[#6b7280] mb-0.5">NDC Code</p>
                      <p className="font-mono font-semibold text-[#505454]">{selectedDeal.ndc}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[#6b7280] mb-0.5">Distributor</p>
                    <p className="font-semibold text-[#000000]">{selectedDeal.distributor}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] mb-0.5">Unit Type</p>
                    <p className="font-semibold text-[#000000] capitalize">{selectedDeal.unit}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] mb-0.5">Available</p>
                    <p className="font-semibold text-[#000000]">{selectedDeal.quantity} {selectedDeal.unit}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] mb-0.5">Product Expiry</p>
                    <p className="font-semibold text-[#000000]">{selectedDeal.expiryDate}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] mb-0.5">Posted Date</p>
                    <p className="font-semibold text-[#000000]">{selectedDeal.postedDate}</p>
                  </div>
                </div>

                {/* Minimum Order Quantity */}
                {minQuantity > 1 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#ad916a]/20 border border-[#ad916a]/30 rounded-[4px]">
                    <Package className="h-4 w-4 text-[#6b5a3f]" />
                    <div>
                      <p className="text-sm font-semibold text-[#6b5a3f]">
                        Minimum Order: {minQuantity} {selectedDeal.unit}
                      </p>
                      <p className="text-xs text-[#6b5a3f]/80">
                        This deal requires a minimum purchase quantity
                      </p>
                    </div>
                  </div>
                )}

                {/* Description/Notes */}
                {selectedDeal.notes && (
                  <div>
                    <h4 className="text-sm font-bold mb-1.5 text-[#000000]">Notes</h4>
                    <p className="text-xs text-[#505454] leading-relaxed">
                      {selectedDeal.notes}
                    </p>
                  </div>
                )}

                {/* Pricing Breakdown */}
                <div className="bg-[#f5f2f1] p-3 rounded-[4px]">
                  <h4 className="text-sm font-bold mb-2 text-[#000000]">Pricing Breakdown</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6b7280]">Original Price</span>
                      <span className="font-semibold text-[#9ca3af] line-through">{formatCurrency(selectedDeal.originalPrice)}/{selectedDeal.unit}</span>
                    </div>
                    <div className="flex justify-between text-[#ad916a] font-semibold">
                      <span>Discount ({selectedDeal.savings}%)</span>
                      <span>−{formatCurrency(selectedDeal.originalPrice - selectedDeal.dealPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-[#e2e2e2]">
                      <span>Discounted Price</span>
                      <span className="text-[#516057]">{formatCurrency(selectedDeal.dealPrice)}/{selectedDeal.unit}</span>
                    </div>
                    <Badge className="w-full justify-center mt-1.5 rounded-full bg-[#516057]/10 text-[#516057]">
                      Save {formatCurrency(selectedDeal.totalSavingsAmount)} per {selectedDeal.unit}
                    </Badge>
                  </div>
                </div>

                {/* Quantity Selector */}
                {selectedDeal.status === 'active' && (
                  <div>
                    <h4 className="text-sm font-bold mb-2 text-[#000000]">Select Quantity</h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(effectiveMinQuantity, quantity - 1))}
                        disabled={quantity <= effectiveMinQuantity}
                        className="w-8 h-8 border border-[#e2e2e2] rounded-[4px] hover:bg-[#f5f2f1] flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4 text-[#505454]" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || effectiveMinQuantity
                          if (val >= effectiveMinQuantity && val <= maxQuantity) setQuantity(val)
                        }}
                        className="w-16 h-8 text-center border border-[#e2e2e2] rounded-[4px] text-sm font-bold bg-white"
                        min={effectiveMinQuantity}
                        max={maxQuantity}
                      />
                      <button
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        disabled={quantity >= maxQuantity}
                        className="w-8 h-8 border border-[#e2e2e2] rounded-[4px] hover:bg-[#f5f2f1] flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4 text-[#505454]" />
                      </button>
                    </div>
                    <p className="text-xs text-[#6b7280] mt-1">
                      {availableQty < minQuantity ? (
                        <span className="text-[#ad916a]">
                          Only {availableQty} {selectedDeal.unit} remaining (minimum order was {minQuantity} {selectedDeal.unit})
                        </span>
                      ) : (
                        <>
                          Min: {minQuantity} {selectedDeal.unit} • Max: {maxQuantity} {selectedDeal.unit}
                        </>
                      )}
                    </p>
                    {quantity < effectiveMinQuantity && (
                      <p className="text-xs text-red-600 mt-1">
                        {availableQty < minQuantity
                          ? `Only ${availableQty} ${selectedDeal.unit} available`
                          : `Minimum order quantity is ${minQuantity} ${selectedDeal.unit}`
                        }
                      </p>
                    )}
                    <div className="bg-[#516057]/10 p-2 rounded-[4px] mt-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total:</span>
                        <span className="text-[#516057]">{formatCurrency(totalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#516057] mt-1">
                        <span>You save:</span>
                        <span>{formatCurrency(savings)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deal Terms */}
                <div>
                  <h4 className="text-sm font-bold mb-2 text-[#000000]">Deal Terms</h4>
                  <ul className="space-y-1 text-xs">
                    {[
                      `Available quantity: ${selectedDeal.quantity} ${selectedDeal.unit}`,
                      `Expires: ${selectedDeal.expiryDate}`,
                      'Free shipping on orders over $2,500',
                      'FDA approved and licensed distributors'
                    ].map((term, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[#505454]">
                        <Check className="h-3.5 w-3.5 text-[#516057] flex-shrink-0 mt-0.5" />
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#e2e2e2] flex justify-end gap-2">
            <button
              onClick={closeDealModal}
              className="px-3 py-1.5 border border-[#e2e2e2] bg-white hover:bg-[#f5f2f1] text-[#505454] rounded-[4px] text-xs font-medium transition-all"
            >
              Close
            </button>
            {selectedDeal.status === 'active' && (
              <button
                onClick={handleAddToCart}
                disabled={isDisabled}
                className="px-3 py-1.5 bg-[#516057] text-white rounded-[4px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium transition-all shadow-sm"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : selectedDeal.inCart ? (
                  <>
                    <Check className="h-4 w-4" />
                    Add More to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
