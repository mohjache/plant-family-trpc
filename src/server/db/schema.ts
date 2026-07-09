import { index, pgSchema } from "drizzle-orm/pg-core";

/**
 * Each project shares the same database instance but lives in its own Postgres
 * schema (namespace). Scoping drizzle-kit with `schemaFilter` to this schema
 * keeps `db:push` from ever seeing — or dropping — other projects' objects
 * (tables, enums, types), which a table-name prefix alone does not protect.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const plantSchema = pgSchema("plant_family");

/** A Plant's Origin: produced by a Cross (two parents) or a Division (one). */
export const originKind = plantSchema.enum("origin_kind", [
	"cross",
	"division",
]);

/** Which parent an edge represents in a Cross. Unset for a Division edge. */
export const parentRole = plantSchema.enum("parent_role", ["seed", "pollen"]);

/**
 * A node in a Pedigree and an item in the Inventory. Every Plant is owned and
 * managed within one account (`ownerId` = the WorkOS user id); a forebear the
 * owner doesn't hold is just an ordinary (often photo-less) Plant. `originKind`
 * is unset until parents are attached, so a leaf ancestor has no origin.
 * See CONTEXT.md.
 */
export const plants = plantSchema.table(
	"plant",
	(d) => ({
		id: d.uuid().primaryKey().defaultRandom(),
		ownerId: d.text().notNull(),
		name: d.text().notNull(),
		originKind: originKind(),
		// Free-form notes the owner keeps on this Plant.
		notes: d.text(),
		// The owner's pinned cover Photo (the image shown as the Plant's Inventory
		// card / detail hero). When unset the cover resolves to the latest Photo by
		// `takenAt`. A soft pointer to `plant_photo.id` (no FK — cleared in app code
		// when the photo is removed) to avoid a circular table dependency.
		coverPhotoId: d.uuid(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
	}),
	(t) => [index("plant_owner_idx").on(t.ownerId)],
);

/**
 * One Photo in a Plant's Timeline. Kept in its own table (rather than an array
 * on the Plant) so adding a Photo doesn't rewrite the Plant row and the list can
 * grow. The image bytes live in Vercel Blob; we store the public `url` and the
 * `pathname` needed to delete the blob. `takenAt` is when the picture was taken
 * — editable, defaulting to upload time.
 */
export const plantPhotos = plantSchema.table(
	"plant_photo",
	(d) => ({
		id: d.uuid().primaryKey().defaultRandom(),
		ownerId: d.text().notNull(),
		plantId: d
			.uuid()
			.notNull()
			.references(() => plants.id, { onDelete: "cascade" }),
		url: d.text().notNull(),
		pathname: d.text().notNull(),
		takenAt: d.timestamp({ withTimezone: true }).notNull(),
		caption: d.text(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
	}),
	(t) => [
		index("plant_photo_plant_idx").on(t.plantId),
		index("plant_photo_owner_idx").on(t.ownerId),
	],
);

/**
 * One parent edge of the Pedigree DAG. A Division produces one edge (no role);
 * a Cross produces two edges tagged `seed` and `pollen`. Indexed both ways so a
 * Pedigree can be walked up (by child) and down (by parent), plus by owner.
 */
export const parentEdges = plantSchema.table(
	"parent_edge",
	(d) => ({
		id: d.uuid().primaryKey().defaultRandom(),
		ownerId: d.text().notNull(),
		childId: d
			.uuid()
			.notNull()
			.references(() => plants.id, { onDelete: "cascade" }),
		parentId: d
			.uuid()
			.notNull()
			.references(() => plants.id, { onDelete: "cascade" }),
		role: parentRole(),
	}),
	(t) => [
		index("parent_edge_child_idx").on(t.childId),
		index("parent_edge_parent_idx").on(t.parentId),
		index("parent_edge_owner_idx").on(t.ownerId),
	],
);
