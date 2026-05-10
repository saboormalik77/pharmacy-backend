'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Eye, Clock, Package, Calendar, Tag, Building2, TrendingDown, Check, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils/format'
import { useMarketplaceStore, MarketplaceDeal } from '@/lib/store/marketplaceStore'

interface DealHeroProps {
  deal: MarketplaceDeal
  onShowToast?: (message: string) => void
  dealType?: 'day' | 'week' | 'month'
}

export function DealHero({ deal, onShowToast, dealType = 'day' }: DealHeroProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'urgent'>('normal')
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart, openDealModal } = useMarketplaceStore()

  const expiryDate = new Date(deal.expiryDate)
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const distance = expiryDate.getTime() - now

      if (distance < 0) {
        setTimeLeft('EXPIRED')
        setUrgency('urgent')
        return
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`${hours}h ${minutes}m`)
      }

      if (days < 7) {
        setUrgency('urgent')
      } else if (days < 30) {
        setUrgency('warning')
      } else {
        setUrgency('normal')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [expiryDate])

  const handleAddToCart = async () => {
    if (deal.status !== 'active') {
      onShowToast?.('This deal is no longer available')
      return
    }
    
    const minQty = deal.minimumBuyQuantity || 1
    const availableQty = deal.quantity
    const quantityToAdd = availableQty < minQty ? availableQty : minQty
    
    setIsAdding(true)
    const success = await addToCart(deal.id, quantityToAdd)
    setIsAdding(false)
    
    if (success) {
      onShowToast?.(`${quantityToAdd} ${deal.unit} of ${deal.productName} added to cart`)
    } else {
      onShowToast?.('Failed to add item to cart')
    }
  }

  const isDisabled = deal.status !== 'active' || isAdding

  const getBadgeStyles = () => {
    switch (dealType) {
      case 'day':
        return 'bg-[#ad916a] text-white'
      case 'week':
        return 'bg-[#516057] text-white'
      case 'month':
        return 'bg-[#1d2222] text-white'
      default:
        return 'bg-[#516057] text-white'
    }
  }

  return (
    <Card className="bg-white border border-[#e2e2e2] relative overflow-hidden rounded-[4px]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Featured Deal Badge */}
            <div className={`relative text-white px-5 py-2 rounded-full font-extrabold text-sm sm:text-base shadow-md border-2 border-white/30 ${getBadgeStyles()}`}>
              <span className="mr-1.5">{dealType === 'day' ? '🔥' : dealType === 'week' ? '⭐' : '🏆'}</span>
              {dealType === 'day' ? 'DEAL OF THE DAY' : dealType === 'week' ? 'DEAL OF THE WEEK' : 'DEAL OF THE MONTH'}
            </div>
            {deal.inCart && (
              <Badge className="text-xs rounded-full bg-[#516057] text-white">
                <Check className="h-3 w-3 mr-1" />
                In Cart ({deal.cartQuantity})
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className={`h-3 w-3 ${urgency === 'urgent' ? 'text-red-500' : 'text-[#9ca3af]'}`} />
            <span className={`font-mono font-semibold ${urgency === 'urgent' ? 'text-red-500' : 'text-[#9ca3af]'}`}>
              Expires: {new Date(deal.featuredUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4">
          {/* Product Image */}
          <div className="relative w-full h-[350px] bg-[#f5f2f1] rounded-[4px] overflow-hidden border border-[#e2e2e2] shadow-sm">
            <img 
              src={deal.imageUrl || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop&q=80`} 
              alt={deal.productName} 
              className="w-full h-full object-cover" 
            />
            {/* Discount Badge */}
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-[#ad916a] text-white w-24 h-24 rounded-full flex flex-col items-center justify-center font-bold shadow-lg border-4 border-white">
                <span className="text-3xl leading-none">{deal.savings}%</span>
                <span className="text-xs font-extrabold">OFF</span>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-3">
              {/* Title & Meta */}
              <div>
                <h3 className="text-lg font-bold mb-1 text-[#000000] font-serif">{deal.productName}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-[#6b7280]">
                  {deal.ndc && (
                    <>
                      <span className="font-mono font-semibold text-[#505454]">NDC: {deal.ndc}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{deal.distributor}</span>
                  <span>•</span>
                  <span>{deal.category}</span>
                  <span>•</span>
                  <span>{deal.dealNumber}</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-[#9ca3af] mb-0.5">Regular Price</p>
                  <p className="text-sm text-[#9ca3af] line-through">{formatCurrency(deal.originalPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9ca3af] mb-0.5">Deal Price</p>
                  <p className="text-2xl font-bold text-[#516057]">{formatCurrency(deal.dealPrice)}<span className="text-xs font-normal text-[#6b7280] ml-1">/{deal.unit}</span></p>
                </div>
                <div className="ml-auto">
                  <Badge className="text-xs rounded-full bg-[#516057]/10 text-[#516057]">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Save {formatCurrency(deal.totalSavingsAmount)}
                  </Badge>
                </div>
              </div>

              {/* Availability */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-[#6b7280]">Availability</span>
                  <span className="text-xs font-semibold text-[#000000]">{deal.quantity} {deal.unit} remaining</span>
                </div>
                <div className="w-full h-2 bg-[#f5f2f1] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      deal.quantity > 50
                        ? 'bg-[#516057]'
                        : deal.quantity > 20
                        ? 'bg-[#ad916a]'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, deal.quantity)}%` }}
                  />
                </div>
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-3 gap-2 py-2 border-t border-[#e2e2e2]">
                <div className="text-xs">
                  <p className="text-[#6b7280] mb-0.5">Min Order</p>
                  <p className="font-semibold text-[#000000]">{deal.minimumBuyQuantity || 1} {deal.unit}</p>
                </div>
                <div className="text-xs">
                  <p className="text-[#6b7280] mb-0.5">Expiry</p>
                  <p className="font-semibold text-[#000000]">{deal.expiryDate}</p>
                </div>
                <div className="text-xs">
                  <p className="text-[#6b7280] mb-0.5">Status</p>
                  <p className="font-semibold text-[#000000] capitalize">{deal.status}</p>
                </div>
              </div>

              {/* Notes */}
              {deal.notes && (
                <div className="text-xs bg-[#f5f2f1] p-2 rounded-[4px]">
                  <p className="text-[#505454]">{deal.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={isDisabled}
                className="flex-1 px-2 py-1 bg-[#516057] text-white rounded-[4px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs font-medium transition-all shadow-sm"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Adding...
                  </>
                ) : deal.inCart ? (
                  <>
                    <Check className="h-3 w-3" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-3 w-3" />
                    Add to Cart
                  </>
                )}
              </button>
              <button
                onClick={() => openDealModal(deal)}
                className="px-2 py-1 border border-[#e2e2e2] bg-white hover:bg-[#f5f2f1] text-[#505454] rounded-[4px] flex items-center justify-center gap-1 text-xs font-medium transition-all"
              >
                <Eye className="h-3 w-3" />
                Details
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
