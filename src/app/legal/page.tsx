import type { Metadata } from "next";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { FORM_SECTION_HEADING_CLS, PAGE_TITLE_CLS } from "@/components/ui/typography";

export const metadata: Metadata = {
  title: "Legal & Licenses — DM Dashboard",
};

const BODY_CLS = "text-sm leading-relaxed text-slate-300";

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 text-sky-400 hover:underline"
    >
      {children} <ExternalLinkIcon className="h-3 w-3" />
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className={FORM_SECTION_HEADING_CLS}>{title}</h2>
      {children}
    </section>
  );
}

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className={PAGE_TITLE_CLS}>Legal & Licenses</h1>
        <p className={BODY_CLS}>
          DM Dashboard is an independent 5E-compatible tool. It is not affiliated with, sponsored by, or endorsed
          by Wizards of the Coast or D&D Beyond. Below is the licensing and attribution information for the
          reference material this app uses.
        </p>
      </div>

      <Section title="D&D SRD 5.2.1">
        <p className={BODY_CLS}>
          DM Dashboard uses game rules and reference material from the System Reference Document 5.2.1
          (&ldquo;SRD 5.2.1&rdquo;), published by Wizards of the Coast LLC and distributed under the{" "}
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">
            Creative Commons Attribution 4.0 International License (CC BY 4.0)
          </ExternalLink>
          .
        </p>
        {/* Attribution statement reproduced from the SRD 5.2.1 PDF's first
            page, unchanged, as CC BY 4.0 requires. Worth re-checking word for
            word against the current official PDF before relying on this for
            compliance — the source domain wasn't reachable from this
            environment when this was written, so the text below was
            reconstructed from independent secondary sources rather than
            copied directly off the PDF. */}
        <blockquote className="border-l-2 border-slate-700 bg-slate-900/60 px-4 py-3 text-sm italic leading-relaxed text-slate-400 break-words">
          This work includes material from the System Reference Document 5.2.1 (&ldquo;SRD 5.2.1&rdquo;) by Wizards
          of the Coast LLC and available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the
          Creative Commons Attribution 4.0 International License, available at
          https://creativecommons.org/licenses/by/4.0/legalcode.
        </blockquote>
        <p className={`${BODY_CLS} flex flex-wrap gap-x-4 gap-y-1`}>
          <ExternalLink href="https://www.dndbeyond.com/srd">SRD 5.2.1</ExternalLink>
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>
        </p>
      </Section>

      <Section title="Open5e">
        <p className={BODY_CLS}>
          Some structured game data in DM Dashboard (rules and reference lookups) is retrieved through the{" "}
          <ExternalLink href="https://open5e.com/">Open5e</ExternalLink>
          {" "}API. Open5e aggregates content from many different sources and publishers, and the license for
          that content can vary depending on which source
          and publisher it comes from — attribution and license terms for each source must be preserved wherever
          that source&apos;s content is used.
        </p>
        <p className={BODY_CLS}>
          Content sourced from the 2024 SRD / SRD 5.2.1 specifically is licensed under CC BY 4.0, per the terms
          above.
        </p>
        <p className={BODY_CLS}>
          <ExternalLink href="https://open5e.com/legal">Open5e Legal / Sources</ExternalLink>
        </p>
      </Section>

      <Section title="Third-party trademarks">
        <div className="rounded-md border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm leading-relaxed text-amber-300">
          DM Dashboard is an independent application and is not affiliated with, sponsored by, approved by, or
          endorsed by Wizards of the Coast or D&D Beyond. Dungeons &amp; Dragons, D&amp;D, D&amp;D Beyond, and
          related trademarks are property of their respective owners.
        </div>
      </Section>

      <Section title="DM Dashboard">
        <p className={BODY_CLS}>
          DM Dashboard, its software, interface, original artwork, and original content are © DM Dashboard. All
          rights reserved, except where otherwise stated.
        </p>
      </Section>
    </div>
  );
}
