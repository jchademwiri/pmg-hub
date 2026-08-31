'use client';

import { useState, useRef } from 'react';
import { formatZAR } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';

interface SankeyDiagramProps {
  revenue: number;
  expenses: number;
  pmgShare: number;
  profitPool: number;
  ledgerBalances?: {
    pmg_share: { expected: number; spent: number; available: number };
  };
  onNodeClick?: (nodeId: string) => void;
}

export function SankeyDiagram({
  revenue,
  expenses,
  pmgShare,
  profitPool,
  ledgerBalances,
  onNodeClick,
}: SankeyDiagramProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pmg-allocation-flow.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 840 * 2;
      canvas.height = 410 * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `pmg-allocation-flow.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const isProfitable = profitPool > 0;
  const netRevenue = revenue - pmgShare;

  // Percentage distribution calculations relative to Gross Cash Receipts
  const pmgPct = revenue > 0 ? (pmgShare / revenue) * 100 : 0;
  const netPct = revenue > 0 ? (netRevenue / revenue) * 100 : 0;
  const expPct = revenue > 0 ? (expenses / revenue) * 100 : 0;
  const poolPct = revenue > 0 ? (profitPool / revenue) * 100 : 0;

  // SVG coordinate configuration
  const width = 840;
  const height = 410;

  // Nodes definition with explicit full-color attributes for SVG/PNG export support
  const nodes = [
    {
      id: 'gross',
      label: 'Gross Cash Receipts',
      val: revenue,
      pct: '100%',
      x: 50,
      y: 180,
      w: 155,
      h: 48,
      stroke: '#10b981',
      fill: '#091a14',
      labelColor: '#a1a1aa',
      valColor: '#ffffff',
      pctBg: '#064e3b',
      pctColor: '#34d399',
    },
    {
      id: 'pmg',
      label: 'PMG Share',
      val: pmgShare,
      pct: `${pmgPct.toFixed(1)}%`,
      x: 340,
      y: ledgerBalances ? 90 : 110,
      w: 160,
      h: ledgerBalances ? 68 : 48,
      stroke: '#3b82f6',
      fill: '#0f172a',
      labelColor: '#a1a1aa',
      valColor: '#ffffff',
      pctBg: '#1e3a8a',
      pctColor: '#60a5fa',
      hasBalances: !!ledgerBalances,
      spent: ledgerBalances?.pmg_share.spent,
      available: ledgerBalances?.pmg_share.available,
    },
    {
      id: 'net',
      label: 'Net Cash Receipts',
      val: netRevenue,
      pct: `${netPct.toFixed(1)}%`,
      x: 340,
      y: 260,
      w: 160,
      h: 48,
      stroke: '#10b981',
      fill: '#091a14',
      labelColor: '#a1a1aa',
      valColor: '#ffffff',
      pctBg: '#064e3b',
      pctColor: '#34d399',
    },
    {
      id: 'expenses',
      label: 'Expenses',
      val: expenses,
      pct: `${expPct.toFixed(1)}%`,
      x: 620,
      y: 110,
      w: 160,
      h: 48,
      stroke: '#f59e0b',
      fill: '#1c1917',
      labelColor: '#a1a1aa',
      valColor: '#ffffff',
      pctBg: '#451a03',
      pctColor: '#fbbf24',
    },
    {
      id: 'pool',
      label: isProfitable ? 'Profit Pool' : 'Net Deficit',
      val: Math.abs(profitPool),
      pct: `${poolPct.toFixed(1)}%`,
      x: 620,
      y: 260,
      w: 160,
      h: 48,
      stroke: isProfitable ? '#10b981' : '#ef4444',
      fill: isProfitable ? '#091a14' : '#1f1213',
      labelColor: '#a1a1aa',
      valColor: '#ffffff',
      pctBg: isProfitable ? '#064e3b' : '#7f1d1d',
      pctColor: isProfitable ? '#34d399' : '#f87171',
    },
  ];

  // Links definitions with explicit full-color stroke attributes
  const links = [
    {
      id: 'link-gross-pmg',
      source: 'gross',
      target: 'pmg',
      val: pmgShare,
      pct: `${pmgPct.toFixed(1)}%`,
      stroke: '#3b82f6',
    },
    {
      id: 'link-gross-net',
      source: 'gross',
      target: 'net',
      val: netRevenue,
      pct: `${netPct.toFixed(1)}%`,
      stroke: '#10b981',
    },
    {
      id: 'link-net-expenses',
      source: 'net',
      target: 'expenses',
      val: expenses,
      pct: `${expPct.toFixed(1)}%`,
      stroke: '#f59e0b',
    },
    {
      id: 'link-net-pool',
      source: 'net',
      target: 'pool',
      val: Math.abs(profitPool),
      pct: `${poolPct.toFixed(1)}%`,
      stroke: isProfitable ? '#10b981' : '#ef4444',
    },
  ];

  // Link helper (cubic bezier link paths)
  const getLinkPath = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.abs(x1 - x0) / 2;
    return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`;
  };

  // Max stroke width for styling links
  const maxStroke = 32;
  const getStrokeWidth = (val: number) => {
    const ratio = revenue !== 0 ? val / revenue : 0;
    return Math.max(4, ratio * maxStroke);
  };

  // Hover helper logic
  const isLinkActive = (link: (typeof links)[0]) => {
    if (!hoveredId) return false;
    if (hoveredId === link.id) return true;
    return hoveredId === link.source || hoveredId === link.target;
  };

  const isNodeActive = (nodeId: string) => {
    if (!hoveredId) return false;
    if (hoveredId === nodeId) return true;
    const activeLink = links.find((l) => l.id === hoveredId);
    if (activeLink) return activeLink.source === nodeId || activeLink.target === nodeId;
    return links.some(
      (l) =>
        (l.source === hoveredId && l.target === nodeId) ||
        (l.target === hoveredId && l.source === nodeId),
    );
  };

  return (
    <Card className="rounded-xl border border-border bg-gradient-to-tr from-card to-card/75 backdrop-blur-md shadow-none hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Allocation Route — Flow & % Distribution</span>
            </CardTitle>
            <CardDescription>
              Interactive income flow routing. Hover over nodes or flow lines to highlight
              distribution paths.
            </CardDescription>
          </div>

          {/* Summary Percentage Distribution Badges & Export Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              PMG Share: {pmgPct.toFixed(1)}%
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Expenses: {expPct.toFixed(1)}%
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                isProfitable
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
              )}
            >
              Net Profit: {poolPct.toFixed(1)}%
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 ml-1">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPNG} className="text-xs cursor-pointer">
                  Download PNG (High Res)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSVG} className="text-xs cursor-pointer">
                  Download SVG (Vector)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="w-full overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[760px] h-auto overflow-visible select-none"
            style={{ backgroundColor: '#09090b' }}
          >
            {/* Background Rect for standalone SVG/PNG rendering */}
            <rect width={width} height={height} fill="#09090b" rx="12" />

            {/* Draw Links */}
            {links.map((link) => {
              const srcNode = nodes.find((n) => n.id === link.source)!;
              const tgtNode = nodes.find((n) => n.id === link.target)!;

              const x0 = srcNode.x + srcNode.w;
              const y0 = srcNode.y + srcNode.h / 2;
              const x1 = tgtNode.x;
              const y1 = tgtNode.y + tgtNode.h / 2;

              const baseWidth = getStrokeWidth(link.val);
              const active = isLinkActive(link);
              const strokeWidth = active ? baseWidth + 3 : baseWidth;
              const opacity = active ? 0.95 : 0.55;
              const midX = (x0 + x1) / 2;
              const midY = (y0 + y1) / 2;

              return (
                <g
                  key={link.id}
                  className="cursor-pointer group/link"
                  onMouseEnter={() => setHoveredId(link.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <path
                    d={getLinkPath(x0, y0, x1, y1)}
                    fill="none"
                    stroke={link.stroke}
                    strokeOpacity={opacity}
                    strokeWidth={strokeWidth}
                    style={{ strokeLinecap: 'round', transition: 'all 0.3s ease' }}
                  />
                  {/* Link Percentage Label Badge */}
                  <rect
                    x={midX - 20}
                    y={midY - 9}
                    width={40}
                    height={18}
                    rx="9"
                    fill="#18181b"
                    stroke={active ? link.stroke : '#3f3f46'}
                    strokeWidth={active ? 1.5 : 1}
                  />
                  <text
                    x={midX}
                    y={midY + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={active ? '#ffffff' : '#d4d4d8'}
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {link.pct}
                  </text>
                </g>
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const active = isNodeActive(node.id);

              return (
                <g
                  key={node.id}
                  className="cursor-pointer group/node"
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onNodeClick?.(node.id)}
                >
                  {/* Outer Box */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={node.h}
                    rx="8"
                    fill={node.fill}
                    stroke={node.stroke}
                    strokeWidth={active ? 2.5 : 1.5}
                    style={{ transition: 'all 0.3s ease' }}
                  />

                  {/* Node Label */}
                  <text
                    x={node.x + 10}
                    y={node.y + 15}
                    fill={node.labelColor}
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {node.label}
                  </text>

                  {/* Vertically Centered Percentage Badge on Card */}
                  <g>
                    <rect
                      x={node.x + node.w - 48}
                      y={node.y + node.h / 2 - 10}
                      width={38}
                      height={20}
                      rx="10"
                      fill={node.pctBg}
                      stroke={node.stroke}
                      strokeWidth={1}
                    />
                    <text
                      x={node.x + node.w - 29}
                      y={node.y + node.h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={node.pctColor}
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {node.pct}
                    </text>
                  </g>

                  {/* Node Value */}
                  <text
                    x={node.x + 10}
                    y={node.hasBalances ? node.y + 30 : node.y + 33}
                    fill={node.valColor}
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    {formatZAR(node.val)}
                  </text>

                  {/* Secondary States (Withdrawn & Available) */}
                  {node.hasBalances && (
                    <>
                      <text
                        x={node.x + 10}
                        y={node.y + 46}
                        fill="#71717a"
                        fontSize="8"
                        fontWeight="500"
                      >
                        Withdrawn: {formatZAR(node.spent ?? 0)}
                      </text>
                      <text
                        x={node.x + 10}
                        y={node.y + 57}
                        fill={(node.available ?? 0) >= 0 ? '#34d399' : '#f87171'}
                        fontSize="8"
                        fontWeight="600"
                      >
                        Balance: {formatZAR(node.available ?? 0)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
