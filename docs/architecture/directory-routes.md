# Seedit directory routes

## Status

Accepted.

## Decision

Seedit directory codes are mutable discovery routes, not subscription identities.

- `/s/funny` resolves the finalized `funny` directory snapshot and displays its deterministic winner.
- `/s/funny.bso` and `/s/funny-posting.bso` identify exact communities.
- `account.subscriptions` contains only exact community addresses or public keys. A directory code is never stored there.
- The home feed reads the exact subscription array directly and never resolves directory codes.
- The topbar links current directory-backed defaults by code (`funny` to `/s/funny`), while `My Communities` continues to expose exact subscriptions.
- Joining from `/s/funny` atomically subscribes to the exact current winner and records Seedit-only directory provenance.
- Generated post permalinks always use the post owner's exact community address and `/comments/<cid>`.
- A winner change does not alter a subscription by default. Seedit presents an inline choice to switch, keep both, or keep the current community.
- Automatic switching is an explicit per-directory preference. An automatic change produces a persistent notice with undo.

The short route is therefore a contested front door. The user's feed and durable links remain pinned to identities they can inspect and carry to another Bitsocial client.

## Snapshot rules

Directory payloads use `schemaVersion: 1` and a monotonically increasing `revision`. The revision is the atomic change boundary: candidate membership or winner selection must not change at the same revision.

Candidates are ordered deterministically by:

1. score, descending;
2. `addedAt`, ascending;
3. exact address, ascending.

Clients do not rotate to another candidate based on local availability. Every client using the same finalized snapshot must resolve the same winner.

The current `bitsocialnet/lists` publication is a bootstrap transport for these snapshots. It does not define the eventual decentralized voting or finalization protocol.

## Subscription provenance

Seedit stores directory provenance separately from the portable exact subscription array. Each tracked slot records:

- its exact attributable subscription address;
- the last acknowledged winner address and revision;
- whether the user explicitly enabled automatic switching.

This metadata lets Seedit offer winner-change actions without inventing a second kind of subscription. Other Bitsocial clients can ignore it and still read the user's exact subscriptions correctly.

## Defaults

Seedit's default-subscription list remains a list of exact addresses. A default entry may also include `directoryCode` and `directoryRevision` to record which finalized directory snapshot selected it. New accounts receive exact subscriptions plus the matching Seedit provenance; existing accounts retain their exact choices until they act on an update or previously enabled automatic switching.

The topbar uses that metadata for stable discovery navigation: a current default such as `pics-posting.bso` is presented as `pics` and links to `/s/pics`. This presentation does not change the exact address stored in the account. If a retained exact subscription no longer matches the current default winner, it remains visible by its address instead of being disguised as the directory.

## Rejected alternatives

- Directory codes in `account.subscriptions`: this makes feeds change at read time and is not portable across clients.
- Directory-coded post permalinks: a winner change can make an old post URL resolve through the wrong community.
- Client-local offline failover: two clients could resolve the same short route to different communities.
- Permanent Seedit-owned community subdomains: community identity should remain portable between Bitsocial clients.
- Administrator allocation of short names: this recreates the centralized veto power the directory mechanism is meant to replace.
