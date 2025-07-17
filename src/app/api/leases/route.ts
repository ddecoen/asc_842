import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { createLeaseSchema } from '@/lib/validations';
import { LeaseData } from '@/lib/types';
import { calculateLeaseMetrics } from '@/lib/lease-calculations';

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

// GET /api/leases - Get all leases for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const leasesRef = adminDb.collection('leases');
    const snapshot = await leasesRef.where('userId', '==', user.uid).get();
    
    const leases: LeaseData[] = [];
    snapshot.forEach((doc) => {
      leases.push({ id: doc.id, ...doc.data() } as LeaseData);
    });
    
    return NextResponse.json({ leases });
  } catch (error) {
    console.error('Error fetching leases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leases - Create a new lease
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validationResult = createLeaseSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const leaseData: Omit<LeaseData, 'id'> = {
      ...validationResult.data,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Validate lease calculations
    try {
      calculateLeaseMetrics(leaseData as LeaseData);
    } catch (calcError) {
      return NextResponse.json(
        { error: 'Invalid lease data for calculations', details: calcError },
        { status: 400 }
      );
    }
    
    const docRef = await adminDb.collection('leases').add(leaseData);
    const createdLease = { id: docRef.id, ...leaseData };
    
    return NextResponse.json({ lease: createdLease }, { status: 201 });
  } catch (error) {
    console.error('Error creating lease:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
