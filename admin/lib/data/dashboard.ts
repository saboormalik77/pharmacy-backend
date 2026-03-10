import { DashboardStats } from '../types';

export const dashboardStats: DashboardStats = {
    totalPharmacies: 248,
    activeDistributors: 45,
    pendingDocuments: 23,
    returnsValue: 2456890,
    pharmaciesChange: 12.5,
    distributorsChange: 8.2,
    documentsChange: -5.3,
    returnsChange: 15.8,
};

export const recentActivity = [
    {
        id: 1,
        type: 'pharmacy',
        message: 'New pharmacy registration: HealthPlus Pharmacy',
        time: '5 minutes ago',
    },
    {
        id: 2,
        type: 'document',
        message: 'Return receipt DOC-1025 approved',
        time: '15 minutes ago',
    },
    {
        id: 3,
        type: 'payment',
        message: 'Payment PAY-5010 processed successfully',
        time: '1 hour ago',
    },
    {
        id: 4,
        type: 'shipment',
        message: 'Shipment SH-1245 delivered',
        time: '2 hours ago',
    },
    {
        id: 5,
        type: 'deal',
        message: 'New marketplace deal posted: Ibuprofen 200mg',
        time: '3 hours ago',
    },
];
