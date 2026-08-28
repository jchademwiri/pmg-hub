'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  FileUp,
  CheckCircle2,
  X,
  Globe,
  Loader2,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadDocumentAction } from './actions';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const SBD_PRESETS = [
  { label: 'SBD 4', title: 'SBD 4', slug: 'sbd-4' },
  { label: 'SBD 6.1', title: 'SBD 6.1', slug: 'sbd-6-1' },
  { label: 'SBD 8', title: 'SBD 8', slug: 'sbd-8' },
  { label: 'SBD 9', title: 'SBD 9', slug: 'sbd-9' },
];

export function UploadDocumentButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(slugify(val));
  };

  const handlePresetSelect = (preset: (typeof SBD_PRESETS)[number]) => {
    setTitle(preset.title);
    setSlug(preset.slug);
  };

  const processFile = useCallback(
    (selectedFile: File | null) => {
      setError(null);
      if (!selectedFile) return;

      if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
        setError('Please select a valid PDF document.');
        return;
      }

      setFile(selectedFile);

      // Auto-extract title and slug from file name if title is empty
      if (!title) {
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
        const cleanTitle = baseName.toUpperCase().replace(/[-_]/g, ' ');
        setTitle(cleanTitle);
        setSlug(slugify(cleanTitle));
      }
    },
    [title],
  );

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setSlug('');
    setError(null);
    setIsDragging(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !slug.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('slug', slug.trim());

      await uploadDocumentAction(formData);

      // Close & reset
      setOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error('Document upload failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while uploading the document.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="font-semibold shadow-sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload New Document
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <FileUp className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Upload Public Document
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Upload an SBD Form PDF to Cloudflare R2 storage for instant lead generation and
                  download tracking.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-6">
          {/* Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                Quick Preset Fill
              </Label>
              <span className="text-[11px] text-muted-foreground">Click to autofill metadata</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SBD_PRESETS.map((preset) => {
                const isActive = slug === preset.slug;
                return (
                  <button
                    key={preset.slug}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium border transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card hover:bg-muted/50 border-border text-foreground hover:border-primary/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields: Title & Slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title" className="text-xs font-medium">
                Document Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. SBD 4"
                className="h-10 text-sm bg-background border-border/80 focus-visible:ring-primary"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                The display name on the portal & website.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-slug" className="text-xs font-medium flex items-center gap-1.5">
                <Lock className="size-3 text-muted-foreground" />
                URL Slug <span className="text-muted-foreground font-normal">(Read-only)</span>
              </Label>
              <Input
                id="doc-slug"
                value={slug}
                readOnly
                tabIndex={-1}
                placeholder="auto-generated-slug"
                className="h-10 text-sm font-mono bg-muted/60 text-muted-foreground border-border/60 cursor-not-allowed select-all focus-visible:ring-0 focus-visible:border-border/60"
              />
              <p className="text-[11px] text-muted-foreground">
                Auto-generated from title for search engine indexing.
              </p>
            </div>
          </div>

          {/* Live URL Preview */}
          {slug && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/60 text-xs text-muted-foreground">
              <Globe className="size-3.5 text-primary shrink-0" />
              <span className="shrink-0 font-medium">Public Page:</span>
              <span className="font-mono text-[11px] text-foreground truncate">
                https://tenderedgesolutions.co.za/sbd-forms/{slug}
              </span>
            </div>
          )}

          {/* Drag and Drop Zone (Bottom Area) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              PDF Document File <span className="text-destructive">*</span>
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => processFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 text-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[0.99] ring-2 ring-primary/20 shadow-inner'
                    : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3.5 transition-transform duration-200 group-hover:scale-105">
                  <FileUp className="size-7" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  Click to select or drag and drop your PDF
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Upload individual SBD forms or compliance PDFs. Maximum file size: 25MB.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  <Upload className="size-3.5" /> Browse from computer
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/80 shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileText className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-8"
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter className="pt-4 border-t border-border/60 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !file || !title.trim() || !slug.trim()}
              className="font-medium sm:ml-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Uploading to R2...
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  Save & Publish Document
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
