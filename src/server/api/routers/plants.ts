import { TRPCError } from "@trpc/server";
import { del } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { db } from "~/server/db";
import { parentEdges, plantPhotos, plants } from "~/server/db/schema";

// ---------------------------------------------------------------------------
// Types (a Drizzle client or a transaction — both expose the query builder we
// use, so helpers work inside or outside a transaction)
// ---------------------------------------------------------------------------

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbClient = Db | Tx;

type Plant = typeof plants.$inferSelect;
type PlantPhotoRow = typeof plantPhotos.$inferSelect;

// ---------------------------------------------------------------------------
// Query result types (returned to the client; `takenAt` is epoch ms)
// ---------------------------------------------------------------------------

/** One Plant in the Inventory grid: the row plus its resolved cover. */
export type InventoryItem = {
	plant: Plant;
	coverUrl: string | null;
	photoCount: number;
};

/** A Plant Photo with its Timeline metadata. */
export type PlantPhoto = {
	id: string;
	url: string;
	takenAt: number;
	caption?: string;
	isCover: boolean;
};

/** A parent in a Plant's Origin, with a display label and (for a Cross) role. */
export type PlantParent = {
	id: string;
	label: string;
	role?: "seed" | "pollen";
};

/** A Plant plus its Timeline photos and Origin parents, for the detail page. */
export type PlantDetail = {
	plant: Plant;
	photos: PlantPhoto[];
	parents: PlantParent[];
};

/** One node of a rooted Pedigree. */
export type PedigreeNode = {
	id: string;
	name: string;
	originKind?: "cross" | "division";
	coverUrl: string | null;
};

/** One ancestry edge of a rooted Pedigree: parent → child. */
export type PedigreeEdge = {
	childId: string;
	parentId: string;
	role?: "seed" | "pollen";
};

/** A Plant's rooted Pedigree: the subject plus every ancestor and the edges. */
export type Pedigree = {
	subjectId: string;
	nodes: PedigreeNode[];
	edges: PedigreeEdge[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load a Plant and assert it belongs to the given tenant, or throw. */
async function getOwnedPlant(
	client: DbClient,
	plantId: string,
	ownerId: string,
): Promise<Plant> {
	const [plant] = await client
		.select()
		.from(plants)
		.where(and(eq(plants.id, plantId), eq(plants.ownerId, ownerId)))
		.limit(1);
	if (!plant) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Plant not found" });
	}
	return plant;
}

/** A Plant's direct parent edges (at most two). */
async function parentEdgesOf(client: DbClient, childId: string) {
	return client
		.select()
		.from(parentEdges)
		.where(eq(parentEdges.childId, childId))
		.limit(2);
}

/** All of a Plant's photos. */
async function photosOf(client: DbClient, plantId: string) {
	return client
		.select()
		.from(plantPhotos)
		.where(eq(plantPhotos.plantId, plantId))
		.limit(200);
}

/**
 * The Photo that is a Plant's cover: the owner's pin if it still exists,
 * otherwise the latest Photo by `takenAt`. `null` when the Plant has no photos
 * and no valid pin.
 */
function resolveCoverPhoto(
	plant: Plant,
	photos: PlantPhotoRow[],
): PlantPhotoRow | null {
	if (plant.coverPhotoId) {
		const pinned = photos.find((p) => p.id === plant.coverPhotoId);
		if (pinned) {
			return pinned;
		}
	}
	let latest: PlantPhotoRow | null = null;
	for (const photo of photos) {
		if (latest === null || photo.takenAt > latest.takenAt) {
			latest = photo;
		}
	}
	return latest;
}

/**
 * Whether `ancestorId` is an ancestor of `descendantId` by walking up the
 * Pedigree. Used to reject edges that would introduce a cycle (a Plant cannot
 * be its own ancestor).
 */
async function isAncestorOf(
	client: DbClient,
	ancestorId: string,
	descendantId: string,
): Promise<boolean> {
	const stack: string[] = [descendantId];
	const seen = new Set<string>();
	while (stack.length > 0) {
		const current = stack.pop();
		if (current === undefined || seen.has(current)) {
			continue;
		}
		seen.add(current);
		for (const edge of await parentEdgesOf(client, current)) {
			if (edge.parentId === ancestorId) {
				return true;
			}
			stack.push(edge.parentId);
		}
	}
	return false;
}

/**
 * Attach `parentId` as a parent of `childId`. Enforces ownership, the no-cycle
 * invariant, and rejects self-parenting. Used by every edge-creating mutation.
 */
async function linkParent(
	client: DbClient,
	ownerId: string,
	childId: string,
	parentId: string,
	role: "seed" | "pollen" | undefined,
): Promise<void> {
	if (childId === parentId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "A Plant cannot be its own parent",
		});
	}
	await getOwnedPlant(client, parentId, ownerId);
	if (await isAncestorOf(client, childId, parentId)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "That parent is already a descendant — it would form a cycle",
		});
	}
	await client.insert(parentEdges).values({ ownerId, childId, parentId, role });
}

