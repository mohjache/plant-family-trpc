import { Skeleton } from "~/components/ui/skeleton";

/**
 * Loading placeholders that mirror the real layout of each plant screen, shown
 * while the tRPC query is still loading. Each one matches the container
 * spacing, cover aspect ratio, and section rhythm of the page it stands in for
 * so the swap to real content doesn't shift the layout.
 */

/** Back button + title row shared by the plant sub-pages. */
function BackHeaderSkeleton({ trailing }: { trailing?: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2">
			<Skeleton className="size-9 rounded-md" />
			<Skeleton className="h-7 w-44" />
			{trailing ? <div className="ml-auto flex gap-2">{trailing}</div> : null}
		</div>
	);
}

/** A 4:5 photo card as it appears in the timeline list. */
function PhotoCardSkeleton() {
	return (
		<li className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border">
			<Skeleton className="aspect-[4/5] w-full rounded-none" />
			<div className="space-y-2 p-3">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-3 w-40" />
			</div>
		</li>
	);
}

/** The Inventory grid on /home. */
export function InventorySkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<Skeleton className="h-8 w-40" />
				<Skeleton className="h-8 w-24 rounded-md" />
			</div>
			<Skeleton className="h-9 w-full rounded-md" />
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{Array.from({ length: 6 }, (_, i) => (
					<div
						className="overflow-hidden rounded-xl border"
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder list
						key={i}
					>
						<Skeleton className="aspect-[4/5] w-full rounded-none" />
						<div className="p-2.5">
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/** The compact plant detail page. */
export function PlantDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Skeleton className="size-9 rounded-md" />
				<Skeleton className="h-7 w-40 flex-1" />
				<Skeleton className="size-9 rounded-md" />
			</div>
			<Skeleton className="mx-auto aspect-[4/5] w-full max-w-sm rounded-2xl" />
			{/* Timeline summary */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-24" />
					<Skeleton className="h-8 w-32 rounded-md" />
				</div>
				<Skeleton className="h-4 w-56" />
			</div>
			{/* Origin summary */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-20" />
					<Skeleton className="h-8 w-32 rounded-md" />
				</div>
				<Skeleton className="h-12 w-full rounded-lg" />
			</div>
			{/* Details */}
			<div className="space-y-3">
				<Skeleton className="h-6 w-20" />
				<Skeleton className="h-4 w-14" />
				<Skeleton className="h-9 w-full rounded-md" />
				<Skeleton className="h-4 w-14" />
				<Skeleton className="h-24 w-full rounded-md" />
				<Skeleton className="h-9 w-28 rounded-md" />
			</div>
		</div>
	);
}

/** The Timeline manager page (/plants/:id/photos). */
export function PlantTimelineSkeleton() {
	return (
		<div className="space-y-4">
			<BackHeaderSkeleton
				trailing={<Skeleton className="h-8 w-28 rounded-md" />}
			/>
			<ol className="space-y-4">
				{Array.from({ length: 2 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder list
					<PhotoCardSkeleton key={i} />
				))}
			</ol>
		</div>
	);
}

/** The bordered Origin editor form (also used while the plant list loads). */
export function OriginEditorSkeleton() {
	return (
		<div className="space-y-4 rounded-lg border p-3">
			<Skeleton className="h-4 w-56" />
			<Skeleton className="h-9 w-40 rounded-md" />
			<Skeleton className="h-4 w-16" />
			<Skeleton className="h-9 w-full rounded-md" />
			<Skeleton className="h-9 w-28 rounded-md" />
		</div>
	);
}

/** The Family history editor page (/plants/:id/family). */
export function PlantFamilySkeleton() {
	return (
		<div className="space-y-6">
			<BackHeaderSkeleton />
			<OriginEditorSkeleton />
			<Skeleton className="h-64 w-full rounded-lg" />
		</div>
	);
}
