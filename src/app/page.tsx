import Link from "next/link";
import DeleteButton from "@/components/dashboard/DeleteButton";
import {
  listPhotoStats,
  listTemplates,
  type PhotoStats,
  type StoredTemplate,
} from "@/lib/store";
import { getCoupleNames, weddingInfo } from "@/lib/derive";

// ═══════════════════════════════════════════════════════════════════════════
//  / — everything in the bucket.
// ═══════════════════════════════════════════════════════════════════════════
//  A slug appears exactly ONCE, with exactly one status. It used to appear twice —
//  under Drafts and again under Published — each row carrying its own chip, and the
//  two chips said contradictory things about the same fact. Worse, the draft's read
//  "already published", which sounds like "done, relax" and means the opposite:
//  there are edits that are NOT live.
//
//  A slug is no longer two things anyway. Publish CONSUMES the draft (see
//  api/publish), so a draft sitting beside a published couple can only mean one
//  thing — edits are waiting.
//
//    Draft                  a draft, never published
//    Live                   published, nothing pending
//    Live — edits pending   published, and a draft holds changes that are not live
//
//  Read straight from R2 on every request. Nothing is cached, because the whole
//  point is to show what is actually in the bucket right now.
export const dynamic = "force-dynamic";

// ── Formatting ───────────────────────────────────────────────────────────────

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ago`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h ago`;
  if (ms < 30 * DAY) return `${Math.floor(ms / DAY)}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const kb = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

// ── Layout ───────────────────────────────────────────────────────────────────

const linkClass = "text-blue-600 underline underline-offset-2 hover:text-blue-700";

function Row({
  slug,
  entry,
  photos,
  chip,
  actions,
}: {
  slug: string;
  /** The record this row describes. For a live invitation, the LIVE one — that is
   *  what guests are actually getting; the pending draft is one click away. */
  entry: StoredTemplate;
  photos?: PhotoStats;
  chip?: { text: string; className: string };
  actions: React.ReactNode;
}) {
  const { data, uploaded, size } = entry;

  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-neutral-200 px-3 py-2.5 last:border-0">
      <span className="font-medium text-neutral-900">{slug}</span>

      {chip && (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${chip.className}`}>
          {chip.text}
        </span>
      )}

      {data ? (
        <span className="text-xs text-neutral-500">
          {getCoupleNames(data.couple)} · {data.site.templateSlug} ·{" "}
          {weddingInfo(data.wedding).longDisplay}
        </span>
      ) : (
        // A corrupt object should be visible, not quietly skipped — you cannot
        // delete what the page will not show you.
        <span className="text-xs text-red-600">unreadable JSON</span>
      )}

      <span className="ml-auto flex shrink-0 items-baseline gap-3 text-xs">
        <span className="text-neutral-400">
          {photos
            ? `${photos.count} photo${photos.count === 1 ? "" : "s"}, ${kb(photos.bytes)} · `
            : ""}
          {kb(size)} · {timeAgo(uploaded)}
        </span>
        {actions}
      </span>
    </li>
  );
}

function Group({
  title,
  hint,
  children,
  empty,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
      {empty ? (
        <p className="mt-2 rounded border border-dashed border-neutral-300 px-3 py-4 text-xs text-neutral-400">
          nothing here yet
        </p>
      ) : (
        <ul className="mt-2 rounded border border-neutral-200 bg-white">{children}</ul>
      )}
    </section>
  );
}

// ── The page ─────────────────────────────────────────────────────────────────

