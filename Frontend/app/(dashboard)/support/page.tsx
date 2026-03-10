"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  HelpCircle, 
  MessageSquare, 
  FileText, 
  Send, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Ticket,
  User,
  Calendar
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/format';
import Link from 'next/link';

interface SupportTicket {
  id: string;
  subject: string;
  category: 'technical' | 'billing' | 'account' | 'returns' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  description: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  messages: TicketMessage[];
  relatedReturnId?: string;
}

interface TicketMessage {
  id: string;
  sender: string;
  senderType: 'user' | 'support';
  message: string;
  createdAt: string;
  attachments?: string[];
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'tickets'>('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SupportTicket['status']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | SupportTicket['category']>('all');

  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'other' as SupportTicket['category'],
    priority: 'medium' as SupportTicket['priority'],
    description: '',
    relatedReturnId: '',
  });

  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'TICKET-001',
      subject: 'Payment not received for Return RET-2024-001',
      category: 'billing',
      priority: 'high',
      status: 'in_progress',
      description: 'I submitted a return two weeks ago but haven\'t received payment yet. The return status shows completed.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: 'Support Team',
      relatedReturnId: 'RET-2024-001',
      messages: [
        {
          id: 'msg-1',
          sender: 'John Smith',
          senderType: 'user',
          message: 'I submitted a return two weeks ago but haven\'t received payment yet.',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'msg-2',
          sender: 'Support Team',
          senderType: 'support',
          message: 'Thank you for contacting us. We\'re looking into this issue and will update you within 24 hours.',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: 'TICKET-002',
      subject: 'Unable to create return with barcode scanner',
      category: 'technical',
      priority: 'medium',
      status: 'open',
      description: 'The barcode scanner feature is not working when I try to create a new return.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      messages: [
        {
          id: 'msg-3',
          sender: 'John Smith',
          senderType: 'user',
          message: 'The barcode scanner feature is not working when I try to create a new return.',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: 'TICKET-003',
      subject: 'Account access issue',
      category: 'account',
      priority: 'urgent',
      status: 'resolved',
      description: 'I cannot log into my account. Getting authentication error.',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: 'Support Team',
      messages: [
        {
          id: 'msg-4',
          sender: 'John Smith',
          senderType: 'user',
          message: 'I cannot log into my account. Getting authentication error.',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'msg-5',
          sender: 'Support Team',
          senderType: 'support',
          message: 'We\'ve reset your password. Please check your email for the reset link.',
          createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'msg-6',
          sender: 'John Smith',
          senderType: 'user',
          message: 'Thank you! I was able to reset my password and log in successfully.',
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    },
  ]);

  const handleCreateTicket = () => {
    if (!newTicket.subject || !newTicket.description) {
      alert('Please fill in subject and description');
      return;
    }

    const ticket: SupportTicket = {
      id: `TICKET-${String(tickets.length + 1).padStart(3, '0')}`,
      subject: newTicket.subject,
      category: newTicket.category,
      priority: newTicket.priority,
      status: 'open',
      description: newTicket.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedReturnId: newTicket.relatedReturnId || undefined,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'John Smith',
          senderType: 'user',
          message: newTicket.description,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    setTickets([ticket, ...tickets]);
    setNewTicket({
      subject: '',
      category: 'other',
      priority: 'medium',
      description: '',
      relatedReturnId: '',
    });
    setActiveTab('tickets');
    alert('Support ticket created successfully!');
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchQuery ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusVariant = (status: SupportTicket['status']) => {
    switch (status) {
      case 'resolved':
      case 'closed': return 'success';
      case 'in_progress': return 'info';
      case 'open': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-700 border-green-300';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'open': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryColor = (category: SupportTicket['category']) => {
    switch (category) {
      case 'technical': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'billing': return 'bg-green-100 text-green-700 border-green-300';
      case 'account': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'returns': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getCategoryLabel = (category: SupportTicket['category']) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const statusCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Colorful Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border-2 border-cyan-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100">
              <HelpCircle className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Support Center</h1>
              <p className="text-xs text-gray-600 mt-0.5">Get help with your account, returns, and payments</p>
            </div>
          </div>
          <Button onClick={() => setActiveTab('create')} className="bg-cyan-600 hover:bg-cyan-700 text-white border-0">
            <Plus className="mr-1 h-3 w-3" />
            New Ticket
          </Button>
        </div>

        {/* Colorful Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 'tickets'
                ? 'bg-cyan-100 text-cyan-700 border-cyan-300 shadow-md scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            My Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
              activeTab === 'create'
                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-md scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Create Ticket
          </button>
        </div>

        {/* Create Ticket Tab */}
        {activeTab === 'create' && (
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-100">
                  <Ticket className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Create Support Ticket</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="Brief description of your issue"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Category</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as any })}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    >
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing & Payments</option>
                      <option value="account">Account Access</option>
                      <option value="returns">Returns & Credits</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Priority</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Please provide detailed information about your issue..."
                    className="w-full px-2 py-1.5 border rounded text-xs min-h-[100px] resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">Related Return ID (Optional)</label>
                  <Input
                    value={newTicket.relatedReturnId}
                    onChange={(e) => setNewTicket({ ...newTicket, relatedReturnId: e.target.value })}
                    placeholder="RET-2024-001"
                    className="text-xs"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    If this ticket is related to a specific return, enter the return ID
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCreateTicket} className="bg-blue-600 hover:bg-blue-700 text-white border-0" size="sm">
                    <Send className="mr-1 h-3 w-3" />
                    Submit Ticket
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('tickets')}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tickets List Tab */}
        {activeTab === 'tickets' && (
          <>
            {/* Colorful Filters */}
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-cyan-500" />
                    <Input placeholder="Search tickets..." className="pl-7 h-7 text-xs border-cyan-200 focus:border-cyan-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="h-7 px-2 text-xs border rounded border-cyan-200"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    className="h-7 px-2 text-xs border rounded border-cyan-200"
                  >
                    <option value="all">All Categories</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="account">Account</option>
                    <option value="returns">Returns</option>
                    <option value="other">Other</option>
                  </select>
                  <Button variant="outline" size="sm" className="h-7 text-xs border-gray-300 hover:bg-gray-100" onClick={() => { setFilterStatus('all'); setFilterCategory('all'); setSearchQuery(''); }}>
                    <Filter className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Colorful Status Tabs */}
            <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
              {[
                { label: 'All', value: 'all', count: statusCounts.all, color: 'bg-gray-100 text-gray-700 border-gray-300' },
                { label: 'Open', value: 'open', count: statusCounts.open, color: 'bg-orange-100 text-orange-700 border-orange-300' },
                { label: 'In Progress', value: 'in_progress', count: statusCounts.in_progress, color: 'bg-blue-100 text-blue-700 border-blue-300' },
                { label: 'Resolved', value: 'resolved', count: statusCounts.resolved, color: 'bg-green-100 text-green-700 border-green-300' },
                { label: 'Closed', value: 'closed', count: statusCounts.closed, color: 'bg-gray-100 text-gray-700 border-gray-300' },
              ].map((tab) => {
                const isActive = (tab.value === 'all' && filterStatus === 'all') || filterStatus === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setFilterStatus(tab.value === 'all' ? 'all' : tab.value as any)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                      isActive
                        ? `${tab.color} shadow-md scale-105`
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label} <span className={`font-bold ${isActive ? '' : 'text-gray-400'}`}>({tab.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Colorful Table */}
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardContent className="p-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-cyan-100 to-blue-100 border-b-2 border-cyan-200">
                        <th className="text-left p-2 font-bold text-cyan-900">Ticket ID</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Subject</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Category</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Priority</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Status</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Messages</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Assigned To</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Created</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Updated</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Related Return</th>
                        <th className="text-left p-2 font-bold text-cyan-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.length === 0 ? (
                        <tr><td colSpan={11} className="p-4 text-center text-gray-500 text-sm bg-gray-50">No tickets found</td></tr>
                      ) : (
                        filteredTickets.map((ticket, idx) => (
                          <tr key={ticket.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-cyan-50 transition-colors`}>
                            <td className="p-2 font-semibold text-cyan-700">{ticket.id}</td>
                            <td className="p-2 font-medium text-gray-900">{ticket.subject}</td>
                            <td className="p-2">
                              <Badge className={`text-xs border-2 ${getCategoryColor(ticket.category)}`}>
                                {getCategoryLabel(ticket.category)}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Badge className={`text-xs border-2 ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant={getStatusVariant(ticket.status)} className={`text-xs border-2 ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 font-medium">
                                {ticket.messages.length}
                              </span>
                            </td>
                            <td className="p-2 text-gray-700">{ticket.assignedTo || '-'}</td>
                            <td className="p-2 text-gray-600">{formatDateTime(ticket.createdAt)}</td>
                            <td className="p-2 text-gray-600">{formatDateTime(ticket.updatedAt)}</td>
                            <td className="p-2">
                              {ticket.relatedReturnId ? (
                                <Link href={`/returns/${ticket.relatedReturnId}`} className="font-mono text-blue-700 hover:underline">
                                  {ticket.relatedReturnId}
                                </Link>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2">
                              <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-cyan-300 text-cyan-700 hover:bg-cyan-50">
                                <FileText className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Colorful Help Resources */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-cyan-100">
                      <HelpCircle className="h-4 w-4 text-cyan-600" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-900">Knowledge Base</h3>
                  </div>
                  <p className="text-xs text-gray-600">Browse articles and tutorials</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-blue-100">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-900">Documentation</h3>
                  </div>
                  <p className="text-xs text-gray-600">User guides and API docs</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-900">Live Chat</h3>
                  </div>
                  <p className="text-xs text-gray-600">Chat with our support team</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
