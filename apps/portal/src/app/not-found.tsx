'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080c14] text-white px-6 py-12 relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center space-y-6">
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center size-24 rounded-2xl bg-white/[0.02] border border-white/10 shadow-2xl backdrop-blur-md animate-bounce duration-[2000ms]">
          <FileQuestion className="size-12 text-blue-400" />
          <div className="absolute -top-1 -right-1 size-3.5 bg-blue-500 rounded-full animate-ping" />
          <div className="absolute -top-1 -right-1 size-3.5 bg-blue-500 rounded-full" />
        </div>

        {/* Error Code & Message */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400/80">404 Error</span>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            The page you are looking for doesn't exist, has been moved, or you don't have access to it.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <Button asChild variant="default" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 py-5 rounded-lg">
            <Link href="/dashboard">
              <Home className="size-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white font-medium py-5 rounded-lg cursor-pointer"
            onClick={() => router.back()}
          >
            <ArrowLeft className="size-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
