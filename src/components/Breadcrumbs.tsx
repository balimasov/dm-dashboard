import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Rendered as the first thing in a page's own content — no header portal, since it still reads
 * as "right under the header" without the extra plumbing. No margin of its own — callers that
 * place it standalone pass `className="mb-4"`; callers that place it inside their own flex row
 * (alongside other actions) apply spacing to that row instead, since a margin baked into this
 * component would apply to the wrong box once it's a flex item sharing a row with something else.
 */
export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-sm ${className ?? ""}`}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-slate-700">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-slate-500 hover:text-slate-300 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
