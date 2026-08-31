import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateReceiptPresignedUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key || typeof key !== 'string') {
      return new NextResponse('Missing receipt key parameter.', { status: 400 });
    }

    // Security: strictly validate key prefix and path traversal prevention
    const normalizedKey = key.trim();
    if (!normalizedKey.startsWith('receipts/') || normalizedKey.includes('..')) {
      return new NextResponse('Invalid receipt key path.', { status: 403 });
    }

    const presignedUrl = await generateReceiptPresignedUrl(normalizedKey, 300);

    return NextResponse.redirect(presignedUrl, 307);
  } catch (error: any) {
    console.error('[API:Receipts Error]', error);
    return new NextResponse('Failed to access receipt document.', { status: 500 });
  }
}
