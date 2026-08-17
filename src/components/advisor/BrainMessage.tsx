'use client';

// The Brain's replies, rendered rich. Two powers beyond text:
//   1. ```chart fences — JSON specs the Brain emits with the user's
//      real numbers — become native Recharts visuals (bar/line/pie).
//   2. Markdown links to internal paths become clickable tool chips
//      that walk straight into the product; external links open away.
// Anything malformed falls back to plain text — the Brain can never
// break the chat by drawing badly.

import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ChartSpec {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  data: { label: string; value: number }[];
  color?: string;
}

const PALETTE = ['#1D9E75', '#3B6FD4', '#17B8C9', '#E0559E', '#C9A84C', '#7A5EA8', '#E0922A', '#8AA097'];
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

function parseChart(raw: string): ChartSpec | null {
  try {
    const spec = JSON.parse(raw.trim());
    if (!spec || !['bar', 'line', 'pie'].includes(spec.type) || !Array.isArray(spec.data)) return null;
    const data = spec.data
      .filter((d: unknown): d is { label: unknown; value: unknown } => !!d && typeof d === 'object')
      .map((d: { label: unknown; value: unknown }) => ({ label: String(d.label), value: Number(d.value) }))
      .filter((d: { value: number }) => Number.isFinite(d.value))
      .slice(0, 14);
    if (data.length === 0) return null;
    return { type: spec.type, title: typeof spec.title === 'string' ? spec.title : undefined, data, color: typeof spec.color === 'string' ? spec.color : undefined };
  } catch {
    return null;
  }
}

function BrainChart({ spec }: { spec: ChartSpec }) {
  const color = spec.color ?? '#1D9E75';
  const axisTick = { fontSize: 9, fill: 'var(--muted)' };
  const tipStyle = { background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 };
  return (
    <div className="my-2 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-card)] p-3" dir="ltr">
      {spec.title && <div className="text-[10px] font-semibold text-[var(--ink-2)] mb-1.5">📊 {spec.title}</div>}
      <div className="h-40 min-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'bar' ? (
            <BarChart data={spec.data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-faint)" />
              <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} width={44} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="value" fill={color} isAnimationActive={false} radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : spec.type === 'line' ? (
            <LineChart data={spec.data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-faint)" />
              <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} width={44} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tipStyle} formatter={(v) => fmt(Number(v))} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={tipStyle} formatter={(v) => fmt(Number(v))} />
              <Pie data={spec.data} dataKey="value" nameKey="label" innerRadius="45%" outerRadius="80%" isAnimationActive={false}>
                {spec.data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      {spec.type === 'pie' && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {spec.data.map((d, i) => (
            <span key={d.label} className="inline-flex items-center gap-1 text-[9px] text-[var(--muted)]">
              <span className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              {d.label} · {fmt(d.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// text with [label](href) turned into chips (internal) or anchors (external)
function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const [, label, href] = m;
    if (href.startsWith('/')) {
      parts.push(
        <Link
          key={key++}
          href={href}
          className="inline-flex items-center gap-1 mx-0.5 align-baseline rounded-full border border-[var(--green-border)] bg-[var(--green-bg)]/60 px-2 py-0.5 text-[11px] font-semibold text-[var(--green-dark)] hover:bg-[var(--green-bg)] transition-colors"
        >
          {label} ↗
        </Link>,
      );
    } else if (href.startsWith('http')) {
      parts.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className="underline text-[var(--green-dark)]">
          {label}
        </a>,
      );
    } else {
      parts.push(<span key={key++}>{label}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return <span className="whitespace-pre-wrap">{parts}</span>;
}

export default function BrainMessage({ content }: { content: string }) {
  // split on ```chart … ``` fences; everything else is rich text
  const segments = content.split(/```chart\s*([\s\S]*?)```/g);
  return (
    <div>
      {segments.map((seg, i) => {
        if (i % 2 === 1) {
          const spec = parseChart(seg);
          return spec
            ? <BrainChart key={i} spec={spec} />
            : <pre key={i} className="text-[10px] text-[var(--muted)] whitespace-pre-wrap my-1">{seg.trim()}</pre>;
        }
        const trimmed = i === 0 ? seg.replace(/^\s+/, '') : seg;
        return trimmed.trim() ? <RichText key={i} text={trimmed} /> : null;
      })}
    </div>
  );
}
