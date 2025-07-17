import { LeaseData, LeaseCalculation, MonthlySchedule, JournalEntry, AccountEntry } from './types';

/**
 * Calculate the present value of lease payments using the discount rate
 */
export function calculatePresentValue(
  monthlyPayment: number,
  discountRate: number,
  numberOfPayments: number
): number {
  const monthlyRate = discountRate / 12;
  if (monthlyRate === 0) {
    return monthlyPayment * numberOfPayments;
  }
  
  const presentValue = monthlyPayment * 
    ((1 - Math.pow(1 + monthlyRate, -numberOfPayments)) / monthlyRate);
  
  return Math.round(presentValue * 100) / 100;
}

/**
 * Calculate lease term in months
 */
export function calculateLeaseTerm(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 + 
    (end.getMonth() - start.getMonth());
  
  return months;
}

/**
 * Perform ASC 842 lease calculations
 */
export function calculateLeaseMetrics(leaseData: LeaseData): LeaseCalculation {
  const totalLeaseTerm = calculateLeaseTerm(leaseData.leaseStartDate, leaseData.leaseEndDate);
  const presentValueOfLeasePayments = calculatePresentValue(
    leaseData.monthlyPayment,
    leaseData.discountRate,
    totalLeaseTerm
  );
  
  // Initial measurements per ASC 842
  const initialDirectCosts = leaseData.initialDirectCosts || 0;
  const prepaidRent = leaseData.prepaidRent || 0;
  const leaseIncentives = leaseData.leaseIncentives || 0;
  
  const initialLeaseLiability = presentValueOfLeasePayments;
  const initialRightOfUseAsset = initialLeaseLiability + initialDirectCosts + prepaidRent - leaseIncentives;
  
  // Monthly calculations
  const monthlyInterestRate = leaseData.discountRate / 12;
  const monthlyAmortizationExpense = initialRightOfUseAsset / totalLeaseTerm;
  
  return {
    initialLeasePayment: leaseData.monthlyPayment,
    initialRightOfUseAsset: Math.round(initialRightOfUseAsset * 100) / 100,
    initialLeaseLiability: Math.round(initialLeaseLiability * 100) / 100,
    monthlyInterestExpense: 0, // This varies each month
    monthlyAmortizationExpense: Math.round(monthlyAmortizationExpense * 100) / 100,
    monthlyLeaseLiabilityReduction: 0, // This varies each month
    totalLeaseTerm,
    presentValueOfLeasePayments: Math.round(presentValueOfLeasePayments * 100) / 100,
  };
}

/**
 * Generate monthly amortization schedule
 */
export function generateAmortizationSchedule(leaseData: LeaseData): MonthlySchedule[] {
  const calculation = calculateLeaseMetrics(leaseData);
  const schedule: MonthlySchedule[] = [];
  
  let currentLeaseLiability = calculation.initialLeaseLiability;
  let currentRightOfUseAsset = calculation.initialRightOfUseAsset;
  const monthlyRate = leaseData.discountRate / 12;
  
  for (let month = 1; month <= calculation.totalLeaseTerm; month++) {
    const date = new Date(leaseData.leaseStartDate);
    date.setMonth(date.getMonth() + month - 1);
    
    const interestExpense = currentLeaseLiability * monthlyRate;
    const principalReduction = leaseData.monthlyPayment - interestExpense;
    const endingLeaseLiability = currentLeaseLiability - principalReduction;
    const rightOfUseAssetAmortization = calculation.monthlyAmortizationExpense;
    const rightOfUseAssetBalance = currentRightOfUseAsset - rightOfUseAssetAmortization;
    
    schedule.push({
      month,
      date: date.toISOString().split('T')[0],
      beginningLeaseLiability: Math.round(currentLeaseLiability * 100) / 100,
      interestExpense: Math.round(interestExpense * 100) / 100,
      leasePayment: leaseData.monthlyPayment,
      principalReduction: Math.round(principalReduction * 100) / 100,
      endingLeaseLiability: Math.round(Math.max(0, endingLeaseLiability) * 100) / 100,
      rightOfUseAssetAmortization: Math.round(rightOfUseAssetAmortization * 100) / 100,
      rightOfUseAssetBalance: Math.round(Math.max(0, rightOfUseAssetBalance) * 100) / 100,
    });
    
    currentLeaseLiability = Math.max(0, endingLeaseLiability);
    currentRightOfUseAsset = Math.max(0, rightOfUseAssetBalance);
  }
  
  return schedule;
}

/**
 * Generate initial recognition journal entry
 */
export function generateInitialRecognitionEntry(leaseData: LeaseData): JournalEntry {
  const calculation = calculateLeaseMetrics(leaseData);
  
  const debits: AccountEntry[] = [
    {
      account: 'Right-of-Use Asset',
      amount: calculation.initialRightOfUseAsset,
    },
  ];
  
  const credits: AccountEntry[] = [
    {
      account: 'Lease Liability',
      amount: calculation.initialLeaseLiability,
    },
  ];
  
  // Add prepaid rent, initial direct costs, and lease incentives if applicable
  if (leaseData.prepaidRent && leaseData.prepaidRent > 0) {
    credits.push({
      account: 'Prepaid Rent',
      amount: leaseData.prepaidRent,
    });
  }
  
  if (leaseData.initialDirectCosts && leaseData.initialDirectCosts > 0) {
    credits.push({
      account: 'Cash',
      amount: leaseData.initialDirectCosts,
    });
  }
  
  if (leaseData.leaseIncentives && leaseData.leaseIncentives > 0) {
    debits.push({
      account: 'Lease Incentives Receivable',
      amount: leaseData.leaseIncentives,
    });
  }
  
  return {
    leaseId: leaseData.id || '',
    entryDate: leaseData.leaseStartDate,
    entryType: 'initial_recognition',
    description: `Initial recognition of lease: ${leaseData.leaseName}`,
    debits,
    credits,
  };
}

/**
 * Generate monthly amortization journal entries
 */
export function generateMonthlyAmortizationEntries(leaseData: LeaseData): JournalEntry[] {
  const schedule = generateAmortizationSchedule(leaseData);
  const entries: JournalEntry[] = [];
  
  schedule.forEach((monthData) => {
    // Interest expense and lease liability reduction entry
    const interestEntry: JournalEntry = {
      leaseId: leaseData.id || '',
      entryDate: monthData.date,
      entryType: 'monthly_amortization',
      description: `Month ${monthData.month} - Interest expense and lease payment`,
      debits: [
        {
          account: 'Interest Expense',
          amount: monthData.interestExpense,
        },
        {
          account: 'Lease Liability',
          amount: monthData.principalReduction,
        },
      ],
      credits: [
        {
          account: 'Cash',
          amount: monthData.leasePayment,
        },
      ],
    };
    
    // Right-of-use asset amortization entry
    const amortizationEntry: JournalEntry = {
      leaseId: leaseData.id || '',
      entryDate: monthData.date,
      entryType: 'monthly_amortization',
      description: `Month ${monthData.month} - Right-of-use asset amortization`,
      debits: [
        {
          account: 'Amortization Expense - Right-of-Use Asset',
          amount: monthData.rightOfUseAssetAmortization,
        },
      ],
      credits: [
        {
          account: 'Accumulated Amortization - Right-of-Use Asset',
          amount: monthData.rightOfUseAssetAmortization,
        },
      ],
    };
    
    entries.push(interestEntry, amortizationEntry);
  });
  
  return entries;
}
