import { get } from "@vercel/blob";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { plantPhotos } from "~/server/db/schema";

/**
 * Authenticated read proxy for private plant photos. Photos live in a *private*
 * Vercel Blob store, so their `.private.blob.vercel-storage.com` URLs are not
 * directly loadable by the browser. Instead the tRPC router hands the client
 * `/api/file?pathname=…` URLs (see `photoSrc` in the plants router) and this
 * route streams the bytes back — but only after checking the signed-in WorkOS
 * user actually owns the photo. This is Vercel's recommended pattern for serving
 * private blobs (auth runs right next to the `get()` call, per request) and it
 * keeps photo URLs stable so tRPC's cache never serves an expired link.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	const { user } = await withAuth();
	if (!user) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const pathname = request.nextUrl.searchParams.get("pathname");
	if (!pathname) {
		return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
	}

	// Authorize: the pathname must belong to a photo this user owns. Without this
	// any signed-in user could read any pathname they can guess.
	const [photo] = await db
		.select({ id: plantPhotos.id })
		.from(plantPhotos)
		.where(
			and(eq(plantPhotos.pathname, pathname), eq(plantPhotos.ownerId, user.id)),
		)
		.limit(1);
	if (!photo) {
		return new NextResponse("Not found", { status: 404 });
	}

	const result = await get(pathname, {
		access: "private",
		// Authenticate with the static read-write token explicitly. `BLOB_STORE_ID`
		// in the environment otherwise flips the SDK into OIDC mode, which has no
		// token off-Vercel (and isn't what the rest of this app uses) → 403.
		token: env.BLOB_READ_WRITE_TOKEN,
		ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
	});
	if (!result) {
		return new NextResponse("Not found", { status: 404 });
	}

	// Blob unchanged — let the browser reuse its cached copy.
	if (result.statusCode === 304) {
		return new NextResponse(null, {
			status: 304,
			headers: {
				ETag: result.blob.etag,
				"Cache-Control": "private, no-cache",
			},
		});
	}

	return new NextResponse(result.stream, {
		headers: {
			"Content-Type": result.blob.contentType,
			"X-Content-Type-Options": "nosniff",
			ETag: result.blob.etag,
			// Cache in the browser only, and revalidate every time so ownership is
			// re-checked on each load (a 304 short-circuits the re-download).
			"Cache-Control": "private, no-cache",
		},
	});
}
