'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
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
  RotateCcw,
  Save,
  Eye,
} from 'lucide-react';
import {
  PUBLIC_DOCUMENT_CATEGORIES,
  PUBLIC_DOCUMENT_CATEGORY_META,
  isPublicDocumentCategory,
  type PublicDocumentCategory,
} from '@pmg/utils/public-documents';
import type { PublicDocument } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePageHeader } from '@/components/navigation/page-header-context';
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

interface StoredDraft {
  category: PublicDocumentCategory;
  code: string;
  title: string;
  subtitle: string;
  slug: string;
  slugUnlocked: boolean;
  seoTitle: string;
  seoDescription: string;
  keywordsText: string;
  content: string;
  commonMistakes: string[];
  sortOrder: string;
  isPublished: boolean;
  savedAt: string;
}

function getInitialValues(doc?: PublicDocument | null): Omit<StoredDraft, 'savedAt'> {
  if (doc) {
    return {
      category: doc.category || 'sbd_form',
      code: doc.code || '',
      title: doc.title || '',
      subtitle: doc.subtitle || '',
      slug: doc.slug || '',
      slugUnlocked: false,
      seoTitle: doc.seoTitle || '',
      seoDescription: doc.seoDescription || '',
      keywordsText: Array.isArray(doc.keywords) ? doc.keywords.join(', ') : '',
      content: doc.content || '',
      commonMistakes: Array.isArray(doc.commonMistakes) ? doc.commonMistakes : [],
      sortOrder: String(doc.sortOrder ?? 100),
      isPublished: doc.isPublished ?? true,
    };
  }
  return {
    category: 'bbbee_affidavit',
    code: '',
    title: '',
    subtitle: '',
    slug: '',
    slugUnlocked: false,
    seoTitle: '',
    seoDescription: '',
    keywordsText: '',
    content: '',
    commonMistakes: [],
    sortOrder: '100',
    isPublished: true,
  };
}

interface DocumentEditorFormProps {
  document?: PublicDocument | null;
}

