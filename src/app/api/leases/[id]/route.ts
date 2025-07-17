import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { updateLeaseSchema } from '@/lib/validations';
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

// GET /api/leases/[id] - Get a specific lease
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const leaseDoc = await adminDb.collection('leases').doc(params.id).get();
    
    if (!leaseDoc.exists) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }
    
    const leaseData = leaseDoc.data() as LeaseData;
    
    // Check if user owns this lease
    if (leaseData.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const lease = { id: leaseDoc.id, ...leaseData };
    return NextResponse.json({ lease });
  } catch (error) {
    console.error('Error fetching lease:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/leases/[id] - Update a specific lease
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validationResult = updateLeaseSchema.safeParse({ ...body, id: params.id });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const leaseRef = adminDb.collection('leases').doc(params.id);
    const leaseDoc = await leaseRef.get();
    
    if (!leaseDoc.exists) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }
    
    const existingLeaseData = leaseDoc.data() as LeaseData;
    
    // Check if user owns this lease
    if (existingLeaseData.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id, ...updateData } = validationResult.data;
    const updatedLeaseData = {
      ...existingLeaseData,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    // Validate lease calculations with updated data
    try {
      calculateLeaseMetrics(updatedLeaseData as LeaseData);
    } catch (calcError) {
      return NextResponse.json(
        { error: 'Invalid lease data for calculations', details: calcError },
        { status: 400 }
      );
    }
    
    await leaseRef.update(updatedLeaseData);
    const updatedLease = { id: params.id, ...updatedLeaseData };
    
    return NextResponse.json({ lease: updatedLease });
  } catch (error) {
    console.error('Error updating lease:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/leases/[id] - Delete a specific lease
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const leaseRef = adminDb.collection('leases').doc(params.id);
    const leaseDoc = await leaseRef.get();
    
    if (!leaseDoc.exists) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }
    
    const leaseData = leaseDoc.data() as LeaseData;
    
    // Check if user owns this lease
    if (leaseData.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete all journal entries for this lease
    const journalEntriesRef = adminDb.collection('journalEntries');
    const journalSnapshot = await journalEntriesRef.where('leaseId', '==', params.id).get();
    
    const batch = adminDb.batch();
    journalSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Delete the lease
    batch.delete(leaseRef);
    
    await batch.commit();
    
    return NextResponse.json({ message: 'Lease deleted successfully' });
  } catch (error) {
    console.error('Error deleting lease:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
