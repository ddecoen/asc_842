import { z } from 'zod';

export const leaseDataSchema = z.object({
  leaseName: z.string().min(1, 'Lease name is required').max(100, 'Lease name must be less than 100 characters'),
  leaseStartDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Invalid start date'),
  leaseEndDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Invalid end date'),
  monthlyPayment: z.number().positive('Monthly payment must be positive'),
  discountRate: z.number().min(0, 'Discount rate cannot be negative').max(1, 'Discount rate cannot exceed 100%'),
  prepaidRent: z.number().min(0, 'Prepaid rent cannot be negative').optional(),
  initialDirectCosts: z.number().min(0, 'Initial direct costs cannot be negative').optional(),
  leaseIncentives: z.number().min(0, 'Lease incentives cannot be negative').optional(),
}).refine((data) => {
  const startDate = new Date(data.leaseStartDate);
  const endDate = new Date(data.leaseEndDate);
  return endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['leaseEndDate'],
});

export const createLeaseSchema = leaseDataSchema;

export const updateLeaseSchema = leaseDataSchema.partial().extend({
  id: z.string().min(1, 'Lease ID is required'),
});

export const journalEntrySchema = z.object({
  leaseId: z.string().min(1, 'Lease ID is required'),
  entryDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Invalid entry date'),
  entryType: z.enum(['initial_recognition', 'monthly_amortization', 'remeasurement']),
  description: z.string().min(1, 'Description is required'),
  debits: z.array(z.object({
    account: z.string().min(1, 'Account name is required'),
    amount: z.number().positive('Amount must be positive'),
  })).min(1, 'At least one debit entry is required'),
  credits: z.array(z.object({
    account: z.string().min(1, 'Account name is required'),
    amount: z.number().positive('Amount must be positive'),
  })).min(1, 'At least one credit entry is required'),
}).refine((data) => {
  const totalDebits = data.debits.reduce((sum, entry) => sum + entry.amount, 0);
  const totalCredits = data.credits.reduce((sum, entry) => sum + entry.amount, 0);
  return Math.abs(totalDebits - totalCredits) < 0.01; // Allow for small rounding differences
}, {
  message: 'Total debits must equal total credits',
  path: ['debits'],
});

export type LeaseDataInput = z.infer<typeof leaseDataSchema>;
export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
