import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Client-upload endpoint for plant photos. The browser calls `upload()` from
 * `@vercel/blob/client` against this route: it first asks here for a short-lived
 * token (we require a signed-in WorkOS user), then uploads the blob directly to
 * Vercel Blob and hands the resulting `{ url, pathname }` back to the client,
 * which passes them to the `plants.addPhoto` mutation. This mirrors Convex's
 * `generateUploadUrl` → upload → `addPhoto` flow.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as HandleUploadBody;

	try {
		const jsonResponse = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async () => {
				const { user } = await withAuth();
				if (!user) {
					throw new Error("Not authenticated");
				}
				return {
					allowedContentTypes: ["image/webp", "image/jpeg", "image/png"],
					// Scope the token to this user for traceability.
					tokenPayload: JSON.stringify({ ownerId: user.id }),
				};
			},
			// The DB row is written by the addPhoto mutation once the client has the
			// url, so there's nothing to persist here.
			onUploadCompleted: async () => {},
		});
		return NextResponse.json(jsonResponse);
	} catch (error) {
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 400 },
		);
	}
}
