'use client';

import * as React from 'react';
import { Expand, Loader2, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PreviewMode = 'desktop' | 'mobile';

type EmailPreviewPanelProps = {
  html: string;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string | null;
  minHeightClassName?: string;
};

const modeWidths: Record<PreviewMode, string> = {
  desktop: '600px',
  mobile: '375px',
};

function PreviewFrame({
  html,
  mode,
  title,
  className,
}: {
  html: string;
  mode: PreviewMode;
  title: string;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-[#eef1f5] p-4">
      <iframe
        title={title}
        sandbox=""
        srcDoc={html}
        className={className}
        style={{
          width: modeWidths[mode],
          maxWidth: '100%',
          minHeight: '100%',
          border: 0,
          background: '#ffffff',
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.12)',
        }}
      />
    </div>
  );
}

export function EmailPreviewPanel({
  html,
  title = 'Preview',
  description = '600px email canvas',
  isLoading = false,
  error,
  minHeightClassName = 'min-h-[620px]',
}: EmailPreviewPanelProps) {
  const [mode, setMode] = React.useState<PreviewMode>('desktop');

  return (
    <div className={`mx-auto flex h-full w-full max-w-[720px] flex-col rounded-md border bg-background ${minHeightClassName}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2">
        <div>
          <span className="text-sm font-medium">{title}</span>
          <p className="text-xs text-muted-foreground">
            {mode === 'desktop' ? description : '375px mobile email canvas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Rendering
            </span>
          )}
          <Tabs value={mode} onValueChange={(value) => setMode(value as PreviewMode)}>
            <TabsList>
              <TabsTrigger value="desktop" title="Desktop preview">
                <Monitor data-icon="inline-start" />
                Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" title="Mobile preview">
                <Smartphone data-icon="inline-start" />
                Mobile
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" disabled={!html || Boolean(error)}>
                <Expand />
                <span className="sr-only">Open full preview</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="h-[94vh] w-[calc(100vw-2rem)] max-w-5xl p-0">
              <DialogHeader className="border-b px-5 pt-5">
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 p-5">
                <EmailPreviewPanel
                  html={html}
                  title="Full Preview"
                  description={description}
                  error={error}
                  isLoading={isLoading}
                  minHeightClassName="min-h-[calc(94vh-120px)]"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? (
        <div className="p-4 text-sm text-destructive">{error}</div>
      ) : html ? (
        <PreviewFrame html={html} mode={mode} title={`${title} ${mode}`} />
      ) : (
        <div className="p-4 text-sm text-muted-foreground">Preview will appear here.</div>
      )}
    </div>
  );
}
