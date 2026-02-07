# Store-Konzept (Svelte 5 + Dexie)

## Ziel
Das Forum soll schnell sichtbar sein, auch bei vielen Threads und langsamen Relays.

Kernidee:
- UI rendert zuerst aus lokalem Cache (Dexie).
- Relay-Sync laeuft im Hintergrund.
- Neue Events aktualisieren nur betroffene Views.

## Architektur in kurz
- `IndexedDB` via Dexie ist lokale Datenbasis.
- Abgeleitete Svelte Stores lesen per `liveQuery` aus Dexie.
- Netzwerk-Layer schreibt Events inkrementell in Dexie.
- UI-State (Filter, aktive Tabs, Sortierung) bleibt in Svelte 5 `$state`.

## Empfohlene Tabellen
- `events`
  - Roh-Events (`id`, `kind`, `pubkey`, `created_at`, `tags`, `content`, `community`)
- `sections`
  - Aufbereitete Sections aus `kind:10222` (`community`, `section`, `kinds`, `listRef`)
- `lists`
  - Aufbereitete `kind:30000` Listen (`community`, `dTag`, `members`, `updatedAt`)
- `thread_heads`
  - Materialisierte Thread-Roots fuer schnelle Listenansicht (`community`, `forumSlug`, `rootId`, `lastActivityAt`, `author`)
- `reactions`
  - Normalisierte `kind:7` (`targetId`, `author`, `value`, `createdAt`)
- `labels`
  - Normalisierte `kind:1985` (`targetId`, `label`, `reason`, `author`, `createdAt`)
- `sync_cursor`
  - Letzter Sync-Stand je `relay + community + stream`

## Wichtige Indizes
- `events`: `[community+kind+created_at]`, `id`, `pubkey`
- `thread_heads`: `[community+forumSlug+lastActivityAt]`, `rootId`
- `lists`: `[community+dTag]`
- `reactions`: `[targetId+author]`, `targetId`
- `labels`: `[targetId+label+createdAt]`, `targetId`
- `sync_cursor`: `[relay+community+stream]`

## Ladefluss (schnell wahrgenommene UI)
1. App startet, liest `thread_heads` lokal, rendert sofort.
2. Parallel startet Sync von Relays mit `since=sync_cursor`.
3. Optionales Provisioning: `d=General` wird aus WP-Member-Endpoint (z. B. `/api/wp-members`) in Dexie aktualisiert.
4. Neue Events werden in Batches gespeichert (Transaktionen).
5. Materialisierte Tabellen (`thread_heads`, `reactions`) werden inkrementell aktualisiert.
6. `liveQuery` triggert nur betroffene Komponenten.

## Store-Schnitt (minimal)
- `communityStore(communityPubkey)`
  - liefert Section- und Rechtekontext (`10222`, `30000`)
- `threadListStore(communityPubkey, forumSlug, filter)`
  - liest aus `thread_heads`
- `threadDetailStore(rootId)`
  - liest Root, Replies, Reaktionen, Labels
- `permissionsStore(userPubkey, communityPubkey)`
  - `canPost`, `canModerate`, `canReact`
- `syncStateStore(communityPubkey)`
  - `isSyncing`, `lastSyncAt`, `relayHealth`

## Route-Contracts
- `/forums/:id`
  - data: `{ forumId }`
- `/forums/:id/:thread_id`
  - data: `{ forumId, threadId }`
- `/forums/:id/:thread_id/:post_id`
  - data: `{ forumId, threadId, postId }`
- `postId` ist reine Fokus-/Highlight-Information.
  - Store-Grundlage bleibt `threadDetailStore(threadId)`.
  - Bei unbekanntem `postId` zeigt die UI den Thread normal plus Hinweis.

## Performance-Regeln
- Local-first: nie auf Relay warten, wenn Cache vorhanden ist.
- Inkrementell statt Full-Reload.
- Liste virtualisieren (lange Threads).
- Reaktionen/Votes aggregieren und nur Aggregat rendern.
- Writes optimistisch lokal eintragen, dann Netz-Ack markieren.

## Konsistenzregeln
- Source of Truth fuer Rechte: `kind:30000` in Dexie (nicht direkt WP).
- Bei Votes zaehlt pro `(targetId, author)` nur neueste Reaktion.
- Moderationslabels (`kind:1985`) werden beim Rendern als Filter angewendet.

## MVP-Empfehlung
1. Erst `events`, `lists`, `thread_heads`, `sync_cursor` bauen.
2. Dann `threadListStore` + `permissionsStore`.
3. Danach Reaktionen/Labels als zweiten Schritt.
