'use client';

import type { ReportItem } from '@/lib/api/services';
import {
  formatCurrency,
  formatDeaColumn,
  formatExp,
  formatFull,
  formatPartial,
  formatPartialPct,
  formatReturnCode,
  getItemName,
} from './ReportLayout';

// ═══════════════════════════════════════════════════════════════
// Return Code Legend (shared by both destruction reports)
//   (X) Expired   (D) Damaged   (O) Overstock   (R) Recalled
// ═══════════════════════════════════════════════════════════════
export function ReturnCodeLegend() {
  return (
    <div className="mt-3 mb-3 border border-gray-300 rounded px-3 py-2 text-[11px]">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
        Reason For Return (See Codes Listed Below)
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        <div>
          <span className="font-bold">(X)</span> Expired
        </div>
        <div>
          <span className="font-bold">(D)</span> Damaged
        </div>
        <div>
          <span className="font-bold">(O)</span> Overstock
        </div>
        <div>
          <span className="font-bold">(R)</span> Recalled
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Wide PDF-style destruction items table.
// Columns (matches Controls.pdf / Non Controls.pdf exactly):
//   NDC/LIST# | % | FULL | PART | PKG SIZE | CASE SIZE |
//   PRODUCT DESCRIPTION | UNITS REC'VD | DEA CLASS |
//   LOT # | EXP DATE | RETURN CODE | VALUE
// ═══════════════════════════════════════════════════════════════
export function DestructionItemsTable({
  items,
  isControls,
}: {
  items: ReportItem[];
  isControls: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-10 border rounded-lg">
        {isControls
          ? 'No controlled-substance destruction items for this reference number.'
          : 'No non-controlled destruction items for this reference number.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-1 py-1 text-left font-bold">
              NDC/LIST #
            </th>
            <th className="border border-gray-400 px-1 py-1 text-right font-bold">
              %
            </th>
            <th className="border border-gray-400 px-1 py-1 text-right font-bold">
              FULL
            </th>
            <th className="border border-gray-400 px-1 py-1 text-right font-bold">
              PART
            </th>
            <th className="border border-gray-400 px-1 py-1 text-right font-bold">
              PKG SIZE
            </th>
            <th className="border border-gray-400 px-1 py-1 text-right font-bold">
              CASE SIZE
            </th>
            <th className="border border-gray-400 px-1 py-1 text-left font-bold">
              PRODUCT DESCRIPTION
            </th>
            <th className="border border-gray-400 px-1 py-1 text-center font-bold">
              UNITS REC'VD
            </th>
            <th className="border border-gray-400 px-1 py-1 text-center font-bold">
              DEA CLASS
            </th>
            <th className="border border-gray-400 px-1 py-1 text-left font-bold">
              LOT #
            </th>
            <th className="border border-gray-400 px-1 py-1 text-left font-bold">
              EXP DATE
            </th>
            <th className="border border-gray-400 px-1 py-1 text-center font-bold">
              RETURN CODE
            </th>
            <th className="border border-gray-400 px-1 py-1 text-right font-bold">
              VALUE
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="border border-gray-300 px-1 py-1 font-mono">
                {it.ndc || '—'}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right">
                {formatPartialPct(it)}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right">
                {formatFull(it)}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right">
                {formatPartial(it)}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right">
                {it.fullPackageSize ?? '—'}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right">
                1
              </td>
              <td className="border border-gray-300 px-1 py-1">
                {getItemName(it)}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-center">
                _______
              </td>
              <td className="border border-gray-300 px-1 py-1 text-center font-semibold">
                {formatDeaColumn(it)}
              </td>
              <td className="border border-gray-300 px-1 py-1 font-mono">
                {it.lotNumber || '—'}
              </td>
              <td className="border border-gray-300 px-1 py-1">
                {formatExp(it.expirationDate)}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-center font-semibold">
                {formatReturnCode(it) || 'X'}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right font-semibold">
                {formatCurrency(Number(it.estimatedValue ?? 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Footer block: TOTAL VALUE + destruction dates (Date Received,
// Date Shipped, Date Destroyed, etc.)
// ═══════════════════════════════════════════════════════════════
export function DestructionFooter({
  receivedAt,
  verifiedAt,
  shippedAt,
  destroyedAt,
  totalValue,
  totalItems,
  isControls,
}: {
  receivedAt?: string;
  verifiedAt?: string;
  shippedAt?: string;
  destroyedAt?: string;
  totalValue: number;
  totalItems: number;
  isControls: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between bg-gray-50 border-t-2 border-b-2 border-gray-800 px-2 py-1.5">
        <div className="text-[11px] font-semibold">
          Total items: {totalItems}
        </div>
        <div className="text-[11px]">
          <span className="text-gray-500 mr-1">TOTAL VALUE:</span>
          <span className="font-bold text-sm">
            {formatCurrency(Number(totalValue))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] mt-3">
        <DateCard label="Date Received" value={receivedAt} />
        <DateCard label="Date Shipped" value={shippedAt} />
        <DateCard label="Date Destroyed" value={destroyedAt} />
      </div>

      {isControls && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] mt-3">
          <DateCard label="Bin #" value="0" />
          <DateCard label="Verified At" value={verifiedAt} />
          <DateCard label="Classification" value="CII–CV Controls" />
        </div>
      )}
    </div>
  );
}

function DateCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="border border-gray-300 rounded px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </div>
      <div className="font-semibold">{value || '—'}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3-slot signature block (Destroyed By / Witnessed By / Date)
// ═══════════════════════════════════════════════════════════════
export function DestructionSignatureBlock() {
  return (
    <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px]">
      <div>
        <div className="h-10 border-b border-gray-400" />
        <div className="mt-1 text-gray-600">Destroyed By</div>
      </div>
      <div>
        <div className="h-10 border-b border-gray-400" />
        <div className="mt-1 text-gray-600">Witnessed By</div>
      </div>
      <div>
        <div className="h-10 border-b border-gray-400" />
        <div className="mt-1 text-gray-600">Date</div>
      </div>
    </div>
  );
}
