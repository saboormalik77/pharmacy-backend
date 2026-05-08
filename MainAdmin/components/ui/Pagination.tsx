'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    siblingCount?: number;
    className?: string;
}

function getPageNumbers(current: number, total: number, sibling: number): (number | '...')[] {
    const range = (start: number, end: number) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const totalNumbers = sibling * 2 + 5;
    const totalBlocks = totalNumbers + 2;

    if (total <= totalBlocks) {
        return range(1, total);
    }

    const leftSibling = Math.max(current - sibling, 1);
    const rightSibling = Math.min(current + sibling, total);

    const showLeftDots = leftSibling > 3;
    const showRightDots = rightSibling < total - 2;

    if (!showLeftDots && showRightDots) {
        const left = range(1, 4);
        return [...left, '...', ...range(total - 2, total)];
    }

    if (showLeftDots && !showRightDots) {
        const right = range(total - 2, total);
        return [...range(1, 4), '...', ...right];
    }

    const middle = range(leftSibling, rightSibling);
    return [1, '...', ...middle, '...', total];
}

export function Pagination({ currentPage, totalPages, onPageChange, siblingCount = 1, className }: PaginationProps) {
    const pages = getPageNumbers(currentPage, totalPages, siblingCount);

    if (totalPages <= 1) return null;

    return (
        <div className={cn('flex items-center justify-between', className)}>
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Page <span className="font-medium" style={{ color: 'var(--on-surface)' }}>{currentPage}</span> of{' '}
                <span className="font-medium" style={{ color: 'var(--on-surface)' }}>{totalPages}</span>
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={cn(
                        'p-2 rounded-[4px] transition-colors',
                        'border border-[var(--outline-variant)]',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        'hover:bg-white',
                        currentPage === 1 ? '' : 'hover:border-[var(--primary)]'
                    )}
                    style={{ color: currentPage === 1 ? 'var(--on-surface-variant)' : 'var(--on-surface)' }}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {pages.map((page, idx) =>
                    page === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                            ...
                        </span>
                    ) : (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page as number)}
                            className={cn(
                                'min-w-[36px] h-9 px-2 rounded-[4px] text-sm font-medium transition-colors',
                                'border border-[var(--outline-variant)]',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)] focus-visible:ring-offset-1'
                            )}
                            style={
                                currentPage === page
                                    ? { backgroundColor: 'var(--secondary)', color: 'var(--on-secondary)', borderColor: 'var(--secondary)' }
                                    : { color: 'var(--on-surface)', backgroundColor: 'transparent', borderColor: 'var(--outline-variant)' }
                            }
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={cn(
                        'p-2 rounded-[4px] transition-colors',
                        'border border-[var(--outline-variant)]',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        'hover:bg-white',
                        currentPage === totalPages ? '' : 'hover:border-[var(--primary)]'
                    )}
                    style={{ color: currentPage === totalPages ? 'var(--on-surface-variant)' : 'var(--on-surface)' }}
                    aria-label="Next page"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
