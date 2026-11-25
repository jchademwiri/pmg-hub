'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
  Unlock,
  Plus,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import {
  PUBLIC_DOCUMENT_CATEGORIES,
  PUBLIC_DOCUMENT_CATEGORY_META,
  type PublicDocument,
  type PublicDocumentCategory,
} from '@pmg/db';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { createDocumentAction, updateDocumentAction } from './actions';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/(\d+)\.(\d+)/g, '$1-$2')
    .replace(/[.\s_()[\]{}#@!$%^&*+=~`|\\:;"'<>,?/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface DocumentPreset {
  label: string;
  code: string;
  title: string;
  subtitle: string;
  slug: string;
  category: PublicDocumentCategory;
  seoDescription: string;
  keywords: string;
  commonMistakes: string[];
}

const DOCUMENT_PRESETS: DocumentPreset[] = [
  {
    label: 'B-BBEE EME Affidavit',
    code: 'B-BBEE EME',
    title: 'B-BBEE EME Sworn Affidavit',
    subtitle: 'For Exempted Micro Enterprises with annual turnover ≤ R10 Million',
    slug: 'b-bbee-eme-sworn-affidavit',
    category: 'bbbee_affidavit',
    seoDescription:
      'Download the official B-BBEE EME Sworn Affidavit template for South African businesses with turnover under R10 million. Ready to complete and commission.',
    keywords:
      'b-bbee sworn affidavit, eme affidavit template, bee affidavit download, b-bbee level 1 affidavit',
    commonMistakes: [
      'Having the Commissioner of Oaths sign on a different date than the deponent — both dates must match exactly.',
      'Forgetting to tick the applicable B-BBEE Level box or leaving the financial year-end blank.',
      'Submitting an affidavit older than 12 months from the commissioning date.',
    ],
  },
  {
    label: 'B-BBEE QSE Affidavit',
    code: 'B-BBEE QSE',
    title: 'B-BBEE QSE Sworn Affidavit',
    subtitle: 'For Qualifying Small Enterprises (R10M–R50M, ≥51% Black-Owned)',
    slug: 'b-bbee-qse-sworn-affidavit',
    category: 'bbbee_affidavit',
    seoDescription:
      'Download the B-BBEE QSE Sworn Affidavit template for 51%+ Black-owned Qualifying Small Enterprises (R10M–R50M annual turnover) in South Africa.',
    keywords: 'b-bbee qse sworn affidavit, qse affidavit template, bee qse affidavit download',
    commonMistakes: [
      'Using a QSE affidavit when Black ownership is below 51% (requires a SANAS-accredited certificate instead).',
      'Mismatched dates between the deponent signature and Commissioner of Oaths stamp.',
      'Not specifying the exact latest financial year-end date.',
    ],
  },
  {
    label: 'SBD 4',
    code: 'SBD 4',
    title: 'Declaration of Interest',
    subtitle: 'Mandatory bidder disclosure of state employment and relationships',
    slug: 'sbd-4',
    category: 'sbd_form',
    seoDescription:
      'Download the official SBD 4 form (Declaration of Interest) required for all South African government tenders.',
    keywords: 'sbd 4, sbd 4 form download, declaration of interest pdf',
    commonMistakes: [
      'Failing to declare family members or directors employed by the state.',
      "Leaving sections blank instead of writing 'N/A'.",
    ],
  },
  {
    label: 'SBD 6.1',
    code: 'SBD 6.1',
    title: 'Preference Points Claim Form',
    subtitle: 'Claim 80/20 or 90/10 preference points for B-BBEE & specific goals',
    slug: 'sbd-6-1',
    category: 'sbd_form',
    seoDescription:
      'Download the official SBD 6.1 Preference Points Claim form in PDF for South African tenders.',
    keywords: 'sbd 6.1, sbd 6.1 form download, preference points claim form pdf',
    commonMistakes: [
      'Claiming points without attaching a valid B-BBEE affidavit or certificate.',
      'Using an outdated version of SBD 6.1.',
    ],
  },
  {
    label: 'MBD 4',
    code: 'MBD 4',
    title: 'Municipal Declaration of Interest',
    subtitle: 'Required declaration of interest for municipal tenders',
    slug: 'mbd-4',
    category: 'mbd_form',
    seoDescription:
      'Download the official MBD 4 Municipal Declaration of Interest form required for South African municipal tenders.',
    keywords: 'mbd 4, mbd 4 form download, municipal declaration of interest pdf',
    commonMistakes: [
      'Submitting an SBD 4 form instead of MBD 4 on a municipal tender.',
      'Leaving director ID numbers or municipal account details incomplete.',
    ],
  },
];

const ACCEPTED_FILE_EXTENSIONS = /\.(pdf|docx|xlsx)$/i;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: PublicDocument | null;
}

