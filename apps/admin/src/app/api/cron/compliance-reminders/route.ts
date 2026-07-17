import { NextResponse } from 'next/server';
import { getUpcomingExpirationsForReminders, db, clients, eq } from '@pmg/db';
import { createEmailClient, ComplianceReminderEmail, DEFAULT_REPLY_TO, resolveResendApiKey, resolveDefaultFromEmail, resolveFromEmail } from '@pmg/emails';
import React from 'react';
import { getPortalBaseUrl } from '@/lib/portal-url';
import { addDays } from '@pmg/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  // 1. Validate Cron Secret
  const authHeader = req.headers.get('authorization');
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (!CRON_SECRET) {
    return new NextResponse('Configuration Error: CRON_SECRET is missing', { status: 500 });
  }

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. Fetch upcoming expirations bounded by yesterday and 60 days in the future
    const allDocuments = await getUpcomingExpirationsForReminders();
    
    // Date math setup
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const is25th = today.getDate() === 25;
    const is10th = today.getDate() === 10;
    
    const exactly14Days = addDays(todayStr, 14);
    const exactly7Days = addDays(todayStr, 7);
    const yesterday = addDays(todayStr, -1);
    
    const currentYearMonth = todayStr.substring(0, 7); // YYYY-MM

    // 3. Group by Client ID
    const grouped = new Map<string, typeof allDocuments>();
    for (const doc of allDocuments) {
      if (!grouped.has(doc.clientId)) grouped.set(doc.clientId, []);
      grouped.get(doc.clientId)!.push(doc);
    }

    const portalUrl = `${getPortalBaseUrl()}/compliance`;
    let emailsSent = 0;

    // 4. Process each client
    for (const [clientId, docs] of grouped.entries()) {
      const expiringToNotify = [];

      for (const doc of docs) {
        let statusText = '';
        const docExpYearMonth = doc.expiryDate.substring(0, 7);
        
        if (doc.expiryDate === exactly14Days) {
          statusText = 'Expiring in 14 days';
        } else if (doc.expiryDate === exactly7Days) {
          statusText = 'Expiring in 7 days';
        } else if (doc.expiryDate === yesterday) {
          statusText = 'Expired Yesterday';
        } else if (is10th && docExpYearMonth === currentYearMonth) {
          statusText = 'Expiring This Month';
        } else if (is25th) {
          // 2-month lookahead
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          const nextNextMonth = new Date(today);
          nextNextMonth.setMonth(nextNextMonth.getMonth() + 2);
          
          if (docExpYearMonth === nextMonth.toISOString().substring(0, 7) || 
              docExpYearMonth === nextNextMonth.toISOString().substring(0, 7)) {
            statusText = `Expiring in ${docExpYearMonth}`;
          }
        }

        if (statusText) {
          expiringToNotify.push({
            documentType: doc.documentType,
            customName: doc.customName,
            expiryDate: doc.expiryDate,
            status: statusText,
          });
        }
      }

      // If this client has documents matching today's notification rules, send email
      if (expiringToNotify.length > 0) {
        // Get client email
        const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
        if (client && client.email && client.isActive) {
          // Resolve standard email configuration (using root PMG since we don't fetch division billing here for brevity, 
          // or we can use default PMG config)
          const apiKey = process.env.PMG_RESEND_API_KEY!;
          const fromEmail = 'noreply@info.playhousemedia.co.za';
          
          const emailClient = createEmailClient({
            apiKey,
            from: `Playhouse Media Group <${fromEmail}>`,
            adminEmail: fromEmail,
          });

          await emailClient({
            to: client.email,
            subject: 'Action Required: Compliance Documents Expiring',
            react: React.createElement(ComplianceReminderEmail, {
              recipientName: client.name,
              documents: expiringToNotify,
              portalUrl,
            }),
            replyTo: DEFAULT_REPLY_TO,
            idempotencyKey: `compliance-reminder/${clientId}/${todayStr}`,
          });
          
          emailsSent++;
        }
      }
    }

    return NextResponse.json({ success: true, processedClients: grouped.size, emailsSent });
  } catch (error: any) {
    console.error('Compliance Cron Error:', error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
