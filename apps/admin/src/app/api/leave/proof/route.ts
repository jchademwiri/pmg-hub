import { NextResponse } from 'next/server';
import { auth, requireRole } from '@/lib/auth';
import { isValidLeaveProofKey } from '@/lib/leave';
import { generateLeaveProofPresignedUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!requireRole(session, 'admin')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key || typeof key !== 'string') {
      return new NextResponse('Missing proof key parameter.', { status: 400 });
    }

    const normalizedKey = key.trim();
    if (!isValidLeaveProofKey(normalizedKey)) {
      return new NextResponse('Invalid proof key path.', { status: 403 });
    }

    const presignedUrl = await generateLeaveProofPresignedUrl(normalizedKey, 300);
    return NextResponse.redirect(presignedUrl, 307);
  } catch (error: unknown) {
    console.error('[API:LeaveProof Error]', error);
    return new NextResponse('Failed to access leave proof document.', { status: 500 });
  }
}
