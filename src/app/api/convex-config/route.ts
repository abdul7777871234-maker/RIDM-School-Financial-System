import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || '';
  
  const isConfigured = !!(
    url && 
    url.trim() !== '' && 
    (url.startsWith('http') || url.startsWith('https')) && 
    !url.includes('placeholder')
  );

  return NextResponse.json({
    url: url.trim(),
    configured: isConfigured
  });
}
