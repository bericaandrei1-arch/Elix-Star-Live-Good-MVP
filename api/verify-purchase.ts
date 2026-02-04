/**
 * API Endpoint: Verify In-App Purchase (Apple/Google)
 * POST /api/verify-purchase
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PurchaseRequest {
  userId: string;
  packageId: string;
  provider: 'apple' | 'google';
  receipt: string;
  transactionId: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: PurchaseRequest = await req.json();
    const { userId, packageId, provider, receipt, transactionId } = body;

    // Validate required fields
    if (!userId || !packageId || !provider || !receipt || !transactionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify receipt with Apple/Google
    let isValid = false;
    let verificationResponse: any = {};

    if (provider === 'apple') {
      isValid = await verifyAppleReceipt(receipt, transactionId);
      verificationResponse = { provider: 'apple', verified: isValid };
    } else if (provider === 'google') {
      isValid = await verifyGoogleReceipt(receipt, transactionId);
      verificationResponse = { provider: 'google', verified: isValid };
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid receipt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call Supabase function to verify and credit coins
    const { data, error } = await supabase.rpc('verify_purchase', {
      p_user_id: userId,
      p_package_id: packageId,
      p_provider: provider,
      p_provider_tx_id: transactionId,
      p_raw_receipt: receipt,
      p_verification_response: verificationResponse,
    });

    if (error) {
      console.error('Purchase verification error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: data,
        message: 'Purchase verified and coins credited',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Purchase verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Verify Apple App Store receipt
 */
async function verifyAppleReceipt(
  receipt: string,
  transactionId: string
): Promise<boolean> {
  try {
    // Use Apple's production verification endpoint
    const verifyUrl = 'https://buy.itunes.apple.com/verifyReceipt';
    // For testing: 'https://sandbox.itunes.apple.com/verifyReceipt'

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        password: process.env.APPLE_SHARED_SECRET, // Set this in .env
      }),
    });

    const data = await response.json();

    // Check if receipt is valid and matches transaction ID
    if (data.status === 0 && data.receipt) {
      const transactions = data.receipt.in_app || [];
      return transactions.some((tx: any) => tx.transaction_id === transactionId);
    }

    return false;
  } catch (error) {
    console.error('Apple receipt verification error:', error);
    return false;
  }
}

/**
 * Verify Google Play purchase
 */
async function verifyGoogleReceipt(
  receipt: string,
  transactionId: string
): Promise<boolean> {
  try {
    // Parse receipt (contains package name, product ID, purchase token)
    const receiptData = JSON.parse(receipt);
    const { packageName, productId, purchaseToken } = receiptData;

    // Use Google Play Developer API
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.GOOGLE_PLAY_ACCESS_TOKEN}`, // Set this in .env
      },
    });

    const data = await response.json();

    // Check purchase state (0 = purchased)
    return data.purchaseState === 0 && data.orderId === transactionId;
  } catch (error) {
    console.error('Google receipt verification error:', error);
    return false;
  }
}