export function DocumentEditorForm({ document }: DocumentEditorFormProps) {
  const router = useRouter();
  const isEdit = Boolean(document);
  const storageKey =
    isEdit && document ? `pmg-admin:document-draft:${document.id}` : 'pmg-admin:document-draft:new';

  const initial = getInitialValues(document);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<PublicDocumentCategory>(initial.category);
  const [code, setCode] = useState(initial.code);
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [slug, setSlug] = useState(initial.slug);
  const [slugUnlocked, setSlugUnlocked] = useState(initial.slugUnlocked);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [keywordsText, setKeywordsText] = useState(initial.keywordsText);
  const [content, setContent] = useState(initial.content);
  const [commonMistakes, setCommonMistakes] = useState<string[]>(initial.commonMistakes);
  const [newMistake, setNewMistake] = useState('');
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);
  const [isPublished, setIsPublished] = useState(initial.isPublished);

  const [hydrated, setHydrated] = useState(false);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<'write' | 'preview'>('write');
  const { setRightContent, setCustomLabel } = usePageHeader();

  // Restore any unsaved draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredDraft>;
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.category === 'string' && isPublicDocumentCategory(parsed.category)) {
            setCategory(parsed.category);
          }
          if (typeof parsed.code === 'string') setCode(parsed.code);
          if (typeof parsed.title === 'string') setTitle(parsed.title);
          if (typeof parsed.subtitle === 'string') setSubtitle(parsed.subtitle);
          if (!isEdit && typeof parsed.slug === 'string') setSlug(parsed.slug);
          if (typeof parsed.slugUnlocked === 'boolean') setSlugUnlocked(parsed.slugUnlocked);
          if (typeof parsed.seoTitle === 'string') setSeoTitle(parsed.seoTitle);
          if (typeof parsed.seoDescription === 'string') setSeoDescription(parsed.seoDescription);
          if (typeof parsed.keywordsText === 'string') setKeywordsText(parsed.keywordsText);
          if (typeof parsed.content === 'string') setContent(parsed.content);
          if (Array.isArray(parsed.commonMistakes)) setCommonMistakes(parsed.commonMistakes);
          if (typeof parsed.sortOrder === 'string') setSortOrder(parsed.sortOrder);
          if (typeof parsed.isPublished === 'boolean') setIsPublished(parsed.isPublished);
          if (parsed.savedAt) {
            setRestoredAt(parsed.savedAt);
            setLastSavedAt(parsed.savedAt);
          }
        }
      }
    } catch (err) {
      console.warn('Could not restore document draft from localStorage:', err);
    } finally {
      setHydrated(true);
    }
  }, [storageKey, isEdit]);

  // Debounced auto-save to localStorage whenever form fields change
  useEffect(() => {
    if (!hydrated) return;

    const hasMeaningfulInput =
      Boolean(title.trim()) ||
      Boolean(subtitle.trim()) ||
      Boolean(code.trim()) ||
      Boolean(seoTitle.trim()) ||
      Boolean(seoDescription.trim()) ||
      Boolean(keywordsText.trim()) ||
      Boolean(content.trim()) ||
      commonMistakes.length > 0;

    if (!isEdit && !hasMeaningfulInput) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        const nowIso = new Date().toISOString();
        const payload: StoredDraft = {
          category,
          code,
          title,
          subtitle,
          slug,
          slugUnlocked,
          seoTitle,
          seoDescription,
          keywordsText,
          content,
          commonMistakes,
          sortOrder,
          isPublished,
          savedAt: nowIso,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
        setLastSavedAt(nowIso);
      } catch (err) {
        console.warn('Could not save draft to localStorage:', err);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    isEdit,
    storageKey,
    category,
    code,
    title,
    subtitle,
    slug,
    slugUnlocked,
    seoTitle,
    seoDescription,
    keywordsText,
    content,
    commonMistakes,
    sortOrder,
    isPublished,
  ]);

  const handleDiscardDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
    const defaults = getInitialValues(document);
    setCategory(defaults.category);
    setCode(defaults.code);
    setTitle(defaults.title);
    setSubtitle(defaults.subtitle);
    setSlug(defaults.slug);
    setSlugUnlocked(defaults.slugUnlocked);
    setSeoTitle(defaults.seoTitle);
    setSeoDescription(defaults.seoDescription);
    setKeywordsText(defaults.keywordsText);
    setContent(defaults.content);
    setCommonMistakes(defaults.commonMistakes);
    setSortOrder(defaults.sortOrder);
    setIsPublished(defaults.isPublished);
    setFile(null);
    setRestoredAt(null);
    setLastSavedAt(null);
    toast.info(isEdit ? 'Reverted to saved template values' : 'Cleared saved draft');
  }, [document, isEdit, storageKey]);

  const canSubmit =
    !loading && Boolean(title.trim()) && Boolean(slug.trim()) && (isEdit || Boolean(file));

  // Keep action buttons sticky in the admin TopNav so you can preview or save from any scroll depth
  useEffect(() => {
    setCustomLabel(isEdit ? 'Edit Template' : 'New Template');
    setRightContent(
      <div className="flex items-center gap-1.5 sm:gap-2">
        {lastSavedAt && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDiscardDraft}
            className="hidden sm:inline-flex h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            {isEdit ? 'Reset Changes' : 'Clear Draft'}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
          className="h-8 text-xs"
        >
          <Eye className="mr-1.5 size-3.5" />
          Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
          disabled={loading}
          className="hidden md:inline-flex h-8 text-xs"
        >
          <Link href="/documents">Cancel</Link>
        </Button>
        <Button
          type="submit"
          form="document-editor-form"
          size="sm"
          disabled={!canSubmit}
          className="h-8 text-xs font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              {file ? 'Uploading...' : 'Saving...'}
            </>
          ) : (
            <>
              <Upload className="mr-1.5 size-3.5" />
              {isEdit ? 'Save Changes' : 'Save & Publish'}
            </>
          )}
        </Button>
      </div>,
    );

    return () => {
      setRightContent(null);
      setCustomLabel(null);
    };
  }, [
    canSubmit,
    file,
    handleDiscardDraft,
    isEdit,
    lastSavedAt,
    loading,
    setCustomLabel,
    setRightContent,
  ]);

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

      const result =
        isEdit && document
          ? await updateDocumentAction(document.id, formData)
          : await createDocumentAction(formData);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit
          ? `Updated "${title.trim()}"`
          : `Published "${title.trim()}" to tenderedgesolutions.co.za`,
      );

      // Clear local draft on successful save
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }

      router.push('/documents');
      router.refresh();
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

  const categoryMeta =
    PUBLIC_DOCUMENT_CATEGORY_META[category] ?? PUBLIC_DOCUMENT_CATEGORY_META.other;
  const formattedSavedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;
  const serpTitle =
    seoTitle.trim() ||
    `Download ${code ? `${code}: ` : ''}${title || 'Your Tender Template'} | TenderEdge Solutions`;
  const serpDescription =
    seoDescription.trim() ||
    subtitle.trim() ||
    'Your SEO meta summary will appear here on Google search results and the /templates hub.';

  return (
    <>
      <form
        id="document-editor-form"
        onSubmit={handleSubmit}
        className="flex-1 space-y-6 p-6 md:p-8 pt-6 max-w-7xl mx-auto w-full"
      >
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-1">
            <Link
              href="/documents"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to Public Templates
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {isEdit ? `Edit Template: ${document?.title}` : 'Upload Public Tender Template'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Your progress is automatically saved to this browser as you type. Use the sticky top
              bar to preview or save at any time.
            </p>
          </div>
        </div>

        {/* Restored Draft Notice */}
        {restoredAt && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
            <div className="flex items-center gap-2.5 text-foreground">
              <Save className="size-4 text-primary shrink-0" />
              <span>
                <strong>Unsaved draft restored</strong> from{' '}
                {new Date(restoredAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                . {!isEdit && 'Re-select your template file before publishing.'}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-7 text-xs shrink-0"
            >
              <RotateCcw className="mr-1.5 size-3" />
              Discard Draft
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Layout */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Main Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Presets (Create Mode Only) */}
            {!isEdit && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Quick Preset Fill
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click a preset to autofill South African tender metadata, SEO keywords, and
                    common mistakes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Core Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Details</CardTitle>
                <CardDescription>
                  Core identity, category classification, and public URL slug.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-category" className="text-xs font-medium">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={category}
                      onValueChange={(val) => {
                        if (isPublicDocumentCategory(val)) setCategory(val);
                      }}
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
                      <Label
                        htmlFor="doc-slug"
                        className="text-xs font-medium flex items-center gap-1.5"
                      >
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
                <div className="space-y-1.5 px-3.5 py-3 rounded-md bg-muted/40 border border-border/60 text-xs text-muted-foreground">
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
                      tender-templates/{categoryMeta.urlSlug}/{slug || 'your-slug'}
                      -&lt;timestamp&gt;
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guide & Overview (Tiptap Rich Text with GitHub-style Write / Preview Tabs) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Guide &amp; Completion Instructions</CardTitle>
                    <CardDescription>
                      Write or paste Markdown / rich text using headings, lists, and links — drives
                      organic Google search traffic.
                    </CardDescription>
                  </div>
                  <div
                    role="tablist"
                    aria-label="Guide editor view"
                    className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 self-start sm:self-auto shrink-0"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={guideTab === 'write'}
                      onClick={() => setGuideTab('write')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        guideTab === 'write'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={guideTab === 'preview'}
                      onClick={() => setGuideTab('preview')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        guideTab === 'preview'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {guideTab === 'write' ? (
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Explain what this template is for, who qualifies, and step-by-step instructions on completing or commissioning it..."
                    minHeight="300px"
                  />
                ) : (
                  <div className="min-h-[300px] rounded-lg border border-border/80 bg-muted/20 p-5">
                    {content.trim() ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_mark]:rounded [&_mark]:bg-amber-400/30 [&_mark]:px-1"
                        dangerouslySetInnerHTML={{ __html: content }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nothing to preview yet. Switch to Write and add your guide content.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Common Mistakes Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Common Mistakes to Avoid</CardTitle>
                <CardDescription>
                  Rendered as a highlighted warning checklist on the public template page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                    className="h-10 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMistake}
                    className="h-10 shrink-0"
                  >
                    <Plus className="size-4 mr-1.5" /> Add Mistake
                  </Button>
                </div>

                {commonMistakes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No common mistakes added yet. Adding 2–4 real tender disqualification pitfalls
                    significantly improves SEO and visitor trust.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {commonMistakes.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-2.5 text-sm"
                      >
                        <span className="leading-relaxed">{item}</span>
                        <button
                          type="button"
                          onClick={() => removeMistake(idx)}
                          className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                          aria-label="Remove mistake"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticky Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Publishing & Autosave Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label htmlFor="doc-published" className="text-sm font-medium cursor-pointer">
                      Publish to Website
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isPublished
                        ? 'Live on /templates and included in Google XML sitemap.'
                        : 'Hidden draft — only visible in Admin.'}
                    </p>
                  </div>
                  <Switch
                    id="doc-published"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
                  <div>
                    <Label htmlFor="doc-sort" className="text-xs font-medium">
                      Sort Order
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Lower numbers appear first</p>
                  </div>
                  <Input
                    id="doc-sort"
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-24 h-9 text-sm"
                  />
                </div>

                {formattedSavedTime && (
                  <div className="flex items-center gap-2 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
                    <Save className="size-3.5 text-emerald-500 shrink-0" />
                    <span>Draft auto-saved locally at {formattedSavedTime}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Upload Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Template File {!isEdit && <span className="text-destructive">*</span>}
                </CardTitle>
                <CardDescription className="text-xs">
                  PDF, Word (.docx), or Excel (.xlsx) up to 25MB.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => processFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {isEdit && document && !file && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs space-y-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="size-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {document.fileName || document.s3Key}
                        </p>
                        <p className="text-muted-foreground truncate">
                          {formatFileSize(document.fileSize)} • {document.s3Key}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-8 text-xs"
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
                    className={`flex flex-col items-center justify-center p-6 text-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                      isDragging
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-card'
                    }`}
                  >
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary mb-2.5">
                      <FileUp className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Click or drag &amp; drop file
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">PDF, DOCX, or XLSX</p>
                  </div>
                ) : file ? (
                  <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-foreground truncate">
                            {file.name}
                          </p>
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-8 text-xs"
                    >
                      Change File
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* SEO Card + Live Google Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SEO &amp; Search Preview</CardTitle>
                <CardDescription className="text-xs">
                  Optimize how this template ranks on Google for SBD, B-BBEE, and affidavit
                  searches.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="doc-seo-title" className="text-xs font-medium">
                    Custom SEO Title <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="doc-seo-title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={`Download ${code || title || 'Template'} | TenderEdge Solutions`}
                    className="h-9 text-xs"
                  />
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
                      {seoDescription.length} / 160
                    </span>
                  </div>
                  <Textarea
                    id="doc-seo-desc"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                    placeholder="Concise summary shown on Google search results and /templates cards."
                    className="text-xs"
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
                    placeholder="b-bbee sworn affidavit, eme affidavit pdf"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Google SERP Preview */}
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Google Search Preview
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                    tenderedgesolutions.co.za › templates › {slug || 'your-slug'}
                  </p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 leading-snug line-clamp-2">
                    {serpTitle}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {serpDescription}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Live Template Page Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {code && (
                <span className="font-semibold uppercase tracking-wider text-primary">{code}</span>
              )}
              <span>•</span>
              <span>{categoryMeta.label}</span>
              <span>•</span>
              <span className="font-mono text-[11px] truncate">
                tenderedgesolutions.co.za/templates/{slug || 'your-slug'}
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {title || 'Untitled Tender Template'}
            </DialogTitle>
            {subtitle && <DialogDescription className="text-sm">{subtitle}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-8 py-4">
            {content.trim() ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_mark]:rounded [&_mark]:bg-amber-400/30 [&_mark]:px-1"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No guide content written yet. Add headings, steps, and checklists in the editor to
                preview them here.
              </p>
            )}

            {commonMistakes.length > 0 && (
              <div className="pt-6 border-t border-border/60 space-y-3">
                <h2 className="text-lg font-bold text-primary">Common Mistakes to Avoid</h2>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {commonMistakes.map((mistake, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
