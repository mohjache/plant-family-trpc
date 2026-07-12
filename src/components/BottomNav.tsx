"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { Camera, LogOut, PlusCircle, Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBottomBarState } from "~/components/bottom-bar-context";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

/**
 * Fixed bottom bar. By default it's the Inventory · Add · account tab bar, but
 * when a page registers a primary action (see `useBottomBarAction`) it swaps to
 * that single full-width action — keeping the bar contextual to the current task
 * so the nav links can't be misclicked while, e.g., adding a photo.
 */
export function BottomNav() {
	const { action, onClickRef } = useBottomBarState();

	return (
		<nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-3xl items-stretch justify-around px-2">
				{action ? (
					<Button
						className="my-2 w-full"
						disabled={action.disabled}
						onClick={() => onClickRef.current()}
					>
						{action.loading ? <Spinner /> : null}
						{action.label}
					</Button>
				) : (
					<NavTabs />
				)}
			</div>
		</nav>
	);
}

function NavTabs() {
	const pathname = usePathname();
	const onInventory = pathname === "/home";

	// While viewing a specific plant, "Add" adds a photo to *that* plant's
	// timeline rather than creating a new plant.
	const match = pathname.match(/^\/plants\/([^/]+)/);
	const plantId = match && match[1] !== "new" ? match[1] : null;
	const addHref = plantId ? `/plants/${plantId}/photos/new` : "/plants/new";
	const AddIcon = plantId ? Camera : PlusCircle;
	const addLabel = plantId ? "Add photo" : "Add";

	return (
		<>
			<Link
				className={cn(
					"flex flex-1 flex-col items-center justify-center gap-1 text-xs",
					onInventory ? "text-primary" : "text-muted-foreground",
				)}
				href="/home"
			>
				<Sprout className="size-6" />
				Inventory
			</Link>
			<Link
				className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground text-xs"
				href={addHref}
			>
				<AddIcon className="size-6" />
				{addLabel}
			</Link>
			<AccountMenu />
		</>
	);
}

function AccountMenu() {
	const { user, signOut } = useAuth();

	const initials =
		[user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("") ||
		user?.email?.[0]?.toUpperCase() ||
		"?";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground text-xs outline-none">
				<Avatar className="size-6">
					{user?.profilePictureUrl ? (
						<AvatarImage alt="" src={user.profilePictureUrl} />
					) : null}
					<AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
				</Avatar>
				Account
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" side="top">
				{user?.email ? (
					<div className="px-2 py-1.5 text-muted-foreground text-xs">
						{user.email}
					</div>
				) : null}
				<DropdownMenuItem onClick={() => signOut()}>
					<LogOut />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
