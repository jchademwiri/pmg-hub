import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ItemFormClient } from './item-form-client';

export const metadata: Metadata = { title: 'New Item' };

export default function NewItemPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/billing/items">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h2 className="text-lg font-semibold">New Item</h2>
          <p className="text-sm text-muted-foreground">Create a new service item</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>Basic information about this service item</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemFormClient />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
