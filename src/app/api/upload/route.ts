import { NextResponse } from "next/server";
import { saveImage } from "@/lib/store";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

// POST /api/upload — a couple's photograph.
//
// Uploads used to be base64 data URLs held in the editor's memory. That was fine
// for a live preview, but it would inline megabytes into the JSON — and from there
// into every page render. A photo is a file; it gets stored as one, and the JSON
// holds only its URL.
//
// ⚠️  Shares the publish endpoint's lack of auth. See src/app/api/publish/route.ts.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const slug = String(form.get("slug") ?? "");
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no file" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `unsupported type "${file.type}"` },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "file too large (max 8 MB)" }, { status: 413 });
    }

    const url = await saveImage(slug, file);
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