export function DocumentFormDialog({ open, onOpenChange, document }: DocumentFormDialogProps) {
  const isEdit = Boolean(document);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<PublicDocumentCategory>('sbd_form');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugUnlocked, setSlugUnlocked] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [content, setContent] = useState('');
  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [newMistake, setNewMistake] = useState('');
  const [sortOrder, setSortOrder] = useState('100');
  const [isPublished, setIsPublished] = useState(true);

  const populateForm = useCallback((doc?: PublicDocument | null) => {
    setFile(null);
    setError(null);
    setIsDragging(false);
    setSlugUnlocked(false);
    setNewMistake('');

    if (doc) {
      setCategory(doc.category || 'sbd_form');
      setCode(doc.code || '');
      setTitle(doc.title || '');
      setSubtitle(doc.subtitle || '');
      setSlug(doc.slug || '');
      setSeoTitle(doc.seoTitle || '');
      setSeoDescription(doc.seoDescription || '');
      setKeywordsText(Array.isArray(doc.keywords) ? doc.keywords.join(', ') : '');
      setContent(doc.content || '');
      setCommonMistakes(Array.isArray(doc.commonMistakes) ? doc.commonMistakes : []);
      setSortOrder(String(doc.sortOrder ?? 100));
      setIsPublished(doc.isPublished ?? true);
    } else {
      setCategory('bbbee_affidavit');
      setCode('');
      setTitle('');
      setSubtitle('');
      setSlug('');
      setSeoTitle('');
      setSeoDescription('');
      setKeywordsText('');
      setContent('');
      setCommonMistakes([]);
      setSortOrder('100');
      setIsPublished(true);
    }
  }, []);

  useEffect(() => {
    if (open) {
      populateForm(document);
    }
  }, [open, document, populateForm]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEdit && !slugUnlocked) {
      setSlug(slugify(val));
    }
  };

  const handlePresetSelect = (preset: DocumentPreset) => {
    setCategory(preset.category);
    setCode(preset.code);
    setTitle(preset.title);
    setSubtitle(preset.subtitle);
    setSlug(preset.slug);
    setSeoDescription(preset.seoDescription);
    setKeywordsText(preset.keywords);
    setCommonMistakes(preset.commonMistakes);
  };

  const processFile = useCallback(
    (selectedFile: File | null) => {
      setError(null);
      if (!selectedFile) return;

      const mimeOk = ACCEPTED_MIME_TYPES.has((selectedFile.type || '').toLowerCase());
      const extOk = ACCEPTED_FILE_EXTENSIONS.test(selectedFile.name);
      if (!mimeOk && !extOk) {
        setError('Please select a valid PDF, Word (.docx), or Excel (.xlsx) file.');
        return;
      }

      if (selectedFile.size > 25 * 1024 * 1024) {
        setError('File size exceeds the 25MB limit.');
        return;
      }

      setFile(selectedFile);

      if (!isEdit && !title.trim()) {
        const cleanBase = selectedFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        setTitle(cleanBase);
        if (!slugUnlocked) {
          setSlug(slugify(cleanBase));
        }
      }
    },
    [isEdit, title, slugUnlocked],
  );

  const addMistake = () => {
    const trimmed = newMistake.trim();
    if (!trimmed) return;
    setCommonMistakes((prev) => [...prev, trimmed]);
    setNewMistake('');
  };

  const removeMistake = (idx: number) => {
    setCommonMistakes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    if (!isEdit && !file) {
      setError('Please upload a PDF, Word (.docx), or Excel (.xlsx) template file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('category', category);
      formData.append('code', code.trim());
      formData.append('title', title.trim());
      formData.append('subtitle', subtitle.trim());
      formData.append('slug', slug.trim());
      formData.append('seoTitle', seoTitle.trim());
      formData.append('seoDescription', seoDescription.trim());
      formData.append(
        'keywords',
        JSON.stringify(
          keywordsText
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        ),
      );
      formData.append('content', content);
      formData.append('commonMistakes', JSON.stringify(commonMistakes));
      formData.append('sortOrder', sortOrder || '100');
      formData.append('isPublished', String(isPublished));

      if (isEdit && document) {
        await updateDocumentAction(document.id, formData);
        toast.success(`Updated "${title.trim()}"`);
      } else {
        await createDocumentAction(formData);
        toast.success(`Published "${title.trim()}" to tenderedgesolutions.co.za`);
      }

      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Document save failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while saving the template.',
      );
    } finally {
      setLoading(false);
    }
  };

  const categoryMeta = PUBLIC_DOCUMENT_CATEGORY_META[category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <FileUp className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {isEdit ? `Edit Template: ${document?.title}` : 'Upload Public Tender Template'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Manage PDF, Word (.docx), and Excel (.xlsx) templates hosted on Cloudflare R2 and
                  published directly to tenderedgesolutions.co.za/templates.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick Presets (Create Mode Only) */}
          {!isEdit && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  Quick Preset Fill
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Autofill SEO metadata &amp; common mistakes
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_PRESETS.map((preset) => {
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
          )}

          {/* Category + Code */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-category" className="text-xs font-medium">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as PublicDocumentCategory)}
              >
                <SelectTrigger id="doc-category" className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {PUBLIC_DOCUMENT_CATEGORY_META[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-code" className="text-xs font-medium">
                Short Code / Badge
              </Label>
              <Input
                id="doc-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. B-BBEE EME, SBD 4, MBD 4"
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Title + Slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title" className="text-xs font-medium">
                Document Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. B-BBEE EME Sworn Affidavit"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-slug" className="text-xs font-medium flex items-center gap-1.5">
                  {isEdit || !slugUnlocked ? (
                    <Lock className="size-3 text-muted-foreground" />
                  ) : (
                    <Unlock className="size-3 text-primary" />
                  )}
                  URL Slug
                </Label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setSlugUnlocked((v) => !v)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {slugUnlocked ? 'Lock auto-slug' : 'Edit slug'}
                  </button>
                )}
              </div>
              <Input
                id="doc-slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                readOnly={isEdit || !slugUnlocked}
                placeholder="b-bbee-eme-sworn-affidavit"
                className={`h-10 text-sm font-mono ${
                  isEdit || !slugUnlocked
                    ? 'bg-muted/60 text-muted-foreground cursor-not-allowed'
                    : ''
                }`}
                required
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="doc-subtitle" className="text-xs font-medium">
              Subtitle / Tagline
            </Label>
            <Input
              id="doc-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. For Exempted Micro Enterprises with annual turnover ≤ R10 Million"
              className="h-10 text-sm"
            />
          </div>

          {/* Live Public URL & R2 Path Preview */}
          <div className="space-y-1.5 px-3 py-2.5 rounded-md bg-muted/40 border border-border/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 text-primary shrink-0" />
              <span className="shrink-0 font-medium">Public URL:</span>
              <span className="font-mono text-[11px] text-foreground truncate">
                https://www.tenderedgesolutions.co.za/templates/{slug || 'your-slug'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="size-3.5 text-muted-foreground shrink-0" />
              <span className="shrink-0 font-medium">R2 Folder:</span>
              <span className="font-mono text-[11px] truncate">
                tender-templates/{categoryMeta.urlSlug}/{slug || 'your-slug'}-&lt;timestamp&gt;
              </span>
            </div>
          </div>

          {/* SEO Fields */}
          <div className="space-y-4 rounded-lg border border-border/60 p-4 bg-muted/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search Engine Optimization (SEO)
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="doc-seo-title" className="text-xs font-medium">
                  Custom SEO Title <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="doc-seo-title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={`Download ${code || title || 'Template'} | TenderEdge Solutions`}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-keywords" className="text-xs font-medium">
                  Target Keywords <span className="text-muted-foreground">(Comma-separated)</span>
                </Label>
                <Input
                  id="doc-keywords"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="b-bbee sworn affidavit, eme affidavit pdf, bee template"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-seo-desc" className="text-xs font-medium">
                  SEO Meta &amp; Card Summary
                </Label>
                <span
                  className={`text-[11px] ${
                    seoDescription.length > 165 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                >
                  {seoDescription.length} / 160 chars
                </span>
              </div>
              <Textarea
                id="doc-seo-desc"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={2}
                placeholder="Concise summary shown on Google search results and the /templates directory cards."
                className="text-sm"
              />
            </div>
          </div>

          {/* Rich Text Guide Content (Tiptap) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Guide &amp; Overview Content (Rich Text)</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Explain what this template is for, who needs it, and how to complete or commission it correctly..."
              minHeight="180px"
            />
          </div>

          {/* Common Mistakes List */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium">
              Common Mistakes to Avoid{' '}
              <span className="text-muted-foreground font-normal">
                (Shown as a highlighted checklist on the public page)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                value={newMistake}
                onChange={(e) => setNewMistake(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMistake();
                  }
                }}
                placeholder="e.g. Commissioner of Oaths date does not match deponent date..."
                className="h-9 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMistake}
                className="h-9"
              >
                <Plus className="size-4 mr-1" /> Add
              </Button>
            </div>
            {commonMistakes.length > 0 && (
              <ul className="space-y-1.5">
                {commonMistakes.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-xs"
                  >
                    <span className="leading-relaxed">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeMistake(idx)}
                      className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                      aria-label="Remove mistake"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* File Upload Zone */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Template File (PDF, DOCX, or XLSX){' '}
              {!isEdit ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">
                  (Optional — leave empty to keep current file)
                </span>
              )}
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => processFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            {isEdit && document && !file && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60 text-xs mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      Current file: {document.fileName || document.s3Key}
                    </p>
                    <p className="text-muted-foreground">
                      {formatFileSize(document.fileSize)} • {document.s3Key}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs shrink-0"
                >
                  Replace File
                </Button>
              </div>
            )}

            {!file && !isEdit ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-7 text-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <FileUp className="size-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  Click to select or drag and drop your template
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports PDF, Word (.docx), and Excel (.xlsx) up to 25MB.
                </p>
              </div>
            ) : file ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/80 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileText className="size-5" />
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
                    className="size-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sort Order + Publish Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border/60 p-4 bg-muted/10">
            <div className="flex items-center gap-3">
              <Switch id="doc-published" checked={isPublished} onCheckedChange={setIsPublished} />
              <div>
                <Label htmlFor="doc-published" className="text-sm font-medium cursor-pointer">
                  Publish to TenderEdge Website
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublished
                    ? 'Visible on /templates and included in Google XML sitemap.'
                    : 'Saved as draft — hidden from public visitors and search engines.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="doc-sort" className="text-xs text-muted-foreground">
                Sort Order
              </Label>
              <Input
                id="doc-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-20 h-9 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/60 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim() || !slug.trim() || (!isEdit && !file)}
              className="font-medium sm:ml-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {file ? 'Uploading to R2...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  {isEdit ? 'Save Changes' : 'Save & Publish Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
