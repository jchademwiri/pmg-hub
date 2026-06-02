import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAllDivisions, getAllClients } from '@pmg/db';
import { getMinAllowedDate } from '@/lib/date-rules';
import { PaymentFormClient } from './payment-form-client';

export const metadata: Metadata = { title: 'Record Client Payment' };

export default async function AddPaymentPage() {
  const [divisions, clients, minDate] = await Promise.all([
    getAllDivisions(),
    getAllClients(),
    getMinAllowedDate(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/payments">
            <ChevronLeft className="size-4" />
            Back to Payments
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">Record Payment</h2>
          <p className="text-sm text-muted-foreground">Record and allocate a client payment received</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Record the total amount received and allocate it across outstanding invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentFormClient divisions={divisions} clients={clients} minDate={minDate} />
        </CardContent>
      </Card>
    </div>
  );
}
