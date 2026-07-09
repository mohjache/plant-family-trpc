CREATE SCHEMA "plant_family";
--> statement-breakpoint
CREATE TYPE "plant_family"."origin_kind" AS ENUM('cross', 'division');--> statement-breakpoint
CREATE TYPE "plant_family"."parent_role" AS ENUM('seed', 'pollen');--> statement-breakpoint
CREATE TABLE "plant_family"."parent_edge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ownerId" text NOT NULL,
	"childId" uuid NOT NULL,
	"parentId" uuid NOT NULL,
	"role" "plant_family"."parent_role"
);
--> statement-breakpoint
CREATE TABLE "plant_family"."plant_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ownerId" text NOT NULL,
	"plantId" uuid NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"takenAt" timestamp with time zone NOT NULL,
	"caption" text,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_family"."plant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ownerId" text NOT NULL,
	"name" text NOT NULL,
	"originKind" "plant_family"."origin_kind",
	"notes" text,
	"coverPhotoId" uuid,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plant_family"."parent_edge" ADD CONSTRAINT "parent_edge_childId_plant_id_fk" FOREIGN KEY ("childId") REFERENCES "plant_family"."plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_family"."parent_edge" ADD CONSTRAINT "parent_edge_parentId_plant_id_fk" FOREIGN KEY ("parentId") REFERENCES "plant_family"."plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_family"."plant_photo" ADD CONSTRAINT "plant_photo_plantId_plant_id_fk" FOREIGN KEY ("plantId") REFERENCES "plant_family"."plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parent_edge_child_idx" ON "plant_family"."parent_edge" USING btree ("childId");--> statement-breakpoint
CREATE INDEX "parent_edge_parent_idx" ON "plant_family"."parent_edge" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "parent_edge_owner_idx" ON "plant_family"."parent_edge" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "plant_photo_plant_idx" ON "plant_family"."plant_photo" USING btree ("plantId");--> statement-breakpoint
CREATE INDEX "plant_photo_owner_idx" ON "plant_family"."plant_photo" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "plant_owner_idx" ON "plant_family"."plant" USING btree ("ownerId");