import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { LeaseData, JournalEntry } from '@/lib/types';
import {
  generateInitialRecognitionEntry,
  generateMonthlyAmortizationEntries,
} from '@/lib/lease-calculations';

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

// GET /api/journal-entries?leaseId=xxx - Get journal entries for a specific lease
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get('leaseId');
    
    if (!leaseId) {
      return NextResponse.json({ error: 'leaseId parameter is required' }, { status: 400 });
    }
    
    // Verify user owns the lease
    const leaseDoc = await adminDb.collection('leases').doc(leaseId).get();
    if (!leaseDoc.exists) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }
    
    const leaseData = leaseDoc.data() as LeaseData;
    if (leaseData.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get stored journal entries
    const journalEntriesRef = adminDb.collection('journalEntries');
    const snapshot = await journalEntriesRef.where('leaseId', '==', leaseId).get();
    
    const storedEntries: JournalEntry[] = [];
    snapshot.forEach((doc) => {
      storedEntries.push({ id: doc.id, ...doc.data() } as JournalEntry);
    });
    
    // If no stored entries, generate them
    if (storedEntries.length === 0) {
      const fullLeaseData = { id: leaseId, ...leaseData };
      
      // Generate initial recognition entry
      const initialEntry = generateInitialRecognitionEntry(fullLeaseData);
      
      // Generate monthly amortization entries
      const monthlyEntries = generateMonthlyAmortizationEntries(fullLeaseData);
      
      const allEntries = [initialEntry, ...monthlyEntries];
      
      // Store entries in Firestore
      const batch = adminDb.batch();
      const generatedEntries: JournalEntry[] = [];
      
      for (const entry of allEntries) {
        const entryData = {
          ...entry,
          createdAt: new Date().toISOString(),
        };
        const docRef = journalEntriesRef.doc();
        batch.set(docRef, entryData);
        generatedEntries.push({ id: docRef.id, ...entryData });
      }
      
      await batch.commit();
      
      return NextResponse.json({ journalEntries: generatedEntries });
    }
    
    // Sort entries by date
    storedEntries.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    
    return NextResponse.json({ journalEntries: storedEntries });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/journal-entries/regenerate - Regenerate journal entries for a lease
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { leaseId } = body;
    
    if (!leaseId) {
      return NextResponse.json({ error: 'leaseId is required' }, { status: 400 });
    }
    
    // Verify user owns the lease
    const leaseDoc = await adminDb.collection('leases').doc(leaseId).get();
    if (!leaseDoc.exists) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }
    
    const leaseData = leaseDoc.data() as LeaseData;
    if (leaseData.userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete existing journal entries
    const journalEntriesRef = adminDb.collection('journalEntries');
    const existingSnapshot = await journalEntriesRef.where('leaseId', '==', leaseId).get();
    
    const batch = adminDb.batch();
    existingSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Generate new entries
    const fullLeaseData = { id: leaseId, ...leaseData };
    const initialEntry = generateInitialRecognitionEntry(fullLeaseData);
    const monthlyEntries = generateMonthlyAmortizationEntries(fullLeaseData);
    const allEntries = [initialEntry, ...monthlyEntries];
    
    const generatedEntries: JournalEntry[] = [];
    
    for (const entry of allEntries) {
      const entryData = {
        ...entry,
        createdAt: new Date().toISOString(),
      };
      const docRef = journalEntriesRef.doc();
      batch.set(docRef, entryData);
      generatedEntries.push({ id: docRef.id, ...entryData });
    }
    
    await batch.commit();
    
    // Sort entries by date
    generatedEntries.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    
    return NextResponse.json({ journalEntries: generatedEntries });
  } catch (error) {
    console.error('Error regenerating journal entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
