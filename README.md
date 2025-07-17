# ASC 842 Lease Accounting System

A production-ready Next.js 14 application for ASC 842 lease accounting with automated journal entry calculations, built with TypeScript, Firebase, and TailwindCSS.

## Features

- **ASC 842 Compliance**: Automated calculation of lease liabilities, right-of-use assets, and journal entries
- **User Authentication**: Firebase Authentication with email/password and Google Sign-In
- **Real-time Data**: Firebase Firestore for secure, real-time data storage
- **Responsive UI**: Clean, modern interface built with TailwindCSS and shadcn/ui components
- **Input Validation**: Comprehensive validation using Zod schemas
- **Unit Testing**: Jest tests for lease calculation logic
- **Production Ready**: Optimized for Vercel deployment

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **UI Components**: shadcn/ui, Radix UI, Lucide React
- **Backend**: Next.js API Routes, Firebase Admin SDK
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Validation**: Zod
- **Testing**: Jest, React Testing Library
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project
- Vercel account (for deployment)

### Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project" and follow the setup wizard
   - Enable Google Analytics (optional)

2. **Enable Authentication**
   - In your Firebase project, go to Authentication > Sign-in method
   - Enable "Email/Password" and "Google" providers
   - For Google Sign-In, configure OAuth consent screen

3. **Create Firestore Database**
   - Go to Firestore Database > Create database
   - Start in production mode
   - Choose a location close to your users

4. **Generate Service Account Key**
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Download the JSON file (keep it secure!)

5. **Get Web App Configuration**
   - Go to Project Settings > General
   - In "Your apps" section, click "Web" to add a web app
   - Copy the configuration object

6. **Deploy Firestore Security Rules**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase in your project
   firebase init firestore
   
   # Deploy security rules
   firebase deploy --only firestore:rules
   ```

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ddecoen/asc_842.git
   cd asc_842
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Firebase configuration in `.env.local`:
   ```env
   # Firebase Client Configuration (from Firebase Console)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Firebase Admin Configuration (from Service Account JSON)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key\n-----END PRIVATE KEY-----\n"
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run tests**
   ```bash
   npm test
   npm run test:coverage
   ```

## Deployment to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   In your Vercel dashboard, go to your project settings and add all environment variables from your `.env.local` file.

   Or use the CLI:
   ```bash
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   vercel env add FIREBASE_PRIVATE_KEY
   # ... add all other variables
   ```

5. **Redeploy**
   ```bash
   vercel --prod
   ```

## API Documentation

### Authentication
All API routes require authentication. Include the Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

### Endpoints

#### Leases

**GET /api/leases**
- Get all leases for authenticated user
- Response: `{ leases: LeaseData[] }`

**POST /api/leases**
- Create a new lease
- Body: `LeaseData` (without id, userId, timestamps)
- Response: `{ lease: LeaseData }`

**GET /api/leases/[id]**
- Get specific lease
- Response: `{ lease: LeaseData }`

**PUT /api/leases/[id]**
- Update specific lease
- Body: Partial `LeaseData`
- Response: `{ lease: LeaseData }`

**DELETE /api/leases/[id]**
- Delete lease and all associated journal entries
- Response: `{ message: string }`

#### Journal Entries

**GET /api/journal-entries?leaseId={id}**
- Get journal entries for a lease
- Response: `{ journalEntries: JournalEntry[] }`

**POST /api/journal-entries**
- Regenerate journal entries for a lease
- Body: `{ leaseId: string }`
- Response: `{ journalEntries: JournalEntry[] }`

### Example API Usage

```javascript
// Get user's ID token
const token = await user.getIdToken();

// Create a new lease
const response = await fetch('/api/leases', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    leaseName: 'Office Building Lease',
    leaseStartDate: '2024-01-01',
    leaseEndDate: '2026-12-31',
    monthlyPayment: 5000,
    discountRate: 0.05,
    prepaidRent: 1000,
    initialDirectCosts: 500,
    leaseIncentives: 2000,
  }),
});

const { lease } = await response.json();

// Get journal entries
const entriesResponse = await fetch(`/api/journal-entries?leaseId=${lease.id}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { journalEntries } = await entriesResponse.json();
```

## Data Models

### LeaseData
```typescript
interface LeaseData {
  id?: string;
  userId: string;
  leaseName: string;
  leaseStartDate: string; // ISO date string
  leaseEndDate: string; // ISO date string
  monthlyPayment: number;
  discountRate: number; // Annual rate as decimal (0.05 = 5%)
  prepaidRent?: number;
  initialDirectCosts?: number;
  leaseIncentives?: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### JournalEntry
```typescript
interface JournalEntry {
  id?: string;
  leaseId: string;
  entryDate: string;
  entryType: 'initial_recognition' | 'monthly_amortization' | 'remeasurement';
  description: string;
  debits: AccountEntry[];
  credits: AccountEntry[];
  createdAt?: string;
}

interface AccountEntry {
  account: string;
  amount: number;
}
```

## ASC 842 Calculations

The application implements the following ASC 842 calculations:

1. **Present Value of Lease Payments**: Calculated using the discount rate and lease term
2. **Initial Lease Liability**: Equal to the present value of lease payments
3. **Initial Right-of-Use Asset**: Lease liability + prepaid rent + initial direct costs - lease incentives
4. **Monthly Interest Expense**: Beginning lease liability × (discount rate / 12)
5. **Monthly Amortization**: Right-of-use asset ÷ lease term in months

### Journal Entry Types

1. **Initial Recognition**
   - Dr. Right-of-Use Asset
   - Cr. Lease Liability
   - Cr. Cash (for initial direct costs)
   - Cr. Prepaid Rent (if applicable)
   - Dr. Lease Incentives Receivable (if applicable)

2. **Monthly Amortization**
   - Dr. Interest Expense
   - Dr. Lease Liability
   - Cr. Cash (lease payment)
   - Dr. Amortization Expense - Right-of-Use Asset
   - Cr. Accumulated Amortization - Right-of-Use Asset

## Testing

The application includes comprehensive unit tests for the lease calculation logic:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test coverage includes:
- Present value calculations
- Lease term calculations
- Amortization schedule generation
- Journal entry generation
- Edge cases and error handling

## Security

- **Authentication**: All API routes require valid Firebase authentication
- **Authorization**: Users can only access their own data
- **Firestore Rules**: Database-level security rules prevent unauthorized access
- **Input Validation**: All inputs validated using Zod schemas
- **Environment Variables**: Sensitive configuration stored securely

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open a GitHub issue or contact the development team.
