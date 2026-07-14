"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The one interactive island on the dashboard. Everything else there is a server
// component reading R2 — this needs an onClick, so it is a client component and
// nothing more.
export default function DeleteButton({
  section,
  slug,
  confirm,
  label = "delete",
}: {
  section: "draft" | "couple";
  slug: string;
  /** Published invitations are live. Ask first. Drafts just go. */
  confirm?: string;
  /** "discard edits" for a draft; plain "delete" otherwise. */
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (confirm && !window.confirm(confirm)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/template?section=${section}&slug=${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "could not delete");
      }
      // Re-render the server component with the bucket's new contents.
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "could not delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-red-600 underline underline-offset-2 hover:text-red-700 disabled:opacity-40"
    >
      {busy ? "…" : label}
    </button>
  );
}
