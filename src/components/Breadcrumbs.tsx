import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Rendered as the first thing in a page's own content — no header portal, since it still reads as "right under the header" without the extra plumbing. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
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
