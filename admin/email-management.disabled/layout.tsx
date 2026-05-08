'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Mail, 
  BarChart3, 
  Activity, 
  Send,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';

const emailTabs = [
  { 
    href: '/email-management', 
    icon: Mail, 
    label: 'Email Logs',
    description: 'View all sent emails and their status'
  },
  { 
    href: '/email-management/stats', 
    icon: BarChart3, 
    label: 'Statistics',
    description: 'Email delivery metrics and analytics'
  },
  { 
    href: '/email-management/health', 
    icon: Activity, 
    label: 'Health Report',
    description: 'System health and recommendations'
  },
  { 
    href: '/email-management/test', 
    icon: Send, 
    label: 'Test Email',
    description: 'Send test emails to verify configuration'
  },
];

export default function EmailManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Email Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor and manage RA request emails and system notifications
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {emailTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon
                  className={cn(
                    'mr-2 h-5 w-5',
                    isActive
                      ? 'text-blue-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}