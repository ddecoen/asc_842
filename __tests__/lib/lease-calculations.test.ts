import {
  calculatePresentValue,
  calculateLeaseTerm,
  calculateLeaseMetrics,
  generateAmortizationSchedule,
  generateInitialRecognitionEntry,
  generateMonthlyAmortizationEntries,
} from '@/lib/lease-calculations';
import { LeaseData } from '@/lib/types';

describe('Lease Calculations', () => {
  const sampleLeaseData: LeaseData = {
    id: 'test-lease-1',
    userId: 'test-user',
    leaseName: 'Test Office Lease',
    leaseStartDate: '2024-01-01',
    leaseEndDate: '2026-12-31',
    monthlyPayment: 5000,
    discountRate: 0.05, // 5% annual
    prepaidRent: 1000,
    initialDirectCosts: 500,
    leaseIncentives: 2000,
  };

  describe('calculatePresentValue', () => {
    it('should calculate present value correctly with discount rate', () => {
      const pv = calculatePresentValue(5000, 0.05, 36);
      expect(pv).toBeCloseTo(166828.51, 2);
    });

    it('should handle zero discount rate', () => {
      const pv = calculatePresentValue(5000, 0, 36);
      expect(pv).toBe(180000); // 5000 * 36
    });

    it('should handle single payment', () => {
      const pv = calculatePresentValue(5000, 0.05, 1);
      expect(pv).toBeCloseTo(4979.25, 2);
    });
  });

  describe('calculateLeaseTerm', () => {
    it('should calculate lease term in months correctly', () => {
      const term = calculateLeaseTerm('2024-01-01', '2026-12-31');
      expect(term).toBe(35); // From Jan 2024 to Dec 2026
    });

    it('should handle same year lease', () => {
      const term = calculateLeaseTerm('2024-01-01', '2024-12-31');
      expect(term).toBe(11);
    });

    it('should handle single month lease', () => {
      const term = calculateLeaseTerm('2024-01-01', '2024-01-31');
      expect(term).toBe(0);
    });
  });

  describe('calculateLeaseMetrics', () => {
    it('should calculate all lease metrics correctly', () => {
      const metrics = calculateLeaseMetrics(sampleLeaseData);
      
      expect(metrics.totalLeaseTerm).toBe(35);
      expect(metrics.presentValueOfLeasePayments).toBeCloseTo(162523.63, 2);
      expect(metrics.initialLeaseLiability).toBeCloseTo(162523.63, 2);
      expect(metrics.initialRightOfUseAsset).toBeCloseTo(162023.63, 2); // PV + costs - incentives
      expect(metrics.monthlyAmortizationExpense).toBeCloseTo(4629.25, 2);
    });

    it('should handle lease without optional costs', () => {
      const simpleLeaseData = {
        ...sampleLeaseData,
        prepaidRent: undefined,
        initialDirectCosts: undefined,
        leaseIncentives: undefined,
      };
      
      const metrics = calculateLeaseMetrics(simpleLeaseData);
      expect(metrics.initialRightOfUseAsset).toBe(metrics.initialLeaseLiability);
    });
  });

  describe('generateAmortizationSchedule', () => {
    it('should generate correct amortization schedule', () => {
      const schedule = generateAmortizationSchedule(sampleLeaseData);
      
      expect(schedule).toHaveLength(35);
      expect(schedule[0].month).toBe(1);
      expect(schedule[0].beginningLeaseLiability).toBeCloseTo(162523.63, 2);
      expect(schedule[0].interestExpense).toBeCloseTo(677.18, 2);
      expect(schedule[0].principalReduction).toBeCloseTo(4322.82, 2);
      
      // Last payment should reduce liability to near zero (allow for small rounding)
      const lastPayment = schedule[schedule.length - 1];
      expect(lastPayment.endingLeaseLiability).toBeLessThan(0.1);
    });

    it('should maintain consistent payment amounts', () => {
      const schedule = generateAmortizationSchedule(sampleLeaseData);
      
      schedule.forEach((payment) => {
        expect(payment.leasePayment).toBe(5000);
        expect(payment.rightOfUseAssetAmortization).toBeCloseTo(4629.25, 2);
      });
    });
  });

  describe('generateInitialRecognitionEntry', () => {
    it('should generate correct initial recognition journal entry', () => {
      const entry = generateInitialRecognitionEntry(sampleLeaseData);
      
      expect(entry.entryType).toBe('initial_recognition');
      expect(entry.entryDate).toBe('2024-01-01');
      expect(entry.description).toContain('Test Office Lease');
      
      // Check debits
      expect(entry.debits).toHaveLength(2); // ROU Asset + Lease Incentives
      const rouAssetDebit = entry.debits.find(d => d.account === 'Right-of-Use Asset');
      expect(rouAssetDebit?.amount).toBeCloseTo(162023.63, 2);
      
      // Check credits
      expect(entry.credits).toHaveLength(3); // Lease Liability + Prepaid Rent + Cash
      const leaseLiabilityCredit = entry.credits.find(c => c.account === 'Lease Liability');
      expect(leaseLiabilityCredit?.amount).toBeCloseTo(162523.63, 2);
    });

    it('should handle lease without optional components', () => {
      const simpleLeaseData = {
        ...sampleLeaseData,
        prepaidRent: 0,
        initialDirectCosts: 0,
        leaseIncentives: 0,
      };
      
      const entry = generateInitialRecognitionEntry(simpleLeaseData);
      
      expect(entry.debits).toHaveLength(1); // Only ROU Asset
      expect(entry.credits).toHaveLength(1); // Only Lease Liability
    });
  });

  describe('generateMonthlyAmortizationEntries', () => {
    it('should generate correct monthly entries', () => {
      const entries = generateMonthlyAmortizationEntries(sampleLeaseData);
      
      // Should have 2 entries per month (interest + amortization) * 35 months
      expect(entries).toHaveLength(70);
      
      // Check first month entries
      const firstInterestEntry = entries[0];
      expect(firstInterestEntry.entryType).toBe('monthly_amortization');
      expect(firstInterestEntry.description).toContain('Month 1 - Interest expense');
      expect(firstInterestEntry.debits[0].account).toBe('Interest Expense');
      expect(firstInterestEntry.debits[0].amount).toBeCloseTo(677.18, 2);
      
      const firstAmortizationEntry = entries[1];
      expect(firstAmortizationEntry.description).toContain('Month 1 - Right-of-use asset amortization');
      expect(firstAmortizationEntry.debits[0].account).toBe('Amortization Expense - Right-of-Use Asset');
      expect(firstAmortizationEntry.debits[0].amount).toBeCloseTo(4629.25, 2);
    });

    it('should have balanced journal entries', () => {
      const entries = generateMonthlyAmortizationEntries(sampleLeaseData);
      
      entries.forEach((entry) => {
        const totalDebits = entry.debits.reduce((sum, debit) => sum + debit.amount, 0);
        const totalCredits = entry.credits.reduce((sum, credit) => sum + credit.amount, 0);
        expect(totalDebits).toBeCloseTo(totalCredits, 2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short lease terms', () => {
      const shortLeaseData = {
        ...sampleLeaseData,
        leaseEndDate: '2024-02-29', // 1 month lease
      };
      
      const metrics = calculateLeaseMetrics(shortLeaseData);
      expect(metrics.totalLeaseTerm).toBe(1);
      
      const schedule = generateAmortizationSchedule(shortLeaseData);
      expect(schedule).toHaveLength(1);
    });

    it('should handle high discount rates', () => {
      const highRateLeaseData = {
        ...sampleLeaseData,
        discountRate: 0.15, // 15% annual
      };
      
      const metrics = calculateLeaseMetrics(highRateLeaseData);
      expect(metrics.presentValueOfLeasePayments).toBeLessThan(sampleLeaseData.monthlyPayment * 35);
    });

    it('should handle zero monthly payment', () => {
      const zeroPaymentLeaseData = {
        ...sampleLeaseData,
        monthlyPayment: 0,
      };
      
      const metrics = calculateLeaseMetrics(zeroPaymentLeaseData);
      expect(metrics.presentValueOfLeasePayments).toBe(0);
      expect(metrics.initialLeaseLiability).toBe(0);
    });
  });
});
