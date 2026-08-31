'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { UploadCloud, FileText, Image as ImageIcon, X } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

interface ExpenseAddFormProps {
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  minDate?: string;
  onCancel?: () => void;
}

export function ExpenseAddForm({
  divisions,
  categories,
  clients,
  createAction,
  minDate,
  onCancel,
}: ExpenseAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

  const validateFile = (file: File): boolean => {
    const mimeMatch = ALLOWED_TYPES.includes(file.type.toLowerCase());
    const nameMatch = /\.(pdf|png|jpe?g)$/i.test(file.name);
    if (!mimeMatch && !nameMatch) {
      toast.error('Only PDF, PNG, JPG, and JPEG files are allowed.');
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File size must be 10MB or less.');
      return false;
    }
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInputRef.current.files = dataTransfer.files;
        }
      } else {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      } else {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      setSelectedFile(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await createAction(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Expense added with receipt!');
        formRef.current?.reset();
        setSelectedFile(null);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field>
          <FieldLabel htmlFor="expense-date">
            Date <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="expense-date"
            name="date"
            type="date"
            required
            disabled={isPending}
            defaultValue={today}
            max={today}
            min={minDate}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-division">
            Division <span className="text-destructive">*</span>
          </FieldLabel>
          <Select name="divisionId" required disabled={isPending}>
            <SelectTrigger id="expense-division">
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-client">Client (Optional)</FieldLabel>
          <Select name="clientId" disabled={isPending}>
            <SelectTrigger id="expense-client">
              <SelectValue placeholder="No client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-category">
            Category <span className="text-destructive">*</span>
          </FieldLabel>
          <Select name="category" required disabled={isPending}>
            <SelectTrigger id="expense-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-description">Description</FieldLabel>
          <Input
            id="expense-description"
            name="description"
            type="text"
            placeholder="e.g. Server hosting"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-amount">
            Amount (ZAR) <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="expense-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={isPending}
            placeholder="e.g. 250.00"
          />
        </Field>

        <Field className="sm:col-span-2 lg:col-span-3">
          <FieldLabel>Receipt / Proof of Payment (Optional)</FieldLabel>
          <input
            ref={fileInputRef}
            id="expense-receipt"
            name="receipt"
            type="file"
            accept="image/*,.pdf"
            disabled={isPending}
            className="hidden"
            onChange={handleFileChange}
          />

          {!selectedFile ? (
            <div
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-150 text-center ${
                isDragging
                  ? 'border-primary bg-primary/10 text-primary scale-[1.01]'
                  : 'border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <UploadCloud className="size-8 mb-2 text-primary/70" />
              <p className="text-xs font-semibold text-foreground">
                Drag & drop receipt file here, or{' '}
                <span className="text-primary underline">browse</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Supports PDF, PNG, JPG, JPEG (Max 10MB) for SARS audit proof
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  {selectedFile.type.includes('image') ? (
                    <ImageIcon className="size-5" />
                  ) : (
                    <FileText className="size-5" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-xs font-semibold text-foreground truncate"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={removeFile}
                disabled={isPending}
              >
                <X className="size-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          )}
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4 mt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} size="sm">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'Adding…' : 'Add Expense'}
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
