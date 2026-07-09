"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { LogOut, PlusCircle, Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

/** Fixed bottom tab bar: Inventory · Add · account. Replaces the sidebar shell. */
export function BottomNav() {
	const pathname = usePathname();
	const onInventory = pathname === "/home";

	return (
		<nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-3xl items-stretch justify-around px-2">
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
					href="/plants/new"
				>
					<PlusCircle className="size-6" />
					Add
				</Link>
				<AccountMenu />
			</div>
		</nav>
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
