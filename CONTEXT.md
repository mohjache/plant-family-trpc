# Plant Family

Plant Family is an app for tracking the plants you own — your Inventory — the
photos documenting each one across its life, and the breeding lineage (Pedigree)
that connects them. Inventory and photos are the primary surface; the family
history is reached per-plant.

## Language

**Plant**:
A single item in your Inventory and a node in a Pedigree. Every Plant is owned
and managed within one account. Usually a specimen you physically hold;
occasionally a thin record for a forebear you don't own (e.g. a wild species or
another grower's plant) that exists only to anchor a Pedigree. There is no
formal ownership distinction — a forebear is an ordinary Plant that simply may
carry little more than a name.
_Avoid_: specimen, plant family (see note), in collection / owned (see below)

**Inventory**:
The full set of an account's Plants, browsed on the home screen as a grid of
large photo cards. Because every Plant is owned, the Inventory is simply all of
the account's Plants — there is no "in / out of collection" subset.
_Avoid_: collection (deprecated — see note)

**Photo**:
A dated image of a Plant. Each Photo has a `takenAt` date (when the picture was
taken — editable, defaulting to upload time) and an optional caption. A Plant's
Photos form its Timeline. One Photo is the Plant's **cover** (the card/hero
thumbnail): by default the most recent Photo, but the owner may pin a specific
one.
_Avoid_: image, picture (inconsistent)

**Timeline**:
The chronological sequence of a Plant's dated Photos, shown on the Plant's detail
page as a growth journal. Ordered by each Photo's `takenAt`. The record of how a
single Plant changed across its life.
_Avoid_: gallery, album, journal, log (all vaguer or imply no ordering)

**Pedigree**:
The ancestry diagram showing a Plant and the parents/ancestors it descends from,
rooted at a single subject Plant and shown on that Plant's detail page.
Structurally a directed acyclic graph (DAG), not a strict tree, because an
ancestor can appear on more than one branch — in the rooted view such an
ancestor may simply be drawn more than once.
_Avoid_: family tree, lineage, breeding graph

**Origin**:
The event that produced a Plant. Every Plant has exactly one Origin, which is
either a Cross (two parents) or a Division (one parent).
_Avoid_: source, creation event

**Cross**:
The breeding event that produces a new Plant from two parents: a seed parent and
a pollen parent. One kind of Origin.
_Avoid_: hybridisation, breeding

**Division**:
The vegetative propagation event that produces a new Plant from a single parent,
clonally (the offspring is genetically identical to its one parent). One kind of
Origin. Contrast with a Cross, which has two parents and mixes their genetics.
_Avoid_: offset, cloning, splitting

**Seed parent**:
The parent Plant that bears the seed in a Cross (conventionally the maternal
parent).
_Avoid_: mother, female parent

**Pollen parent**:
The parent Plant that provides the pollen in a Cross (conventionally the paternal
parent).
_Avoid_: father, male parent

> Note: "Plant Family" is the app's name (branding) only. It is **not** a domain
> term. In particular, do not use "family" to mean a Pedigree — in botany
> "family" is a taxonomic rank (e.g. _Rosaceae_) and would be ambiguous.

> Deprecated: **In collection** / **Breeding graph**. Earlier the model split
> Plants into ones you physically held (`inCollection`) versus referenced
> ancestors, and rendered the whole account as one unrooted **Breeding graph**
> canvas. Both are retired — every Plant is owned (see ADR-0005) and family
> history is now a per-plant rooted Pedigree, not a whole-collection canvas (see
> ADR-0004).
