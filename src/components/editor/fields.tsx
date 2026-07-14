"use client";

// Small, presentational form primitives for the /edit panel. Each is controlled
// (value + onChange); the editor wires them to paths in the template state.

import { useId, useState } from "react";

const inputCls =
  "w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-neutral-500";

export function Field({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </span>
      )}
      {children}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          className={`${inputCls} min-h-16 resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        className={inputCls}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 accent-neutral-800"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="text-sm text-neutral-700 select-none">
        {label}
      </label>
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// Image picker: uploading a file sets the value to a data URL (portable across
// the iframe boundary); the text box also accepts a plain path. Thumbnail uses a
// bare <img> (the editor chrome, not the invitation) so any src — path or data
// URL — renders without next/image config.
// Image picker. `upload` sends the file to the server and returns the URL to store
// in the JSON — NOT a base64 data URL. A data URL would be inlined into the JSON,
// and from there into every page render; a photograph is a file, so it is stored
// as one and the config keeps only a reference.
export function ImageField({
  label,
  value,
  onChange,
  upload,
  previewSrc,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  /** Uploads the file, resolves to the URL to store. */
  upload?: (file: File) => Promise<string>;
  /** How to display `value` (it is template-relative; the caller knows the namespace). */
  previewSrc?: (v: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !upload) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await upload(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setBusy(false);
      e.target.value = ""; // let the same file be picked again after an error
    }
  };

  const src = previewSrc ? previewSrc(value) : value;

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-11 w-11 shrink-0 rounded border border-neutral-300 object-cover"
          />
        ) : (
          <div className="h-11 w-11 shrink-0 rounded border border-dashed border-neutral-300" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          disabled={!upload || busy}
          className="text-xs"
        />
        {busy && <span className="text-xs text-neutral-500">uploading…</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input
        className={`${inputCls} mt-1`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

// Reorderable list with add / remove / move-up-down, each item rendered via a
// render prop. Used for keywords, photos, invitees, title lines, timeline
// events, dress-code colors, etc.
export function ListEditor<T>({
  label,
  items,
  onChange,
  blank,
  renderItem,
  fixed,
}: {
  label?: string;
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => T;
  renderItem: (item: T, update: (v: T) => void) => React.ReactNode;
  // Fixed-length: edit items in place, but hide add / remove / reorder controls
  // (e.g. the four countdown labels, which must stay Days/Hours/Minutes/Seconds).
  fixed?: boolean;
}) {
  const setAt = (i: number, v: T) =>
    onChange(items.map((it, idx) => (idx === i ? v : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <Field label={label}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-1 rounded border border-neutral-200 bg-neutral-50 p-2"
          >
            <div className="flex-1">{renderItem(item, (v) => setAt(i, v))}</div>
            {!fixed && (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  className="rounded px-1 text-xs text-neutral-500 hover:bg-neutral-200"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  className="rounded px-1 text-xs text-neutral-500 hover:bg-neutral-200"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded px-1 text-xs text-red-500 hover:bg-red-100"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
        {!fixed && (
          <button
            type="button"
            onClick={() => onChange([...items, blank()])}
            className="rounded border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            + Add
          </button>
        )}
      </div>
    </Field>
  );
}

// Collapsible section wrapper for grouping the form. When `onIncludedChange` is
// supplied, the summary also carries an include/exclude checkbox on the right —
// so a section is toggled on/off and edited in the same row.
export function Section({
  title,
  children,
  defaultOpen,
  included,
  onIncludedChange,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  included?: boolean;
  onIncludedChange?: (v: boolean) => void;
}) {
  const hasToggle = typeof onIncludedChange === "function";
  const hidden = hasToggle && included === false;
  return (
    <details open={defaultOpen} className="border-b border-neutral-200">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-neutral-100 [&::-webkit-details-marker]:hidden">
        <span className={hidden ? "text-neutral-400" : "text-neutral-800"}>{title}</span>
        {hasToggle && (
          // stopPropagation keeps a toggle click from expanding/collapsing the
          // <details> accordion (the summary's native click is suppressed).
          <span className="ml-auto flex items-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-neutral-800"
              checked={included ?? false}
              onChange={(e) => onIncludedChange!(e.target.checked)}
              aria-label={`Include ${title}`}
            />
          </span>
        )}
      </summary>
      <div className="space-y-3 px-3 pb-4 pt-1">{children}</div>
    </details>
  );
}
