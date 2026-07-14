"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { TemplateData } from "@/lib/template-types";
import { assetUrl } from "@/lib/assets";
import { getCoupleNames } from "@/lib/derive";
import {
  PREVIEW_DATA,
  PREVIEW_READY,
  type PreviewMessage,
} from "@/lib/preview-messages";
import {
  ImageField,
  ListEditor,
  NumberField,
  Section,
  SelectField,
  TextField,
  Toggle,
} from "./fields";

// ═══════════════════════════════════════════════════════════════════════════
//  The editor.
// ═══════════════════════════════════════════════════════════════════════════
//  Form on the left, the REAL page on the right.
//
//  The preview is not a re-implementation of the invitation — the iframe renders
//  the very same components, through the very same RenderTemplate, that will
//  serve the couple's guests. It just renders them in the browser: the editor
//  posts the template to /preview/live on every change and it re-renders in
//  place. No save, no round-trip, no reload — so the cover screen stays
//  dismissed, the scroll position holds, and nothing flashes.
//
//  It used to debounce-save a draft and remount the iframe on its `key`, which
//  meant every keystroke replayed the loading screen. That was me over-applying
//  the config rule: the config must not reach a GUEST's browser. Here the
//  operator owns it — it is in the form on the left.
//
//  Saving is now what it should be: an explicit Save draft, on the couple's slug.

type Path = (string | number)[];

function getPath(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (o, k) => (o == null ? o : (o as Record<string | number, unknown>)[k]),
    obj
  );
}

function setPath<T>(obj: T, path: Path, value: unknown): T {
  const next = structuredClone(obj);
  let cur = next as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    cur = cur[path[i]] as Record<string | number, unknown>;
  }
  cur[path[path.length - 1]] = value;
  return next;
}