/** Reject attaching an Origin to a Plant that already has one. */
async function assertNoOrigin(client: DbClient, childId: string) {
	const existing = await parentEdgesOf(client, childId);
	if (existing.length > 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This Plant already has an origin",
		});
	}
}

/**
 * The URL the client loads a Photo from. Photos live in a *private* Vercel Blob
 * store, so their raw blob URLs aren't browser-loadable; we serve them through
 * the authenticated `/api/file` proxy keyed by the blob `pathname` (which also
 * re-checks ownership on every request). Stable across reads, so tRPC's cache
 * never holds an expired link.
 */
function photoSrc(pathname: string): string {
	return `/api/file?pathname=${encodeURIComponent(pathname)}`;
}

/** Serialize a Photo row for the client (epoch-ms `takenAt`, cover flag). */
function toPlantPhoto(
	row: PlantPhotoRow,
	coverPhotoId: string | null,
): PlantPhoto {
	return {
		id: row.id,
		url: photoSrc(row.pathname),
		takenAt: row.takenAt.getTime(),
		caption: row.caption ?? undefined,
		isCover: row.id === coverPhotoId,
	};
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const plantsRouter = createTRPCRouter({
	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	/** All of the signed-in account's Plants, newest first. Powers the origin picker. */
	listPlants: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select()
			.from(plants)
			.where(eq(plants.ownerId, ctx.user.id))
			.orderBy(desc(plants.createdAt))
			.limit(500);
	}),

	/**
	 * The Inventory: every Plant in the account, newest first, each with its
	 * resolved cover URL (owner pin, else latest Photo) and photo count. All
	 * photos load in a single indexed read and are grouped in memory to avoid
	 * per-plant read amplification.
	 */
	listInventory: protectedProcedure.query(
		async ({ ctx }): Promise<InventoryItem[]> => {
			const rows = await ctx.db
				.select()
				.from(plants)
				.where(eq(plants.ownerId, ctx.user.id))
				.orderBy(desc(plants.createdAt))
				.limit(500);
			const photoRows = await ctx.db
				.select()
				.from(plantPhotos)
				.where(eq(plantPhotos.ownerId, ctx.user.id))
				.limit(5000);
			const byPlant = new Map<string, PlantPhotoRow[]>();
			for (const photo of photoRows) {
				const arr = byPlant.get(photo.plantId) ?? [];
				arr.push(photo);
				byPlant.set(photo.plantId, arr);
			}
			return rows.map((plant) => {
				const photos = byPlant.get(plant.id) ?? [];
				const cover = resolveCoverPhoto(plant, photos);
				return {
					plant,
					coverUrl: cover ? photoSrc(cover.pathname) : null,
					photoCount: photos.length,
				};
			});
		},
	),

	/**
	 * One Plant with its Timeline photos (newest first) and Origin parents.
	 * Returns `null` when the Plant is missing (e.g. it was just deleted) so the
	 * client can redirect rather than throw.
	 */
	getPlantDetail: protectedProcedure
		.input(z.object({ plantId: z.string() }))
		.query(async ({ ctx, input }): Promise<PlantDetail | null> => {
			const [plant] = await ctx.db
				.select()
				.from(plants)
				.where(
					and(eq(plants.id, input.plantId), eq(plants.ownerId, ctx.user.id)),
				)
				.limit(1);
			if (!plant) {
				return null;
			}
			const photoRows = await photosOf(ctx.db, input.plantId);
			const cover = resolveCoverPhoto(plant, photoRows);
			const coverPhotoId = cover ? cover.id : null;
			const photos: PlantPhoto[] = photoRows
				.map((row) => toPlantPhoto(row, coverPhotoId))
				// Newest first — the Timeline reads most-recent-at-top.
				.sort((a, b) => b.takenAt - a.takenAt);

			const edges = await parentEdgesOf(ctx.db, input.plantId);
			const parents: PlantParent[] = [];
			for (const edge of edges) {
				const [parent] = await ctx.db
					.select()
					.from(plants)
					.where(eq(plants.id, edge.parentId))
					.limit(1);
				if (parent) {
					parents.push({
						id: parent.id,
						label: parent.name,
						role: edge.role ?? undefined,
					});
				}
			}
			// Seed before pollen, so a Cross reads in the conventional order.
			parents.sort((a, b) =>
				a.role === "seed" ? -1 : b.role === "seed" ? 1 : 0,
			);
			return { plant, photos, parents };
		}),

	/**
	 * The rooted Pedigree of `plantId`: the subject Plant and every ancestor,
	 * walking parent edges upward, plus the edges among them. The client draws it
	 * as a nested layout.
	 */
	getPedigree: protectedProcedure
		.input(z.object({ plantId: z.string() }))
		.query(async ({ ctx, input }): Promise<Pedigree | null> => {
			const [subject] = await ctx.db
				.select()
				.from(plants)
				.where(
					and(eq(plants.id, input.plantId), eq(plants.ownerId, ctx.user.id)),
				)
				.limit(1);
			if (!subject) {
				return null;
			}

			const nodesById = new Map<string, Plant>();
			const edges: PedigreeEdge[] = [];
			const stack: string[] = [subject.id];
			nodesById.set(subject.id, subject);
			const walked = new Set<string>();
			while (stack.length > 0) {
				const current = stack.pop();
				if (current === undefined || walked.has(current)) {
					continue;
				}
				walked.add(current);
				for (const edge of await parentEdgesOf(ctx.db, current)) {
					edges.push({
						childId: edge.childId,
						parentId: edge.parentId,
						role: edge.role ?? undefined,
					});
					if (!nodesById.has(edge.parentId)) {
						const [parent] = await ctx.db
							.select()
							.from(plants)
							.where(eq(plants.id, edge.parentId))
							.limit(1);
						if (parent) {
							nodesById.set(edge.parentId, parent);
						}
					}
					stack.push(edge.parentId);
				}
			}

			const nodes: PedigreeNode[] = await Promise.all(
				[...nodesById.values()].map(async (plant) => {
					const cover = resolveCoverPhoto(
						plant,
						await photosOf(ctx.db, plant.id),
					);
					return {
						id: plant.id,
						name: plant.name,
						originKind: plant.originKind ?? undefined,
						coverUrl: cover ? photoSrc(cover.pathname) : null,
					};
				}),
			);
			return { subjectId: subject.id, nodes, edges };
		}),

	// -------------------------------------------------------------------------
	// Mutations — Plants
	// -------------------------------------------------------------------------

	/** Create a bare Plant with no Origin yet. Returns its id. */
	createPlant: protectedProcedure
		.input(z.object({ name: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const name = input.name.trim();
			if (name === "") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A name is required",
				});
			}
			const [row] = await ctx.db
				.insert(plants)
				.values({ ownerId: ctx.user.id, name })
				.returning({ id: plants.id });
			if (!row) {
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
			}
			return row.id;
		}),

	/** Edit a Plant's editable details. Origin is set separately. */
	updatePlant: protectedProcedure
		.input(
			z.object({
				plantId: z.string(),
				name: z.string(),
				notes: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await getOwnedPlant(ctx.db, input.plantId, ctx.user.id);
			const name = input.name.trim();
			if (name === "") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A name is required",
				});
			}
			const notes = input.notes?.trim();
			await ctx.db
				.update(plants)
				.set({
					name,
					notes: notes === "" || notes === undefined ? null : notes,
				})
				.where(eq(plants.id, input.plantId));
		}),

	/** Delete a Plant, its photos (blobs included), and every edge referencing it. */
	deletePlant: protectedProcedure
		.input(z.object({ plantId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const photoUrls = await ctx.db.transaction(async (tx) => {
				await getOwnedPlant(tx, input.plantId, ctx.user.id);
				const photos = await photosOf(tx, input.plantId);
				// Cascading FKs remove this Plant's photos and every edge that
				// references it (as child or parent) when the row is deleted.
				await tx.delete(plants).where(eq(plants.id, input.plantId));
				return photos.map((p) => p.url);
			});
			// Clean up the blobs after the DB rows are gone (best effort).
			if (photoUrls.length > 0) {
				await del(photoUrls);
			}
		}),

	// -------------------------------------------------------------------------
	// Mutations — Origin
	// -------------------------------------------------------------------------

	/** Child-first: record that an existing Plant is a Division of an existing parent. */
	recordDivision: protectedProcedure
		.input(z.object({ childId: z.string(), parentId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.transaction(async (tx) => {
				await getOwnedPlant(tx, input.childId, ctx.user.id);
				await assertNoOrigin(tx, input.childId);
				await linkParent(
					tx,
					ctx.user.id,
					input.childId,
					input.parentId,
					undefined,
				);
				await tx
					.update(plants)
					.set({ originKind: "division" })
					.where(eq(plants.id, input.childId));
			});
		}),

	/** Child-first: record that an existing Plant is a Cross of two existing parents. */
	recordCross: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				seedParentId: z.string(),
				pollenParentId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.seedParentId === input.pollenParentId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A Cross needs two different parents",
				});
			}
			await ctx.db.transaction(async (tx) => {
				await getOwnedPlant(tx, input.childId, ctx.user.id);
				await assertNoOrigin(tx, input.childId);
				await linkParent(
					tx,
					ctx.user.id,
					input.childId,
					input.seedParentId,
					"seed",
				);
				await linkParent(
					tx,
					ctx.user.id,
					input.childId,
					input.pollenParentId,
					"pollen",
				);
				await tx
					.update(plants)
					.set({ originKind: "cross" })
					.where(eq(plants.id, input.childId));
			});
		}),

	/** Remove a Plant's Origin so it can be set again. */
	clearPlantOrigin: protectedProcedure
		.input(z.object({ plantId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.transaction(async (tx) => {
				await getOwnedPlant(tx, input.plantId, ctx.user.id);
				await tx
					.delete(parentEdges)
					.where(eq(parentEdges.childId, input.plantId));
				await tx
					.update(plants)
					.set({ originKind: null })
					.where(eq(plants.id, input.plantId));
			});
		}),

	// -------------------------------------------------------------------------
	// Mutations — Photos & Timeline
	// -------------------------------------------------------------------------

	/**
	 * Attach an already-uploaded photo (a Vercel Blob url/pathname from the
	 * upload route) to a Plant's Timeline. Does not touch the cover — the cover
	 * resolves to the latest Photo unless the owner has pinned one.
	 */
	addPhoto: protectedProcedure
		.input(
			z.object({
				plantId: z.string(),
				url: z.string().url(),
				pathname: z.string(),
				takenAt: z.number(),
				caption: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await getOwnedPlant(ctx.db, input.plantId, ctx.user.id);
			const caption = input.caption?.trim();
			const [row] = await ctx.db
				.insert(plantPhotos)
				.values({
					ownerId: ctx.user.id,
					plantId: input.plantId,
					url: input.url,
					pathname: input.pathname,
					takenAt: new Date(input.takenAt),
					caption: caption === "" || caption === undefined ? null : caption,
				})
				.returning({ id: plantPhotos.id });
			if (!row) {
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
			}
			return row.id;
		}),

	/** Edit a Photo's Timeline date and/or caption. */
	updatePhoto: protectedProcedure
		.input(
			z.object({
				photoId: z.string(),
				takenAt: z.number().optional(),
				caption: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [photo] = await ctx.db
				.select()
				.from(plantPhotos)
				.where(
					and(
						eq(plantPhotos.id, input.photoId),
						eq(plantPhotos.ownerId, ctx.user.id),
					),
				)
				.limit(1);
			if (!photo) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
			}
			const patch: Partial<PlantPhotoRow> = {};
			if (input.takenAt !== undefined) {
				patch.takenAt = new Date(input.takenAt);
			}
			if (input.caption !== undefined) {
				const caption = input.caption.trim();
				patch.caption = caption === "" ? null : caption;
			}
			await ctx.db
				.update(plantPhotos)
				.set(patch)
				.where(eq(plantPhotos.id, input.photoId));
		}),

	/** Pin a specific Photo as the Plant's cover. */
	setCover: protectedProcedure
		.input(z.object({ photoId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [photo] = await ctx.db
				.select()
				.from(plantPhotos)
				.where(
					and(
						eq(plantPhotos.id, input.photoId),
						eq(plantPhotos.ownerId, ctx.user.id),
					),
				)
				.limit(1);
			if (!photo) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
			}
			await ctx.db
				.update(plants)
				.set({ coverPhotoId: photo.id })
				.where(eq(plants.id, photo.plantId));
		}),

	/** Unpin the Plant's cover, so it falls back to the latest Photo. */
	clearCover: protectedProcedure
		.input(z.object({ plantId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await getOwnedPlant(ctx.db, input.plantId, ctx.user.id);
			await ctx.db
				.update(plants)
				.set({ coverPhotoId: null })
				.where(eq(plants.id, input.plantId));
		}),

	/** Remove a Photo from a Plant and delete its underlying blob. */
	removePhoto: protectedProcedure
		.input(z.object({ photoId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const url = await ctx.db.transaction(async (tx) => {
				const [photo] = await tx
					.select()
					.from(plantPhotos)
					.where(
						and(
							eq(plantPhotos.id, input.photoId),
							eq(plantPhotos.ownerId, ctx.user.id),
						),
					)
					.limit(1);
				if (!photo) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Photo not found",
					});
				}
				await tx.delete(plantPhotos).where(eq(plantPhotos.id, input.photoId));
				// If it was the pinned cover, unpin so the cover falls back to latest.
				await tx
					.update(plants)
					.set({ coverPhotoId: null })
					.where(
						and(
							eq(plants.id, photo.plantId),
							eq(plants.coverPhotoId, photo.id),
						),
					);
				return photo.url;
			});
			await del(url);
		}),
});

export type { Plant };
