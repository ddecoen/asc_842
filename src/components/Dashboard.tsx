'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeaseData, JournalEntry } from '@/lib/types';
import LeaseForm from './LeaseForm';
import { Plus, Edit, Trash2, FileText, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { user, logout, getIdToken } = useAuth();
  const [leases, setLeases] = useState<LeaseData[]>([]);
  const [selectedLease, setSelectedLease] = useState<LeaseData | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeases();
  }, []);

  const fetchLeases = async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch('/api/leases', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeases(data.leases);
      } else {
        setError('Failed to fetch leases');
      }
    } catch (error) {
      setError('Error fetching leases');
    }
  };

  const fetchJournalEntries = async (leaseId: string) => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/journal-entries?leaseId=${leaseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJournalEntries(data.journalEntries);
      } else {
        setError('Failed to fetch journal entries');
      }
    } catch (error) {
      setError('Error fetching journal entries');
    }
  };

  const handleCreateLease = async (leaseData: Omit<LeaseData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/leases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(leaseData),
      });

      if (response.ok) {
        await fetchLeases();
        setShowLeaseForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create lease');
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLease = async (leaseData: Omit<LeaseData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!editingLease) return;
    
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/leases/${editingLease.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(leaseData),
      });

      if (response.ok) {
        await fetchLeases();
        setEditingLease(null);
        // Refresh journal entries if this lease is selected
        if (selectedLease?.id === editingLease.id) {
          await fetchJournalEntries(editingLease.id!);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lease');
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLease = async (leaseId: string) => {
    if (!confirm('Are you sure you want to delete this lease? This will also delete all associated journal entries.')) {
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch(`/api/leases/${leaseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchLeases();
        if (selectedLease?.id === leaseId) {
          setSelectedLease(null);
          setJournalEntries([]);
        }
      } else {
        setError('Failed to delete lease');
      }
    } catch (error) {
      setError('Error deleting lease');
    }
  };

  const handleViewJournalEntries = async (lease: LeaseData) => {
    setSelectedLease(lease);
    await fetchJournalEntries(lease.id!);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (showLeaseForm) {
    return (
      <div className="container mx-auto py-8">
        <LeaseForm
          onSubmit={handleCreateLease}
          onCancel={() => setShowLeaseForm(false)}
          loading={loading}
        />
      </div>
    );
  }

  if (editingLease) {
    return (
      <div className="container mx-auto py-8">
        <LeaseForm
          lease={editingLease}
          onSubmit={handleUpdateLease}
          onCancel={() => setEditingLease(null)}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ASC 842 Lease Accounting</h1>
          <p className="text-gray-600">Welcome, {user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowLeaseForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Lease
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Leases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Leases</CardTitle>
          <CardDescription>
            Manage your lease agreements and view calculated journal entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leases.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No leases found. Create your first lease to get started.</p>
              <Button onClick={() => setShowLeaseForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Lease
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lease Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Monthly Payment</TableHead>
                  <TableHead>Discount Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell className="font-medium">{lease.leaseName}</TableCell>
                    <TableCell>{formatDate(lease.leaseStartDate)}</TableCell>
                    <TableCell>{formatDate(lease.leaseEndDate)}</TableCell>
                    <TableCell>{formatCurrency(lease.monthlyPayment)}</TableCell>
                    <TableCell>{(lease.discountRate * 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewJournalEntries(lease)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLease(lease)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteLease(lease.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Journal Entries */}
      {selectedLease && (
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries - {selectedLease.leaseName}</CardTitle>
            <CardDescription>
              ASC 842 calculated journal entries for this lease
            </CardDescription>
          </CardHeader>
          <CardContent>
            {journalEntries.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No journal entries found.</p>
            ) : (
              <div className="space-y-4">
                {journalEntries.map((entry, index) => (
                  <div key={entry.id || index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{entry.description}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(entry.entryDate)} • {entry.entryType.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Debits</h5>
                        <div className="space-y-1">
                          {entry.debits.map((debit, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{debit.account}</span>
                              <span>{formatCurrency(debit.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-2">Credits</h5>
                        <div className="space-y-1">
                          {entry.credits.map((credit, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{credit.account}</span>
                              <span>{formatCurrency(credit.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
