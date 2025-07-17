export interface LeaseData {
  id?: string;
  userId: string;
  leaseName: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyPayment: number;
  discountRate: number; // Annual rate as decimal (e.g., 0.05 for 5%)
  prepaidRent?: number;
  initialDirectCosts?: number;
  leaseIncentives?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalEntry {
  id?: string;
  leaseId: string;
  entryDate: string;
  entryType: 'initial_recognition' | 'monthly_amortization' | 'remeasurement';
  description: string;
  debits: AccountEntry[];
  credits: AccountEntry[];
  createdAt?: string;
}

export interface AccountEntry {
  account: string;
  amount: number;
}

export interface LeaseCalculation {
  initialLeasePayment: number;
  initialRightOfUseAsset: number;
  initialLeaseLiability: number;
  monthlyInterestExpense: number;
  monthlyAmortizationExpense: number;
  monthlyLeaseLiabilityReduction: number;
  totalLeaseTerm: number; // in months
  presentValueOfLeasePayments: number;
}

export interface MonthlySchedule {
  month: number;
  date: string;
  beginningLeaseLiability: number;
  interestExpense: number;
  leasePayment: number;
  principalReduction: number;
  endingLeaseLiability: number;
  rightOfUseAssetAmortization: number;
  rightOfUseAssetBalance: number;
}
