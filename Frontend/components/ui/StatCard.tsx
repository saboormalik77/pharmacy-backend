import { cn } from '@/lib/utils/cn'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
}

export function StatCard({ title, value, icon: Icon, trend, description }: StatCardProps) {
  return (
    <Card className="border border-[#e2e2e2] rounded-[4px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[#6b7280]">
          {title}
        </CardTitle>
        <div className="p-2 bg-[#f5f2f1] rounded-[4px]">
          <Icon className="h-4 w-4 text-[#516057]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#000000]">{value}</div>
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-[#516057]' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last month
          </p>
        )}
        {description && (
          <p className="text-xs text-[#6b7280] mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
