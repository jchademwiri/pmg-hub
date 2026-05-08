import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAllDivisions, getAllClients, getActiveItems } from '@pmg/db';
import { QuoteFormClient } from './quote-form-client';

export const metadata: Metadata = { title: 'New Quotation' };

export default async function NewQuotePage() {
  const [divisions, clients, activeItems] = await Promise.all([
    getAllDivisions(),
    getAllClients(),
    getActiveItems(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/quotes">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">New Quotation</h2>
          <p className="text-sm text-muted-foreground">Create a new quote for a client</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
          <CardDescription>Fill in the details for this quotation</CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteFormClient divisions={divisions} clients={clients} activeItems={activeItems} />
        </CardContent>
      </Card>
    </div>
  );
}
