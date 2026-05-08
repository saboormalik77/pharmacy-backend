'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
    disabled?: boolean;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTab, onChange }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
    const tabListRef = useRef<HTMLDivElement>(null);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        onChange?.(tabId);
    };

    const activeContent = tabs.find((t) => t.id === activeTab)?.content;

    useEffect(() => {
        if (defaultTab && defaultTab !== activeTab) {
            setActiveTab(defaultTab);
        }
    }, [defaultTab, activeTab]);

    return (
        <div>
            <div
                ref={tabListRef}
                className="border-b border-[var(--outline-variant)] flex overflow-x-auto"
                style={{ backgroundColor: 'var(--surface-container-lowest)' }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => !tab.disabled && handleTabChange(tab.id)}
                        disabled={tab.disabled}
                        className={cn(
                            'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-[2px]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)] focus-visible:ring-offset-[-1px]',
                            tab.disabled && 'opacity-40 cursor-not-allowed'
                        )}
                        style={{
                            color: activeTab === tab.id ? 'var(--secondary)' : 'var(--on-surface-variant)',
                            borderBottomColor: activeTab === tab.id ? 'var(--secondary)' : 'transparent',
                            backgroundColor: 'transparent',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="p-4 sm:p-6">
                {activeContent}
            </div>
        </div>
    );
}
