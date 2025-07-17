'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaseData } from '@/lib/types';
import { leaseDataSchema } from '@/lib/validations';

interface LeaseFormProps {
  lease?: LeaseData;
  onSubmit: (leaseData: Omit<LeaseData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function LeaseForm({ lease, onSubmit, onCancel, loading = false }: LeaseFormProps) {
  const [formData, setFormData] = useState({
    leaseName: lease?.leaseName || '',
    leaseStartDate: lease?.leaseStartDate || '',
    leaseEndDate: lease?.leaseEndDate || '',
    monthlyPayment: lease?.monthlyPayment || 0,
    discountRate: lease?.discountRate || 0,
    prepaidRent: lease?.prepaidRent || 0,
    initialDirectCosts: lease?.initialDirectCosts || 0,
    leaseIncentives: lease?.leaseIncentives || 0,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationResult = leaseDataSchema.safeParse(formData);
    
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit(validationResult.data);
    } catch (error: any) {
      setErrors({ general: error.message || 'An error occurred' });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{lease ? 'Edit Lease' : 'Create New Lease'}</CardTitle>
        <CardDescription>
          Enter the lease details to calculate ASC 842 journal entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="leaseName">Lease Name *</Label>
              <Input
                id="leaseName"
                type="text"
                value={formData.leaseName}
                onChange={(e) => handleInputChange('leaseName', e.target.value)}
                disabled={loading}
                placeholder="e.g., Office Building Lease"
              />
              {errors.leaseName && <p className="text-red-600 text-sm mt-1">{errors.leaseName}</p>}
            </div>
            
            <div>
              <Label htmlFor="leaseStartDate">Lease Start Date *</Label>
              <Input
                id="leaseStartDate"
                type="date"
                value={formData.leaseStartDate}
                onChange={(e) => handleInputChange('leaseStartDate', e.target.value)}
                disabled={loading}
              />
              {errors.leaseStartDate && <p className="text-red-600 text-sm mt-1">{errors.leaseStartDate}</p>}
            </div>
            
            <div>
              <Label htmlFor="leaseEndDate">Lease End Date *</Label>
              <Input
                id="leaseEndDate"
                type="date"
                value={formData.leaseEndDate}
                onChange={(e) => handleInputChange('leaseEndDate', e.target.value)}
                disabled={loading}
              />
              {errors.leaseEndDate && <p className="text-red-600 text-sm mt-1">{errors.leaseEndDate}</p>}
            </div>
            
            <div>
              <Label htmlFor="monthlyPayment">Monthly Payment ($) *</Label>
              <Input
                id="monthlyPayment"
                type="number"
                step="0.01"
                min="0"
                value={formData.monthlyPayment}
                onChange={(e) => handleInputChange('monthlyPayment', parseFloat(e.target.value) || 0)}
                disabled={loading}
                placeholder="5000.00"
              />
              {errors.monthlyPayment && <p className="text-red-600 text-sm mt-1">{errors.monthlyPayment}</p>}
            </div>
            
            <div>
              <Label htmlFor="discountRate">Discount Rate (Annual %) *</Label>
              <Input
                id="discountRate"
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={formData.discountRate}
                onChange={(e) => handleInputChange('discountRate', parseFloat(e.target.value) || 0)}
                disabled={loading}
                placeholder="0.05 (for 5%)"
              />
              {errors.discountRate && <p className="text-red-600 text-sm mt-1">{errors.discountRate}</p>}
            </div>
            
            <div>
              <Label htmlFor="prepaidRent">Prepaid Rent ($)</Label>
              <Input
                id="prepaidRent"
                type="number"
                step="0.01"
                min="0"
                value={formData.prepaidRent}
                onChange={(e) => handleInputChange('prepaidRent', parseFloat(e.target.value) || 0)}
                disabled={loading}
                placeholder="0.00"
              />
              {errors.prepaidRent && <p className="text-red-600 text-sm mt-1">{errors.prepaidRent}</p>}
            </div>
            
            <div>
              <Label htmlFor="initialDirectCosts">Initial Direct Costs ($)</Label>
              <Input
                id="initialDirectCosts"
                type="number"
                step="0.01"
                min="0"
                value={formData.initialDirectCosts}
                onChange={(e) => handleInputChange('initialDirectCosts', parseFloat(e.target.value) || 0)}
                disabled={loading}
                placeholder="0.00"
              />
              {errors.initialDirectCosts && <p className="text-red-600 text-sm mt-1">{errors.initialDirectCosts}</p>}
            </div>
            
            <div>
              <Label htmlFor="leaseIncentives">Lease Incentives ($)</Label>
              <Input
                id="leaseIncentives"
                type="number"
                step="0.01"
                min="0"
                value={formData.leaseIncentives}
                onChange={(e) => handleInputChange('leaseIncentives', parseFloat(e.target.value) || 0)}
                disabled={loading}
                placeholder="0.00"
              />
              {errors.leaseIncentives && <p className="text-red-600 text-sm mt-1">{errors.leaseIncentives}</p>}
            </div>
          </div>
          
          {errors.general && (
            <div className="text-red-600 text-sm text-center">{errors.general}</div>
          )}
          
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : (lease ? 'Update Lease' : 'Create Lease')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
