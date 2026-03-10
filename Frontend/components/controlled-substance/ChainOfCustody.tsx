"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Plus, FileText, Download, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/format';

export interface CustodyEntry {
  id: string;
  timestamp: Date;
  action: 'RECEIVED' | 'TRANSFERRED' | 'STORED' | 'SHIPPED' | 'DESTROYED';
  fromPerson: {
    name: string;
    deaNumber?: string;
    signature: string;
  };
  toPerson: {
    name: string;
    deaNumber?: string;
    signature: string;
  };
  witness?: {
    name: string;
    signature: string;
  };
  items: {
    ndc: string;
    productName: string;
    quantity: number;
    lotNumber: string;
    deaSchedule: string;
  }[];
  location: string;
  notes?: string;
  documentation: string[];
}

interface ChainOfCustodyTrackerProps {
  returnId: string;
  items?: CustodyEntry['items'];
}

export function ChainOfCustodyTracker({ returnId, items = [] }: ChainOfCustodyTrackerProps) {
  const [entries, setEntries] = useState<CustodyEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<Partial<CustodyEntry>>({
    action: 'RECEIVED',
    items: items,
    location: '',
  });

  const addCustodyEntry = () => {
    if (!currentEntry.fromPerson?.name || !currentEntry.toPerson?.name) {
      alert('Please fill in all required fields');
      return;
    }

    const newEntry: CustodyEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      action: currentEntry.action || 'RECEIVED',
      fromPerson: currentEntry.fromPerson!,
      toPerson: currentEntry.toPerson!,
      witness: currentEntry.witness,
      items: currentEntry.items || [],
      location: currentEntry.location || '',
      notes: currentEntry.notes,
      documentation: currentEntry.documentation || [],
    };

    setEntries([...entries, newEntry]);
    setCurrentEntry({
      action: 'RECEIVED',
      items: items,
      location: '',
    });
    setShowForm(false);
  };

  const generateDEAForm41 = () => {
    const destroyedItems = entries
      .filter(e => e.action === 'DESTROYED')
      .flatMap(e => e.items);

    if (destroyedItems.length === 0) {
      alert('No destroyed items found. Add destruction entries first.');
      return;
    }

    // In production, this would generate a PDF
    const formData = {
      registrantInfo: {
        // Would be populated from user/client data
      },
      substancesDestroyed: destroyedItems,
      methodOfDestruction: 'INCINERATION',
      dateOfDestruction: new Date(),
      witnesses: entries
        .filter(e => e.action === 'DESTROYED')
        .map(e => e.witness)
        .filter(Boolean),
    };

    console.log('DEA Form 41 Data:', formData);
    alert('DEA Form 41 would be generated here. In production, this would download a PDF.');
  };

  const getActionColor = (action: CustodyEntry['action']) => {
    switch (action) {
      case 'RECEIVED':
        return 'bg-blue-500';
      case 'TRANSFERRED':
        return 'bg-yellow-500';
      case 'STORED':
        return 'bg-green-500';
      case 'SHIPPED':
        return 'bg-purple-500';
      case 'DESTROYED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chain of Custody</CardTitle>
            <CardDescription>
              Track controlled substance handling and transfers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateDEAForm41}>
              <FileText className="mr-2 h-4 w-4" />
              Generate DEA Form 41
            </Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Entry Form */}
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold">New Custody Entry</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <select
                value={currentEntry.action}
                onChange={(e) => setCurrentEntry({ ...currentEntry, action: e.target.value as CustodyEntry['action'] })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="RECEIVED">Received</option>
                <option value="TRANSFERRED">Transferred</option>
                <option value="STORED">Stored</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DESTROYED">Destroyed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">From Person</label>
                <Input
                  value={currentEntry.fromPerson?.name || ''}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    fromPerson: { ...currentEntry.fromPerson, name: e.target.value, signature: e.target.value }
                  })}
                  placeholder="Name"
                />
                <Input
                  value={currentEntry.fromPerson?.deaNumber || ''}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    fromPerson: { 
                      name: currentEntry.fromPerson?.name || '', 
                      signature: currentEntry.fromPerson?.signature || '',
                      deaNumber: e.target.value 
                    }
                  })}
                  placeholder="DEA Number (if applicable)"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">To Person</label>
                <Input
                  value={currentEntry.toPerson?.name || ''}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    toPerson: { ...currentEntry.toPerson, name: e.target.value, signature: e.target.value }
                  })}
                  placeholder="Name"
                />
                <Input
                  value={currentEntry.toPerson?.deaNumber || ''}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    toPerson: { 
                      name: currentEntry.toPerson?.name || '', 
                      signature: currentEntry.toPerson?.signature || '',
                      deaNumber: e.target.value 
                    }
                  })}
                  placeholder="DEA Number (if applicable)"
                  className="mt-2"
                />
              </div>
            </div>

            {(currentEntry.action === 'DESTROYED' || currentEntry.action === 'TRANSFERRED') && (
              <div>
                <label className="block text-sm font-medium mb-2">Witness</label>
                <Input
                  value={currentEntry.witness?.name || ''}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    witness: { name: e.target.value, signature: e.target.value }
                  })}
                  placeholder="Witness Name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                value={currentEntry.location}
                onChange={(e) => setCurrentEntry({ ...currentEntry, location: e.target.value })}
                placeholder="Storage location or facility"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={currentEntry.notes || ''}
                onChange={(e) => setCurrentEntry({ ...currentEntry, notes: e.target.value })}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border rounded-md min-h-[80px]"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={addCustodyEntry}>Add Entry</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Timeline View */}
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No custody entries yet. Add an entry to start tracking.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            {entries.map((entry, index) => (
              <div key={entry.id} className="relative flex items-start mb-6">
                <div className={`absolute left-4 w-3 h-3 rounded-full ${getActionColor(entry.action)} -translate-x-1/2 z-10`}></div>
                
                <div className="ml-8 flex-1">
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getActionColor(entry.action)}>
                            {entry.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(entry.timestamp.toISOString())}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{entry.location}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">From:</p>
                        <p className="font-medium">{entry.fromPerson.name}</p>
                        {entry.fromPerson.deaNumber && (
                          <p className="text-xs text-muted-foreground">DEA: {entry.fromPerson.deaNumber}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">To:</p>
                        <p className="font-medium">{entry.toPerson.name}</p>
                        {entry.toPerson.deaNumber && (
                          <p className="text-xs text-muted-foreground">DEA: {entry.toPerson.deaNumber}</p>
                        )}
                      </div>
                    </div>

                    {entry.witness && (
                      <div className="mt-2 text-sm">
                        <p className="text-muted-foreground">Witness:</p>
                        <p className="font-medium">{entry.witness.name}</p>
                      </div>
                    )}

                    {entry.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Items:</p>
                        <div className="space-y-1">
                          {entry.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              {item.productName} - Qty: {item.quantity} - Lot: {item.lotNumber}
                              {item.deaSchedule && (
                                <Badge variant="error" className="ml-2 text-xs">
                                  {item.deaSchedule}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {entry.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm text-muted-foreground italic">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

