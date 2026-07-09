"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import type { Plant } from "~/lib/plant-types";

function plantLabel(p: Plant): string {
	return p.name;
}

/** Searchable single-plant picker used to choose Origin parents. */
export function PlantCombobox({
	plants,
	value,
	onSelect,
	exclude,
	placeholder,
}: {
	plants: Plant[];
	value: string | null;
	onSelect: (id: string) => void;
	exclude: (string | null)[];
	placeholder: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = plants.find((p) => p.id === value) ?? null;
	const options = plants.filter((p) => !exclude.includes(p.id));
	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					className="w-full justify-between font-normal"
					variant="outline"
				>
					<span className="truncate">
						{selected ? plantLabel(selected) : placeholder}
					</span>
					<ChevronDownIcon className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-72 p-0">
				<Command>
					<CommandInput placeholder="Search plants…" />
					<CommandList>
						<CommandEmpty>No plants found.</CommandEmpty>
						<CommandGroup>
							{options.map((p) => (
								<CommandItem
									key={p.id}
									onSelect={() => {
										onSelect(p.id);
										setOpen(false);
									}}
									value={`${plantLabel(p)} ${p.id}`}
								>
									{plantLabel(p)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
