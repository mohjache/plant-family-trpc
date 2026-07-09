"use client";

import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import type { Pedigree as PedigreeData, PedigreeNode } from "~/lib/plant-types";
import { cn } from "~/lib/utils";

const roleLabel: Record<"seed" | "pollen", string> = {
	seed: "Seed",
	pollen: "Pollen",
};

/**
 * Hand-rendered rooted Pedigree: the subject sits at the bottom and its
 * ancestors stack above it, generation by generation. Scrolls horizontally when
 * a generation is wide.
 */
export function Pedigree({ data }: { data: PedigreeData }) {
	const nodeById = new Map<string, PedigreeNode>();
	for (const node of data.nodes) {
		nodeById.set(node.id, node);
	}
	// parentEdges grouped by child, so we can walk upward from the subject.
	const parentsByChild = new Map<
		string,
		{ parentId: string; role?: "seed" | "pollen" }[]
	>();
	for (const edge of data.edges) {
		const arr = parentsByChild.get(edge.childId) ?? [];
		arr.push({ parentId: edge.parentId, role: edge.role });
		parentsByChild.set(edge.childId, arr);
	}

	function renderNode(id: string, path: Set<string>) {
		const node = nodeById.get(id);
		if (!node) return null;
		const parents = parentsByChild.get(id) ?? [];
		// Guard against a corrupt cycle (the server prevents these on write).
		const visitableParents = parents.filter((p) => !path.has(p.parentId));
		const nextPath = new Set(path).add(id);
		return (
			<div className="flex flex-col items-center gap-3">
				{visitableParents.length > 0 ? (
					<div className="flex items-end gap-6">
						{visitableParents.map((p) => (
							<div
								className="flex flex-col items-center gap-1"
								key={p.parentId}
							>
								{p.role ? (
									<Badge className="text-[10px]" variant="outline">
										{roleLabel[p.role]}
									</Badge>
								) : null}
								{renderNode(p.parentId, nextPath)}
							</div>
						))}
					</div>
				) : null}
				<NodeCard node={node} subject={id === data.subjectId} />
			</div>
		);
	}

	return (
		<div className="overflow-x-auto pb-2">
			<div className="flex min-w-max justify-center px-2">
				{renderNode(data.subjectId, new Set())}
			</div>
		</div>
	);
}

const originLabel = { cross: "Cross", division: "Division" } as const;

function NodeCard({ node, subject }: { node: PedigreeNode; subject: boolean }) {
	return (
		<Link
			className={cn(
				"flex w-36 flex-col items-center gap-1 rounded-lg border bg-card p-2 text-center transition-shadow hover:shadow-sm",
				subject && "ring-2 ring-primary",
			)}
			href={`/plants/${node.id}`}
		>
			<div className="size-14 overflow-hidden rounded-md bg-muted">
				{node.coverUrl ? (
					// biome-ignore lint/performance/noImgElement: remote Vercel Blob URL
					<img alt="" className="size-full object-cover" src={node.coverUrl} />
				) : null}
			</div>
			<span className="line-clamp-1 font-medium text-sm">{node.name}</span>
			{node.originKind ? (
				<Badge className="text-[10px]" variant="secondary">
					{originLabel[node.originKind]}
				</Badge>
			) : null}
		</Link>
	);
}
