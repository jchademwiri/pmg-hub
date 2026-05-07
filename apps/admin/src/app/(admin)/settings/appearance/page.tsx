import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Palette, Monitor, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'Appearance Settings' }

const themes = [
  { id: 'system', label: 'System', description: 'Follow OS preference', icon: Monitor },
  { id: 'light', label: 'Light', description: 'Always light', icon: Sun },
  { id: 'dark', label: 'Dark', description: 'Always dark', icon: Moon },
]

const densities = [
  { id: 'comfortable', label: 'Comfortable', description: 'More spacing, easier to scan' },
  { id: 'compact', label: 'Compact', description: 'Tighter layout, more data visible' },
]

export default function AppearanceSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ChevronLeft className="size-4" />
            Settings
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Appearance</h2>
              <Badge variant="secondary" className="text-xs">Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Theme and display preferences</p>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Theme</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how the interface looks.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/40 p-4 text-center opacity-60"
                >
                  <theme.icon className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{theme.label}</span>
                  <span className="text-xs text-muted-foreground">{theme.description}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Theme switching coming soon</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Density */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Display Density</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Control how much information is shown at once.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-3">
              {densities.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-4 opacity-60"
                >
                  <span className="text-sm font-medium">{d.label}</span>
                  <span className="text-xs text-muted-foreground">{d.description}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Density control coming soon</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Sidebar</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sidebar behaviour and default state.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Collapse sidebar by default</span>
                <span className="text-xs text-muted-foreground">Start with the sidebar collapsed on load</span>
              </div>
              <div className="h-5 w-9 rounded-full bg-muted border border-border shrink-0 opacity-60" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Remember last open group</span>
                <span className="text-xs text-muted-foreground">Keep the last expanded nav group open on return</span>
              </div>
              <div className="h-5 w-9 rounded-full bg-muted border border-border shrink-0 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button disabled>Save Changes</Button>
      </div>
    </div>
  )
}
