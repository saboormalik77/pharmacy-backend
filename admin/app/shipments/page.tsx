'use client';

import { useState } from 'react';
import { Search, Eye, MapPin, Package, FileText, Edit, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

const initialShipments = [
    { id: 'SH-1234', pharmacy: 'HealthFirst Pharmacy', distributor: 'MediSupply Corp', pickupDate: '2024-12-15', estimatedDelivery: '2024-12-18', status: 'in_transit', items: 45, value: 15850.00, trackingNumber: 'TRK-1234567890', carrier: 'FedEx', notes: 'Handle with care - contains fragile items' },
    { id: 'SH-1235', pharmacy: 'City Care Pharmacy', distributor: 'PharmaDistribute Inc', pickupDate: '2024-12-14', estimatedDelivery: '2024-12-17', status: 'picked_up', items: 32, value: 8420.50, trackingNumber: 'TRK-1234567891', carrier: 'UPS', notes: 'Temperature controlled shipment' },
    { id: 'SH-1236', pharmacy: 'MedPlus Pharmacy', distributor: 'HealthWholesale LLC', pickupDate: '2024-12-13', estimatedDelivery: '2024-12-16', status: 'delivered', items: 28, value: 12680.00, trackingNumber: 'TRK-1234567892', carrier: 'DHL', notes: 'Delivered on time', deliveredDate: '2024-12-16', receivedBy: 'John Smith' },
    { id: 'SH-1237', pharmacy: 'QuickMed Pharmacy', distributor: 'MediSupply Corp', pickupDate: '2024-12-12', estimatedDelivery: '2024-12-15', status: 'delivered', items: 18, value: 9340.75, trackingNumber: 'TRK-1234567893', carrier: 'FedEx', notes: 'All items verified', deliveredDate: '2024-12-15', receivedBy: 'Sarah Johnson' },
    { id: 'SH-1238', pharmacy: 'HealthFirst Pharmacy', distributor: 'PharmaDistribute Inc', pickupDate: '2024-12-10', estimatedDelivery: '2024-12-13', status: 'pending', items: 25, value: 11200.00, trackingNumber: 'TRK-1234567894', carrier: 'UPS', notes: 'Awaiting pickup confirmation' },
];

type Shipment = typeof initialShipments[0];

const trackingSteps = [
    { status: 'pending', label: 'Pending Pickup', location: 'Pharmacy', date: '' },
    { status: 'picked_up', label: 'Picked Up', location: 'In Transit', date: '' },
    { status: 'in_transit', label: 'In Transit', location: 'Distribution Center', date: '' },
    { status: 'delivered', label: 'Delivered', location: 'Distributor', date: '' },
];

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState(initialShipments);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [viewModal, setViewModal] = useState<Shipment | null>(null);
    const [updateStatusModal, setUpdateStatusModal] = useState<Shipment | null>(null);
    const [receiptModal, setReceiptModal] = useState<Shipment | null>(null);

    const filteredShipments = shipments.filter(shipment => {
        const matchesSearch = shipment.pharmacy.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shipment.distributor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shipment.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'delivered': return 'success';
            case 'in_transit': return 'info';
            case 'picked_up': return 'secondary';
            case 'pending': return 'warning';
            case 'cancelled': return 'danger';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleTrack = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setShowTrackingModal(true);
    };

    const handleUpdateStatus = (shipment: Shipment, newStatus: string) => {
        setShipments(prev => prev.map(s =>
            s.id === shipment.id ? { ...s, status: newStatus } : s
        ));
        setUpdateStatusModal(null);
    };

    const getStepStatus = (stepStatus: string, currentStatus: string) => {
        const statusOrder = ['pending', 'picked_up', 'in_transit', 'delivered'];
        const stepIndex = statusOrder.indexOf(stepStatus);
        const currentIndex = statusOrder.indexOf(currentStatus);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'upcoming';
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
                <p className="text-gray-600 mt-1">Track and manage pharmaceutical return shipments</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Total Shipments</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{shipments.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">In Transit</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{shipments.filter(s => s.status === 'in_transit').length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{shipments.filter(s => s.status === 'delivered').length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(shipments.reduce((sum, s) => sum + s.value, 0))}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search shipments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="picked_up">Picked Up</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipment ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacy</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Delivery</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredShipments.map((shipment) => (
                                <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{shipment.id}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.pharmacy}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{shipment.distributor}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{shipment.pickupDate}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{shipment.estimatedDelivery}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{shipment.items}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(shipment.value)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <Badge variant={getStatusVariant(shipment.status)}>{getStatusLabel(shipment.status)}</Badge>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setViewModal(shipment)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleTrack(shipment)}
                                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                title="Track Shipment"
                                            >
                                                <MapPin className="w-4 h-4" />
                                            </button>
                                            {shipment.status !== 'delivered' && (
                                                <button
                                                    onClick={() => setUpdateStatusModal(shipment)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                    title="Update Status"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            {shipment.status === 'delivered' && (
                                                <button
                                                    onClick={() => setReceiptModal(shipment)}
                                                    className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                                    title="View Receipt"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredShipments.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No shipments found</p>
                    </div>
                )}
            </div>

            {/* Tracking Modal */}
            {showTrackingModal && selectedShipment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Track Shipment</h3>
                                <p className="text-sm text-gray-600 mt-1">{selectedShipment.id}</p>
                            </div>
                            <button
                                onClick={() => setShowTrackingModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">From</p>
                                    <p className="font-medium text-gray-900">{selectedShipment.pharmacy}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">To</p>
                                    <p className="font-medium text-gray-900">{selectedShipment.distributor}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Items</p>
                                    <p className="font-medium text-gray-900">{selectedShipment.items} items</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Value</p>
                                    <p className="font-medium text-gray-900">{formatCurrency(selectedShipment.value)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {trackingSteps.map((step, index) => {
                                const stepState = getStepStatus(step.status, selectedShipment.status);
                                return (
                                    <div key={step.status} className="flex items-start gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stepState === 'completed' ? 'bg-green-500 text-white' :
                                                stepState === 'current' ? 'bg-blue-500 text-white' :
                                                    'bg-gray-200 text-gray-400'
                                                }`}>
                                                {stepState === 'completed' ? '✓' : index + 1}
                                            </div>
                                            {index < trackingSteps.length - 1 && (
                                                <div className={`w-0.5 h-12 ${stepState === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                                                    }`} />
                                            )}
                                        </div>
                                        <div className="flex-1 pt-2">
                                            <p className={`font-medium ${stepState === 'completed' || stepState === 'current' ? 'text-gray-900' : 'text-gray-400'
                                                }`}>
                                                {step.label}
                                            </p>
                                            <p className="text-sm text-gray-600">{step.location}</p>
                                            {step.date && <p className="text-xs text-gray-500 mt-1">{step.date}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button variant="primary" onClick={() => setShowTrackingModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Shipment Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Shipment ID</label>
                                    <p className="text-gray-900 mt-1">{viewModal.id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                    <div className="mt-1">
                                        <Badge variant={getStatusVariant(viewModal.status)}>{getStatusLabel(viewModal.status)}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Pharmacy</label>
                                    <p className="text-gray-900 mt-1">{viewModal.pharmacy}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Distributor</label>
                                    <p className="text-gray-900 mt-1">{viewModal.distributor}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Tracking Number</label>
                                    <p className="text-gray-900 mt-1 font-mono">{viewModal.trackingNumber}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Carrier</label>
                                    <p className="text-gray-900 mt-1">{viewModal.carrier}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Pickup Date</label>
                                    <p className="text-gray-900 mt-1">{viewModal.pickupDate}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Estimated Delivery</label>
                                    <p className="text-gray-900 mt-1">{viewModal.estimatedDelivery}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Total Items</label>
                                    <p className="text-gray-900 mt-1">{viewModal.items} items</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Shipment Value</label>
                                    <p className="text-gray-900 font-semibold mt-1">{formatCurrency(viewModal.value)}</p>
                                </div>
                                {viewModal.deliveredDate && (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Delivered Date</label>
                                            <p className="text-gray-900 mt-1">{viewModal.deliveredDate}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Received By</label>
                                            <p className="text-gray-900 mt-1">{viewModal.receivedBy}</p>
                                        </div>
                                    </>
                                )}
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-gray-500">Notes</label>
                                    <p className="text-gray-900 mt-1">{viewModal.notes}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Status Modal */}
            {updateStatusModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Update Shipment Status</h2>
                            <button onClick={() => setUpdateStatusModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Shipment ID: <span className="font-medium text-gray-900">{updateStatusModal.id}</span>
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                                Current Status: <Badge variant={getStatusVariant(updateStatusModal.status)}>{getStatusLabel(updateStatusModal.status)}</Badge>
                            </p>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select New Status</label>
                            <div className="space-y-2">
                                {updateStatusModal.status === 'pending' && (
                                    <Button
                                        variant="primary"
                                        className="w-full justify-start"
                                        onClick={() => handleUpdateStatus(updateStatusModal, 'picked_up')}
                                    >
                                        Mark as Picked Up
                                    </Button>
                                )}
                                {updateStatusModal.status === 'picked_up' && (
                                    <Button
                                        variant="primary"
                                        className="w-full justify-start"
                                        onClick={() => handleUpdateStatus(updateStatusModal, 'in_transit')}
                                    >
                                        Mark as In Transit
                                    </Button>
                                )}
                                {updateStatusModal.status === 'in_transit' && (
                                    <Button
                                        variant="success"
                                        className="w-full justify-start"
                                        onClick={() => handleUpdateStatus(updateStatusModal, 'delivered')}
                                    >
                                        Mark as Delivered
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setUpdateStatusModal(null)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Delivery Receipt</h2>
                            <button onClick={() => setReceiptModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Receipt Header */}
                            <div className="text-center pb-6 border-b border-gray-200">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">PharmAdmin</h3>
                                <p className="text-sm text-gray-600">Pharmaceutical Returns Management</p>
                                <p className="text-xs text-gray-500 mt-1">Delivery Confirmation Receipt</p>
                            </div>

                            {/* Shipment Info */}
                            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-200">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Shipment ID</label>
                                    <p className="text-sm font-mono font-semibold text-gray-900 mt-1">{receiptModal.id}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Tracking Number</label>
                                    <p className="text-sm font-mono text-gray-900 mt-1">{receiptModal.trackingNumber}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Carrier</label>
                                    <p className="text-sm text-gray-900 mt-1">{receiptModal.carrier}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Delivered Date</label>
                                    <p className="text-sm text-gray-900 mt-1">{receiptModal.deliveredDate}</p>
                                </div>
                            </div>

                            {/* From/To */}
                            <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-200">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">From (Pharmacy)</label>
                                    <p className="text-sm font-semibold text-gray-900">{receiptModal.pharmacy}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">To (Distributor)</label>
                                    <p className="text-sm font-semibold text-gray-900">{receiptModal.distributor}</p>
                                </div>
                            </div>

                            {/* Shipment Details */}
                            <div className="space-y-3 pb-6 border-b border-gray-200">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Items:</span>
                                    <span className="text-sm font-medium text-gray-900">{receiptModal.items} items</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Shipment Value:</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(receiptModal.value)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Received By:</span>
                                    <span className="text-sm font-medium text-gray-900">{receiptModal.receivedBy}</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase block mb-2">Delivery Notes</label>
                                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{receiptModal.notes}</p>
                            </div>

                            {/* Signature/Confirmation */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-700">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">Delivery Confirmed</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setReceiptModal(null)}>Close</Button>
                            <Button variant="primary">Download PDF</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
