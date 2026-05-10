'use client'

import { useState } from 'react'
import { ShoppingCart, Eye, Clock, Calendar, Check, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils/format'
import { useMarketplaceStore, MarketplaceDeal } from '@/lib/store/marketplaceStore'

interface DealCardProps {
  deal: MarketplaceDeal
  onShowToast?: (message: string) => void
  featuredDealType?: 'day' | 'week' | 'month' | null
}

export function DealCard({ deal, onShowToast, featuredDealType }: DealCardProps) {
  const { addToCart, openDealModal, isCartLoading } = useMarketplaceStore()
  const [isAdding, setIsAdding] = useState(false)
  
  const dealFeaturedType = deal.featuredDealType
  const isFeaturedButNotShown = dealFeaturedType && dealFeaturedType !== featuredDealType
  
  const getFeaturedBadge = () => {
    if (!isFeaturedButNotShown || !dealFeaturedType) return null
    
    const badges = {
      day: { text: 'Deal of the Day', emoji: '🔥', className: 'bg-[#ad916a] text-white' },
      week: { text: 'Deal of the Week', emoji: '⭐', className: 'bg-[#516057] text-white' },
      month: { text: 'Deal of the Month', emoji: '🏆', className: 'bg-[#1d2222] text-white' }
    }
    
    const badge = badges[dealFeaturedType]
    return (
      <Badge className={`text-[10px] px-1.5 py-0.5 font-semibold border-2 border-white/30 rounded-full ${badge.className}`}>
        <span className="mr-0.5">{badge.emoji}</span>
        {badge.text}
      </Badge>
    )
  }
  
  const expiryDate = new Date(deal.expiryDate)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = daysUntilExpiry <= 30
  const isExpired = daysUntilExpiry < 0
  
  const percentageRemaining = (deal.quantity / 100) * 100
  
  const getStatusBadge = () => {
    if (deal.status === 'sold') {
      return <Badge variant="secondary" className="text-xs bg-[#516057] text-white">Sold Out</Badge>
    }
    if (deal.status === 'expired') {
      return <Badge variant="destructive" className="text-xs bg-red-600 text-white">Expired</Badge>
    }
    return null
  }

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

  return (
    <Card className={`hover:shadow-md transition-shadow rounded-[4px] border-[#e2e2e2] ${deal.status !== 'active' ? 'opacity-75' : ''}`}>
      <CardContent className="p-3">
        {/* Image */}
        <div className="relative h-32 bg-[#f5f2f1] rounded-[4px] overflow-hidden mb-2">
          <img 
            src={deal.imageUrl || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop&q=80&${deal.id}`} 
            alt={deal.productName} 
            className="w-full h-full object-cover" 
          />
          
          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            {isFeaturedButNotShown && getFeaturedBadge()}
            {deal.status === 'active' && (
              <Badge className="text-xs bg-red-500 text-white rounded-full">{deal.savings}% OFF</Badge>
            )}
            {getStatusBadge()}
          </div>
          
          {/* Time/Expiry Badge */}
          <div className="absolute bottom-2 left-2">
            <Badge 
              variant={isExpiringSoon ? 'destructive' : 'secondary'} 
              className="text-xs rounded-full bg-white/90 text-[#505454]"
            >
              <Calendar className="h-2 w-2 mr-1" />
              {isExpired ? 'Expired' : `Exp: ${deal.expiryDate}`}
            </Badge>
          </div>
          
          {/* In Cart Badge */}
          {deal.inCart && (
            <div className="absolute top-2 left-2">
              <Badge className="text-xs rounded-full bg-[#516057] text-white">
                <Check className="h-2 w-2 mr-1" />
                In Cart ({deal.cartQuantity})
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem] text-[#000000]">
            {deal.productName}
          </h3>

          {/* Meta */}
          <div className="space-y-0.5 text-xs text-[#6b7280]">
            {deal.ndc && <p className="font-mono font-semibold text-[#505454]">NDC: {deal.ndc}</p>}
            <p className="truncate">{deal.distributor}</p>
            <p className="text-xs">{deal.category}</p>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-[#9ca3af] line-through">{formatCurrency(deal.originalPrice)}</span>
            <span className="text-lg font-bold text-[#516057]">{formatCurrency(deal.dealPrice)}</span>
            <span className="text-xs text-[#6b7280]">/{deal.unit}</span>
          </div>

          {/* Minimum Order Quantity */}
          <p className="text-xs text-[#6b7280]">
            Min. Order: {deal.minimumBuyQuantity || 1} {deal.unit}
          </p>

          {/* Availability */}
          <div>
            <div className="w-full h-1.5 bg-[#f5f2f1] rounded-full overflow-hidden mb-1">
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
            <p className="text-xs text-[#6b7280]">{deal.quantity} {deal.unit} available</p>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Badge className="text-xs rounded-full bg-[#516057]/10 text-[#516057]">
                Save {formatCurrency(deal.totalSavingsAmount)}
              </Badge>
              <span className="text-[#9ca3af]">{deal.dealNumber}</span>
            </div>
            {/* Actions */}
            <div className="flex gap-1.5">
              <button
                onClick={handleAddToCart}
                disabled={isDisabled}
                className="flex-1 px-2 py-1 bg-[#516057] text-white rounded-[4px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs font-medium transition-all shadow-sm h-7"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Adding...
                  </>
                ) : deal.inCart ? (
                  <>
                    <Check className="h-3 w-3" />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-3 w-3" />
                    Add
                  </>
                )}
              </button>
              <button
                onClick={() => openDealModal(deal)}
                className="px-2 py-1 border border-[#e2e2e2] bg-white hover:bg-[#f5f2f1] text-[#505454] rounded-[4px] flex items-center justify-center h-7 transition-all"
              >
                <Eye className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
