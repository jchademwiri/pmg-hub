'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  Upload,
  Search,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  FileText,
  Download,
  TrendingUp,
  X,
  Globe,
} from 'lucide-react';
import {
  PUBLIC_DOCUMENT_CATEGORIES,
  PUBLIC_DOCUMENT_CATEGORY_META,
  type PublicDocument,
  type PublicDocumentCategory,
} from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  toggleDocumentPublishAction,
  deleteDocumentAction,
  getDocumentPreviewUrlAction,
} from './actions';

const PUBLIC_BASE_URL = 'https://www.tenderedgesolutions.co.za';

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFormatBadge(mimeType: string | null | undefined, fileName: string | null | undefined) {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) {
    return {
      label: 'DOCX',
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    };
  }
  if (mime.includes('spreadsheetml') || name.endsWith('.xlsx')) {
    return {
      label: 'XLSX',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
  }
  return {
    label: 'PDF',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  };
}

interface DocumentsTableClientProps {
  documents: PublicDocument[];
  canDelete: boolean;
}

export function DocumentsTableClient({ documents, canDelete }: DocumentsTableClientProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | PublicDocumentCategory>('all');
  const [deletingDoc, setDeletingDoc] = useState<PublicDocument | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const published = documents.filter((d) => d.isPublished).length;
    const totalDownloads = documents.reduce((acc, d) => acc + (d.downloadCount || 0), 0);
    const totalViews = documents.reduce((acc, d) => acc + (d.viewCount || 0), 0);
    const topDoc =
      documents.length > 0
        ? [...documents].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))[0]
        : null;
    const conversionRate =
      totalViews > 0 ? `${Math.min(100, Math.round((totalDownloads / totalViews) * 100))}%` : null;

    return {
      total: documents.length,
      published,
      drafts: documents.length - published,
      totalViews,
      totalDownloads,
      topDoc,
      conversionRate,
    };
  }, [documents]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.slug.toLowerCase().includes(q) ||
        (doc.code || '').toLowerCase().includes(q) ||
        (doc.subtitle || '').toLowerCase().includes(q)
      );
    });
  }, [documents, search, selectedCategory]);

  const handleTogglePublish = (doc: PublicDocument, checked: boolean) => {
    startTransition(async () => {
      try {
        const res = await toggleDocumentPublishAction(doc.id, checked);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(
          checked ? `"${doc.title}" is now live on /templates` : `"${doc.title}" moved to draft`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update publish status');
      }
    });
  };

  const handlePreview = async (doc: PublicDocument) => {
    try {
      const res = await getDocumentPreviewUrlAction(doc.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate preview link');
    }
  };

  const handleCopyLink = async (doc: PublicDocument) => {
    const url = `${PUBLIC_BASE_URL}/templates/${doc.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Public template URL copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingDoc) return;
    const target = deletingDoc;
    startTransition(async () => {
      try {
        const res = await deleteDocumentAction(target.id);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(`Deleted "${target.title}" and removed file from R2`);
        setDeletingDoc(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete template');
      }
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Public Tender Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, edit, and publish SBD forms, B-BBEE sworn affidavits, MBD forms, and compliance
            templates directly to tenderedgesolutions.co.za/templates.
          </p>
        </div>
        <Button asChild className="font-semibold shadow-sm shrink-0">
          <Link href="/documents/new">
            <Upload className="mr-2 h-4 w-4" />
            Upload New Template
          </Link>
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Templates
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <FileText className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold tabular-nums tracking-tight">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium">{stats.published} live</span>
              {' · '}
              <span>{stats.drafts} drafts</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Page Visits
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Eye className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold tabular-nums tracking-tight">
              {stats.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique session visits on /templates
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Downloads
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Download className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold tabular-nums tracking-tight">
              {stats.totalDownloads.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {stats.topDoc
                ? `Top: ${stats.topDoc.code || stats.topDoc.title} (${stats.topDoc.downloadCount})`
                : 'No downloads yet'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Download Rate
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold tabular-nums tracking-tight">
              {stats.conversionRate ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.conversionRate ? 'Downloads per page visit' : 'Tracking starts on next visit'}
            </p>
          </div>
        </div>
      </div>

      {/* Wide Search Bar above Template Library */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by title, code (e.g. SBD 4, B-BBEE EME), subtitle, or URL slug..."
            className="pl-10 pr-10 h-11 text-sm bg-card border-border/80"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {(search || selectedCategory !== 'all') && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span>
              Showing <strong className="text-foreground">{filteredDocs.length}</strong> of{' '}
              {documents.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="h-8 text-xs"
            >
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="border-border/80">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Template Library</CardTitle>
            <CardDescription className="mt-1">
              Hosted on Cloudflare R2 (
              <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                tender-templates/*
              </code>
              ) with automatic SEO pages and dynamic XML sitemap indexing.
            </CardDescription>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              All ({documents.length})
            </button>
            {PUBLIC_DOCUMENT_CATEGORIES.map((cat) => {
              const count = documents.filter((d) => d.category === cat).length;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {PUBLIC_DOCUMENT_CATEGORY_META[cat].label} ({count})
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Public URL</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="w-14 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground h-28">
                    {documents.length === 0
                      ? 'No templates uploaded yet. Click "Upload New Template" to get started.'
                      : 'No templates match your current filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  const catMeta =
                    PUBLIC_DOCUMENT_CATEGORY_META[doc.category] ||
                    PUBLIC_DOCUMENT_CATEGORY_META.other;
                  const fmt = getFormatBadge(doc.mimeType, doc.fileName || doc.s3Key);
                  const sizeLabel = formatFileSize(doc.fileSize);

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 max-w-xs">
                          <div className="flex items-center gap-2">
                            {doc.code && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 shrink-0"
                              >
                                {doc.code}
                              </Badge>
                            )}
                            <Link
                              href={`/documents/${doc.id}/edit`}
                              className="font-medium truncate hover:text-primary hover:underline"
                            >
                              {doc.title}
                            </Link>
                          </div>
                          {doc.subtitle && (
                            <span className="text-xs text-muted-foreground truncate">
                              {doc.subtitle}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal whitespace-nowrap"
                        >
                          {catMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${fmt.className}`}
                          >
                            {fmt.label}
                          </span>
                          {sizeLabel && (
                            <span className="text-[11px] text-muted-foreground">{sizeLabel}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Switch
                            checked={doc.isPublished}
                            disabled={isPending}
                            onCheckedChange={(checked) => handleTogglePublish(doc, checked)}
                            aria-label={`Toggle publish for ${doc.title}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {doc.isPublished ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`${PUBLIC_BASE_URL}/templates/${doc.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono whitespace-nowrap"
                        >
                          /templates/{doc.slug}
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="font-semibold text-foreground">
                          {(doc.viewCount || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDate(doc.lastViewedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="font-bold text-foreground">
                          {(doc.downloadCount || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDate(doc.lastDownloadedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(doc.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-1.5">
                            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                              Template Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              asChild
                              className="cursor-pointer whitespace-nowrap py-2"
                            >
                              <Link
                                href={`/documents/${doc.id}/edit`}
                                className="flex items-center gap-2.5"
                              >
                                <Pencil className="size-4 text-muted-foreground shrink-0" />
                                <span>Edit template</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePreview(doc)}
                              className="cursor-pointer whitespace-nowrap py-2 flex items-center gap-2.5"
                            >
                              <Eye className="size-4 text-muted-foreground shrink-0" />
                              <span>Preview / Download file</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              asChild
                              className="cursor-pointer whitespace-nowrap py-2"
                            >
                              <a
                                href={`${PUBLIC_BASE_URL}/templates/${doc.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2.5"
                              >
                                <Globe className="size-4 text-muted-foreground shrink-0" />
                                <span>Open public page</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(doc)}
                              className="cursor-pointer whitespace-nowrap py-2 flex items-center gap-2.5"
                            >
                              <Copy className="size-4 text-muted-foreground shrink-0" />
                              <span>Copy public link</span>
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingDoc(doc)}
                                  className="cursor-pointer whitespace-nowrap py-2 flex items-center gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="size-4 shrink-0" />
                                  <span>Delete template</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={Boolean(deletingDoc)} onOpenChange={(o) => !o && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deletingDoc?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the template from the database, delete its file from
              Cloudflare R2, and make{' '}
              <code className="text-xs font-mono">/templates/{deletingDoc?.slug}</code> return a
              404. If you only want to hide it temporarily, toggle Published off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