export default async function Home() {
  const [designs, drafts, couples, draftPhotos, couplePhotos] = await Promise.all([
    listTemplates("design"),
    listTemplates("draft"),
    listTemplates("couple"),
    listPhotoStats("draft"),
    listPhotoStats("couple"),
  ]);

  const draftBySlug = new Map(drafts.map((d) => [d.slug, d]));
  const coupleBySlug = new Map(couples.map((c) => [c.slug, c]));

  // ONE row per slug: the union of what is live and what is being worked on.
  const slugs = [...new Set([...coupleBySlug.keys(), ...draftBySlug.keys()])];

  const invitations = slugs
    .map((slug) => {
      const live = coupleBySlug.get(slug);
      const draft = draftBySlug.get(slug);
      // A draft only survives a Publish if it was saved AFTER it — publish deletes
      // the one it promoted. So a draft beside a live couple always means: pending.
      return { slug, live, draft, pending: Boolean(live && draft) };
    })
    .sort((a, b) => {
      const touched = (x: typeof a) =>
        Math.max(x.live?.uploaded.getTime() ?? 0, x.draft?.uploaded.getTime() ?? 0);
      return touched(b) - touched(a);
    });

  const nothingAtAll = designs.length === 0 && invitations.length === 0;

  return (
    <main className="min-h-svh w-full bg-neutral-100 p-8 font-sans text-neutral-900">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-bold">Unfold — unified build</h1>
          <p className="text-sm text-neutral-600">
            One build, every template. The design is chosen by each JSON&apos;s{" "}
            <code>site.templateSlug</code>.
          </p>
          <Link
            href="/edit"
            className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            New invitation
          </Link>
        </header>

        {nothingAtAll && (
          <p className="mt-6 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            The bucket is empty. Run <code>npm run seed</code> to load the design
            templates into local R2.
          </p>
        )}

        <Group
          title="Designs"
          hint="The showcases this build ships. Each one is the starting point for a new invitation."
          empty={designs.length === 0}
        >
          {designs.map((entry) => (
            <Row
              key={entry.slug}
              slug={entry.slug}
              entry={entry}
              actions={
                <>
                  <Link className={linkClass} href={`/design/${entry.slug}`}>
                    view
                  </Link>
                  <Link className={linkClass} href="/edit">
                    use
                  </Link>
                </>
              }
            />
          ))}
        </Group>

        <Group
          title="Invitations"
          hint="Live invitations and work in progress. Publishing replaces the live version; until then, nothing you edit reaches it."
          empty={invitations.length === 0}
        >
          {invitations.map(({ slug, live, draft, pending }) => {
            // Describe what is LIVE where there is a live version — that is what
            // guests are actually receiving. The pending draft is one click away.
            const entry = live ?? draft!;
            const photos = live ? couplePhotos[slug] : draftPhotos[slug];

            const chip = !live
              ? { text: "Draft", className: "bg-neutral-200 text-neutral-700" }
              : pending
                ? { text: "Live — edits pending", className: "bg-amber-100 text-amber-900" }
                : { text: "Live", className: "bg-emerald-100 text-emerald-800" };

            return (
              <Row
                key={slug}
                slug={slug}
                entry={entry}
                photos={photos}
                chip={chip}
                actions={
                  <>
                    {live && (
                      <Link className={linkClass} href={`/couple/${slug}`}>
                        {pending ? "view live" : "view"}
                      </Link>
                    )}
                    {draft && (
                      <Link className={linkClass} href={`/preview/${slug}`}>
                        {pending ? "preview edits" : "preview"}
                      </Link>
                    )}

                    {/* Open the DRAFT whenever one exists. Linking a pending row to
                        ?couple= would load the PUBLISHED json and silently discard
                        the work in progress. */}
                    <Link
                      className={linkClass}
                      href={draft ? `/edit?draft=${slug}` : `/edit?couple=${slug}`}
                    >
                      edit
                    </Link>

                    {pending && (
                      <DeleteButton
                        section="draft"
                        slug={slug}
                        label="discard edits"
                        confirm={`Discard the unpublished edits to ${slug}? The live invitation is untouched.`}
                      />
                    )}

                    {live ? (
                      <DeleteButton
                        section="couple"
                        slug={slug}
                        confirm={`Take /couple/${slug} offline? Anyone holding the link will get a 404.`}
                      />
                    ) : (
                      <DeleteButton section="draft" slug={slug} />
                    )}
                  </>
                }
              />
            );
          })}
        </Group>
      </div>
    </main>
  );
}