export default function EditorApp({
  bases,
  covers,
  initial,
  taken,
}: {
  bases: Record<string, TemplateData>;
  covers: Record<string, string[]>;
  /** An existing draft or published couple to resume, if we were sent to one. */
  initial: { slug: string; data: TemplateData } | null;
  /** Slugs already spoken for, as of page load. */
  taken: { couple: string[]; draft: string[] };
}) {
  const designs = Object.keys(bases);
  const [base, setBase] = useState(
    () => initial?.data.site.templateSlug ?? designs[0]
  );
  const [data, setData] = useState<TemplateData>(() =>
    structuredClone(initial?.data ?? bases[designs[0]])
  );
  const [slug, setSlug] = useState(initial?.slug ?? "");

  // The slug this session is entitled to write over.
  //
  // Set when we were opened ON an existing template, and again the moment we
  // successfully write one. Without the second half, the guard would turn on its
  // owner: Save draft, edit a word, Save draft again — and the second save would
  // collide with the first. Owning a slug is what separates "I am updating my
  // invitation" from "I am a stranger about to overwrite someone else's".
  const [ownedSlug, setOwnedSlug] = useState<string | null>(initial?.slug ?? null);

  const [status, setStatus] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  // Bumping this remounts the iframe — the ONLY thing that does. See the Refresh
  // button; nothing else may touch it.
  const [frameKey, setFrameKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const templateSlug = data.site.templateSlug;

  const set = useCallback(
    (path: Path, value: unknown) => setData((prev) => setPath(prev, path, value)),
    []
  );

  function bind<T>(path: Path) {
    return { value: getPath(data, path) as T, onChange: (v: T) => set(path, v) };
  }

  // The latest template, reachable from the message listener below — which is
  // registered once and would otherwise close over the template as it was on
  // mount.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const postToFrame = useCallback((template: TemplateData) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_DATA, data: template },
      window.location.origin
    );
  }, []);

  // The frame announces itself whenever it mounts, and we answer with the current
  // template. That handshake is what makes every way of reloading it self-heal:
  // the Refresh button, a Fast Refresh, a manual reload of the frame. None of them
  // need this component to notice they happened.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data as PreviewMessage | undefined;
      if (message?.type !== PREVIEW_READY) return;

      setPreviewReady(true);
      postToFrame(dataRef.current);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postToFrame]);

  // Every change, straight to the frame. No debounce: this is a structured clone
  // between two windows, not a network call — there is nothing to spare the user.
  useEffect(() => {
    if (!previewReady) return;
    postToFrame(data);
  }, [data, previewReady, postToFrame]);

  // Photographs are uploaded as files. The JSON keeps only the URL — a base64 data
  // URL would be inlined into the config and then into every page render.
  const upload = useCallback(
    async (file: File): Promise<string> => {
      if (!slug) throw new Error("Set the couple's URL slug first.");
      const form = new FormData();
      form.set("slug", slug);
      form.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "upload failed");
      return json.url!;
    },
    [slug]
  );

  const previewSrc = useCallback(
    (v: string) => (v ? assetUrl(templateSlug, v) : v),
    [templateSlug]
  );

  // Reset, and switching Design, both throw away everything and start again from
  // the template's demo content. That is fine on a blank invitation and quietly
  // catastrophic on a real one: the couple's content is replaced in the form, and
  // the next Publish writes the DEMO CONTENT over their live invitation. So ask —
  // but only when there is actually something to lose.
  const switchBase = (next: string) => {
    const edited =
      JSON.stringify(data) !== JSON.stringify(bases[base] ?? {});

    if (edited) {
      const whose = ownedSlug
        ? `${getCoupleNames(data.couple)}’s content`
        : "your changes";
      const ok = window.confirm(
        `This replaces ${whose} with the ${next} template’s demo content, and cannot be undone. Continue?`
      );
      if (!ok) return;
    }

    setBase(next);
    setData(structuredClone(bases[next]));
    setPublishedUrl(null);
    setSaved(null);
  };

  // ── Is this slug someone else's? ───────────────────────────────────────────
  // Ours if we were opened on it or have already written it this session. Anyone
  // else's, and the write is refused — here, and again on the server.
  const owned = slug !== "" && slug === ownedSlug;
  const clashesWithCouple = !owned && taken.couple.includes(slug);
  const clashesWithDraft = !owned && taken.draft.includes(slug);

  // Publishing only cares about the couple space; a draft sitting on the slug is
  // the "unpublished changes" state, not a collision.
  const canPublish = slug !== "" && !clashesWithCouple;
  const canSaveDraft = slug !== "" && !clashesWithDraft;

  const write = async (
    endpoint: "/api/draft" | "/api/publish",
    onDone: (url: string | null) => void,
    fallbackError: string
  ) => {
    setStatus(null);
    setSaved(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // `replace` is only ever true for a slug this session owns. A fresh
        // invitation cannot set it, so it cannot overwrite anything.
        body: JSON.stringify({ slug, data, replace: owned }),
      });
      const json = (await res.json()) as {
        url?: string;
        error?: string;
        data?: TemplateData;
      };
      if (!res.ok) throw new Error(json.error ?? fallbackError);

      // Publish moves the staged photographs into the couple's folder and rewrites
      // their paths, so the copy we are holding now points at /uploads/draft/…
      // files that no longer exist. Take the server's version — otherwise the next
      // edit would be built on dead URLs.
      if (json.data) setData(json.data);

      // We wrote it — so from now on it is ours to write again.
      setOwnedSlug(slug);
      onDone(json.url ?? null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : fallbackError);
    }
  };

  const saveDraft = () =>
    write("/api/draft", setSaved, "could not save the draft");

  const publish = () => write("/api/publish", setPublishedUrl, "publish failed");

  const c = data.content;
  const img = (path: Path) => ({ ...bind<string>(path), upload, previewSrc });

  return (
    <div className="flex h-full w-full bg-neutral-100 text-neutral-900">
      {/* ── Form ─────────────────────────────────────────────────────── */}
      <div className="flex h-full w-[420px] max-w-[45%] flex-col border-r border-neutral-300 bg-white">
        <header className="border-b border-neutral-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold">Template Editor</h1>
            <Link href="/" className="text-[11px] text-blue-600 underline">
              all templates
            </Link>
            <button
              type="button"
              onClick={() => switchBase(base)}
              className="ml-auto rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
            >
              Reset
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <SelectField
              label="Design"
              value={base}
              options={designs.map((d) => ({ value: d, label: d }))}
              onChange={switchBase}
            />
            <TextField
              label="Couple URL slug"
              value={slug}
              onChange={(v) => {
                setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                setPublishedUrl(null);
                setSaved(null);
              }}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={!canSaveDraft}
              className="rounded border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 disabled:opacity-40"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={!canPublish}
              className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {owned && taken.couple.includes(slug) ? "Republish" : "Publish"}
            </button>

            {publishedUrl && (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline"
              >
                live at {publishedUrl}
              </a>
            )}
            {saved && !publishedUrl && (
              <a
                href={saved}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline"
              >
                draft saved — see it server-rendered
              </a>
            )}
            {status && <span className="text-xs text-red-600">{status}</span>}
            {taken.couple.length > 0 && !publishedUrl && !saved && !status && (
              <span className="ml-auto text-[11px] text-neutral-400">
                {taken.couple.length} published
              </span>
            )}
          </div>

          {/* Say it while they are typing the slug, not after they have filled in a
              whole invitation and pressed Publish. */}
          {!slug ? (
            <p className="mt-1 text-[11px] text-neutral-500">
              A slug is required before photos can be uploaded, saved or published.
            </p>
          ) : clashesWithCouple ? (
            <p className="mt-1 text-[11px] text-red-600">
              <b>/couple/{slug}</b> is already live. Pick another slug — or open that
              invitation from{" "}
              <Link href="/" className="underline">
                the dashboard
              </Link>{" "}
              to edit it.
            </p>
          ) : clashesWithDraft ? (
            <p className="mt-1 text-[11px] text-amber-700">
              A draft already exists on <b>{slug}</b>. Pick another slug — or open it
              from{" "}
              <Link href="/" className="underline">
                the dashboard
              </Link>
              . You can still publish this one.
            </p>
          ) : owned ? (
            <p className="mt-1 text-[11px] text-neutral-500">
              Editing <b>{slug}</b> — saving or publishing updates it in place.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-emerald-700">
              <b>{slug}</b> is free.
            </p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          <p className="bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            General
          </p>

          <Section title="Couple names" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Bride first" {...bind<string>(["couple", "bride", "firstName"])} />
              <TextField label="Bride full" {...bind<string>(["couple", "bride", "fullName"])} />
              <TextField label="Groom first" {...bind<string>(["couple", "groom", "firstName"])} />
              <TextField label="Groom full" {...bind<string>(["couple", "groom", "fullName"])} />
            </div>
          </Section>

          <Section title="Wedding date">
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="Year" {...bind<number>(["wedding", "year"])} />
              <NumberField label="Month" min={1} max={12} {...bind<number>(["wedding", "month"])} />
              <NumberField label="Day" min={1} max={31} {...bind<number>(["wedding", "day"])} />
              <NumberField label="Hour" min={0} max={23} {...bind<number>(["wedding", "hour"])} />
              <NumberField label="Minute" min={0} max={59} {...bind<number>(["wedding", "minute"])} />
              <NumberField label="Ceremony hrs" {...bind<number>(["wedding", "ceremonyLengthHours"])} />
            </div>
            <TextField label="UTC offset (e.g. +05:30)" {...bind<string>(["wedding", "utcOffset"])} />
          </Section>

          <Section title="Cover screen">
            <SelectField
              label="Design"
              value={c.cover.design}
              options={(covers[templateSlug] ?? []).map((k) => ({ value: k, label: k }))}
              onChange={(v) => set(["content", "cover", "design"], v)}
            />
            <TextField label="Eyebrow" {...bind<string>(["content", "cover", "eyebrow"])} />
            <TextField label="Button" {...bind<string>(["content", "cover", "button"])} />
            <ImageField label="Cover photo" {...img(["content", "cover", "classicImage"])} />
            {c.cover.portraitImage !== undefined && (
              <ImageField label="Portrait cover photo" {...img(["content", "cover", "portraitImage"])} />
            )}
          </Section>

          <Section title="Loading screen">
            <TextField label="Eyebrow" {...bind<string>(["content", "loading", "eyebrow"])} />
          </Section>

          <p className="bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Page sections
          </p>

          <Section
            title="Hero"
            included={c.hero.included}
            onIncludedChange={(v) => set(["content", "hero", "included"], v)}
          >
            <TextField label="Eyebrow" {...bind<string>(["content", "hero", "eyebrow"])} />
            {c.hero.tagline !== undefined && (
              <TextField label="Tagline" multiline {...bind<string>(["content", "hero", "tagline"])} />
            )}
            <ImageField label="Arch couple photo" {...img(["content", "hero", "image"])} />
          </Section>

          <Section
            title="Couple"
            included={c.couple.included}
            onIncludedChange={(v) => set(["content", "couple", "included"], v)}
          >
            <ListEditor<string>
              label="Heading lines"
              items={c.couple.headingLines}
              onChange={(v) => set(["content", "couple", "headingLines"], v)}
              blank={() => ""}
              renderItem={(line, update) => <TextField value={line} onChange={update} />}
            />
            <TextField label="Intro" multiline {...bind<string>(["content", "couple", "intro"])} />
            <TextField label="Instagram label" {...bind<string>(["content", "couple", "instagramLabel"])} />

            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Bride</p>
            <TextField label="Parent label" {...bind<string>(["content", "couple", "bride", "parentLabel"])} />
            <TextField label="Parents" {...bind<string>(["content", "couple", "bride", "parents"])} />
            <TextField label="Instagram URL" {...bind<string>(["content", "couple", "bride", "instagramUrl"])} />
            <ImageField label="Bride photo" {...img(["content", "couple", "bride", "photo"])} />

            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Groom</p>
            <TextField label="Parent label" {...bind<string>(["content", "couple", "groom", "parentLabel"])} />
            <TextField label="Parents" {...bind<string>(["content", "couple", "groom", "parents"])} />
            <TextField label="Instagram URL" {...bind<string>(["content", "couple", "groom", "instagramUrl"])} />
            <ImageField label="Groom photo" {...img(["content", "couple", "groom", "photo"])} />
          </Section>

          <Section
            title="Save the Date"
            included={c.saveTheDate.included}
            onIncludedChange={(v) => set(["content", "saveTheDate", "included"], v)}
          >
            <ListEditor<string>
              label="Title lines"
              fixed
              items={c.saveTheDate.titleLines}
              onChange={(v) => set(["content", "saveTheDate", "titleLines"], v)}
              blank={() => ""}
              renderItem={(line, update) => <TextField value={line} onChange={update} />}
            />
            <ListEditor<string>
              label="Countdown labels"
              fixed
              items={c.saveTheDate.countdownLabels}
              onChange={(v) => set(["content", "saveTheDate", "countdownLabels"], v)}
              blank={() => ""}
              renderItem={(line, update) => <TextField value={line} onChange={update} />}
            />
            <TextField label="Remind button" {...bind<string>(["content", "saveTheDate", "remindButton"])} />
          </Section>

          <Section
            title="Timeline"
            included={c.timeline.included}
            onIncludedChange={(v) => set(["content", "timeline", "included"], v)}
          >
            <TextField label="Title" {...bind<string>(["content", "timeline", "title"])} />
            <ListEditor
              label="Events"
              items={c.timeline.events}
              onChange={(v) => set(["content", "timeline", "events"], v)}
              blank={() => ({ name: "", time: "", period: "", description: "", date: null })}
              renderItem={(ev, update) => (
                <div className="space-y-1">
                  <TextField label="Name" value={ev.name} onChange={(v) => update({ ...ev, name: v })} />
                  <div className="grid grid-cols-2 gap-1">
                    <TextField label="Time" value={ev.time} onChange={(v) => update({ ...ev, time: v })} />
                    <TextField label="Period" value={ev.period} onChange={(v) => update({ ...ev, period: v })} />
                  </div>
                  <TextField
                    label="Description"
                    multiline
                    value={ev.description}
                    onChange={(v) => update({ ...ev, description: v })}
                  />
                  <Toggle
                    label="Show date block"
                    value={ev.date !== null}
                    onChange={(on) => update({ ...ev, date: on ? { day: 1, monthShort: "Dec" } : null })}
                  />
                  {ev.date && (
                    <div className="grid grid-cols-2 gap-1">
                      <NumberField
                        label="Day"
                        value={ev.date.day}
                        onChange={(v) => update({ ...ev, date: { ...ev.date!, day: v } })}
                      />
                      <TextField
                        label="Month"
                        value={ev.date.monthShort}
                        onChange={(v) => update({ ...ev, date: { ...ev.date!, monthShort: v } })}
                      />
                    </div>
                  )}
                </div>
              )}
            />
          </Section>

          <Section
            title="Location"
            included={c.location.included}
            onIncludedChange={(v) => set(["content", "location", "included"], v)}
          >
            <TextField label="Heading" {...bind<string>(["content", "location", "heading"])} />
            <TextField label="Venue name" {...bind<string>(["content", "location", "venueName"])} />
            <TextField label="Venue address" {...bind<string>(["content", "location", "venueAddress"])} />
            <TextField label="Directions button" {...bind<string>(["content", "location", "directionsButton"])} />
            <TextField label="Directions URL" {...bind<string>(["content", "location", "directionsUrl"])} />
            <TextField label="Map embed URL" multiline {...bind<string>(["content", "location", "mapEmbedUrl"])} />
            <TextField label="Map loading label" {...bind<string>(["content", "location", "mapLoadingLabel"])} />
          </Section>

          <Section
            title="Gallery"
            included={c.gallery.included}
            onIncludedChange={(v) => set(["content", "gallery", "included"], v)}
          >
            <TextField label="Heading" {...bind<string>(["content", "gallery", "heading"])} />
            <ListEditor<string>
              label="Photos"
              items={c.gallery.photos}
              onChange={(v) => set(["content", "gallery", "photos"], v)}
              blank={() => ""}
              renderItem={(photo, update) => (
                <ImageField value={photo} onChange={update} upload={upload} previewSrc={previewSrc} />
              )}
            />
            <TextField label="YouTube embed URL" {...bind<string>(["content", "gallery", "youtubeEmbedUrl"])} />
            <TextField label="YouTube watch URL" {...bind<string>(["content", "gallery", "youtubeWatchUrl"])} />
            <TextField label="Helper text" multiline {...bind<string>(["content", "gallery", "helperText"])} />
            <TextField label="YouTube button" {...bind<string>(["content", "gallery", "youtubeButton"])} />
          </Section>

          <Section
            title="Dress code"
            included={c.dressCode.included}
            onIncludedChange={(v) => set(["content", "dressCode", "included"], v)}
          >
            <ListEditor<string>
              label="Title lines"
              items={c.dressCode.titleLines}
              onChange={(v) => set(["content", "dressCode", "titleLines"], v)}
              blank={() => ""}
              renderItem={(line, update) => <TextField value={line} onChange={update} />}
            />
            <TextField label="Quote" multiline {...bind<string>(["content", "dressCode", "quote"])} />
            <ListEditor
              label="Colors"
              items={c.dressCode.colors}
              onChange={(v) => set(["content", "dressCode", "colors"], v)}
              blank={() => ({ name: "", hex: "#cccccc" })}
              renderItem={(col, update) => (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField label="Name" value={col.name} onChange={(v) => update({ ...col, name: v })} />
                  </div>
                  <input
                    type="color"
                    value={col.hex}
                    onChange={(e) => update({ ...col, hex: e.target.value })}
                    className="h-8 w-10 shrink-0 rounded border border-neutral-300"
                    aria-label="Color"
                  />
                </div>
              )}
            />
          </Section>

          <Section
            title="Wishes / RSVP"
            included={c.wishes.included}
            onIncludedChange={(v) => set(["content", "wishes", "included"], v)}
          >
            <TextField label="Heading" {...bind<string>(["content", "wishes", "heading"])} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Name label" {...bind<string>(["content", "wishes", "nameLabel"])} />
              <TextField label="Name placeholder" {...bind<string>(["content", "wishes", "namePlaceholder"])} />
            </div>
            <TextField label="Attend question" {...bind<string>(["content", "wishes", "attendQuestion"])} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Attend yes" {...bind<string>(["content", "wishes", "attendYes"])} />
              <TextField label="Attend no" {...bind<string>(["content", "wishes", "attendNo"])} />
            </div>
            <TextField label="Message label" {...bind<string>(["content", "wishes", "messageLabel"])} />
            <TextField label="Message placeholder" {...bind<string>(["content", "wishes", "messagePlaceholder"])} />
            <TextField label="Send button" {...bind<string>(["content", "wishes", "sendButton"])} />
          </Section>

          <Section
            title="Greetings"
            included={c.greetings.included}
            onIncludedChange={(v) => set(["content", "greetings", "included"], v)}
          >
            <TextField label="Message" multiline {...bind<string>(["content", "greetings", "message"])} />
            <TextField label="Invitees label" {...bind<string>(["content", "greetings", "invitesLabel"])} />
            <ListEditor<string>
              label="Invitee names"
              items={c.greetings.inviteeNames}
              onChange={(v) => set(["content", "greetings", "inviteeNames"], v)}
              blank={() => ""}
              renderItem={(nm, update) => <TextField value={nm} onChange={update} />}
            />
          </Section>

          <div className="px-3 py-4 text-[11px] text-neutral-400">
            The preview is the real page — the same components that serve guests, rendered live as
            you type. Save draft when you want a copy you can come back to.
          </div>
        </div>
      </div>

      {/* ── Preview ──────────────────────────────────────────────────── */}
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 overflow-hidden bg-neutral-200 p-4">
        <div className="flex items-center gap-3">
          <p className="text-xs text-neutral-500">
            Live preview — click “{c.cover.button}” to enter.
          </p>
          <button
            type="button"
            onClick={() => setFrameKey((k) => k + 1)}
            title="Reload the frame from scratch — replays the loading screen and the cover, as a guest opening the link would see it."
            className="rounded border border-neutral-400 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-300"
          >
            Refresh
          </button>
        </div>

        <div className="h-full max-h-[860px] w-full max-w-[400px] overflow-hidden rounded-[2rem] border-[6px] border-neutral-800 bg-white shadow-2xl">
          {/* The `key` is the whole point of the Refresh button and the whole
              danger of it: changing it tears the iframe down and mounts a fresh
              one, which reloads the document and replays the loading + cover
              screens. That is worth having ON DEMAND — it is how a guest arrives.
              It is NOT worth having on every keystroke, which is what this used to
              do. So `frameKey` changes on the button and on nothing else; edits go
              over postMessage and never remount anything. */}
          <iframe
            key={frameKey}
            ref={iframeRef}
            src="/preview/live"
            title="Live preview"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
