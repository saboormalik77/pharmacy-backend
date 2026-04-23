'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
    CalendarClock,
    ArrowLeft,
    AlertCircle,
    Loader2,
    MapPin,
    Phone,
    Mail,
    Building2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { processorScheduleServiceRequest, fetchServiceRequests } from '@/lib/store/serviceRequestsSlice';
import { ServiceRequest } from '@/lib/store/serviceRequestsSlice';

export default function ScheduleServiceRequestPage() {
    const router = useRouter();
    const params = useParams();
    const dispatch = useAppDispatch();
    
    const { items: serviceRequests, isActing: isScheduling } = useAppSelector(state => state.serviceRequests);
    
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const [err, setErr] = useState('');
    const [request, setRequest] = useState<ServiceRequest | null>(null);

    const today = new Date().toISOString().slice(0, 10);

    // Find the service request
    useEffect(() => {
        if (params?.id && serviceRequests.length > 0) {
            const foundRequest = serviceRequests.find(r => r.id === params.id);
            if (foundRequest) {
                setRequest(foundRequest);
                // Pre-fill with existing scheduled date if rescheduling
                if (foundRequest.scheduled_date) {
                    setDate(foundRequest.scheduled_date.slice(0, 10));
                }
            } else {
                // Request not found in current list, might need to fetch
                setErr('Service request not found');
            }
        }
    }, [params?.id, serviceRequests]);

    // Load service requests if not loaded
    useEffect(() => {
        if (serviceRequests.length === 0) {
            dispatch(fetchServiceRequests({ page: 1, limit: 100 }));
        }
    }, [dispatch, serviceRequests.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr('');
        
        if (!date) {
            setErr('Please select a visit date');
            return;
        }
        
        if (!request) {
            setErr('Service request not found');
            return;
        }

        try {
            await dispatch(processorScheduleServiceRequest({
                id: request.id,
                scheduledDate: date,
                notes: notes.trim() || null,
            })).unwrap();
            
            router.push('/service-requests');
        } catch (error: any) {
            setErr(error.message || 'Failed to schedule visit');
        }
    };

    if (!request && !err) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    <p className="text-sm text-muted-foreground">Loading service request...</p>
                </div>
            </div>
        );
    }

    if (err && !request) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error</h2>
                <p className="text-gray-600 mb-4">{err}</p>
                <Button 
                    variant="outline" 
                    onClick={() => router.push('/service-requests')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Service Requests
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/service-requests')}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Service Requests
                        </Button>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarClock className="w-6 h-6 text-teal-600" />
                        {request?.status === 'scheduled' ? 'Reschedule Visit' : 'Schedule Visit'}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Schedule the on-site service visit for this pharmacy request.
                    </p>
                </div>
            </div>

            {/* Request Information */}
            {request && (
                <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-lg font-semibold mb-4">Request Details</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="flex items-center gap-2 font-medium text-gray-900 mb-1">
                                    <Building2 className="w-4 h-4" />
                                    Pharmacy
                                </div>
                                <div className="text-gray-600">
                                    {request.pharmacy_business_name || request.pharmacy_name || 'Unknown Pharmacy'}
                                </div>
                                {request.branch_name && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Branch: {request.branch_name}
                                    </div>
                                )}
                            </div>
                            
                            
                            <div>
                                <div className="font-medium text-gray-900 mb-1">Requested Date</div>
                                <div className="text-gray-600">
                                    {formatDate(request.requested_date)}
                                </div>
                            </div>
                            
                            <div>
                                <div className="font-medium text-gray-900 mb-1">Status</div>
                                <div className="capitalize">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        request.status === 'pending' 
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : request.status === 'scheduled'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {request.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {request.special_instructions && (
                            <div className="pt-4 border-t">
                                <div className="font-medium text-gray-900 mb-2">Special Instructions</div>
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                    {request.special_instructions}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Schedule Form */}
            <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Visit Schedule</h2>
                <div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Visit Date */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Visit Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                min={today}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            {request && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    Pharmacy requested: {formatDate(request.requested_date)}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Notes to pharmacy (optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={5}
                                maxLength={1000}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Anything the pharmacy should know..."
                            />
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                    Share any important details about the visit timing, parking, or special requirements.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {notes.length} / 1000 characters
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {err && (
                            <div className="flex items-center gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
                                <AlertCircle className="w-4 h-4" /> {err}
                            </div>
                        )}

                        {/* Submit Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => router.push('/service-requests')}
                                disabled={isScheduling}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isScheduling}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                {isScheduling ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Scheduling...
                                    </>
                                ) : (
                                    'Schedule Visit'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Info */}
            <div className="border border-teal-200 bg-teal-50/60 rounded-lg p-4">
                <div className="text-sm text-teal-900">
                    <strong>Note:</strong> Once you schedule this visit, the pharmacy will receive an email notification
                    with the confirmed date and any notes you've provided. The request will be marked as "scheduled" 
                    and removed from other processors' queues.
                </div>
            </div>
        </div>
    );
}