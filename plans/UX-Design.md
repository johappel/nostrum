# UX Design - Forum UI (MVP+)

## Ziel
Ein modernes, klar strukturiertes Forum-UI fuer den Communikeys-Stack mit lokal-first Verhalten, sichtbaren Sync-States und sauberer Moderations-Erweiterbarkeit.

## Entscheidung vorab
1. Kein blocker vor UI-Start: Write-Flow ist vorhanden.
2. UI kann jetzt starten.
3. Moderations-Workflows (hide/move) werden als eigene Folgeaufgaben integriert, nicht als Voraussetzung fuer das Layout.

## Design-Prinzipien
1. Local-first sichtbar: Inhalte sofort aus Dexie rendern, Netzwerkstatus getrennt anzeigen.
2. Fokus auf Lesbarkeit: Thread-Inhalt und Aktivitaet stehen im Mittelpunkt.
3. Kontext immer sichtbar: Community, Forum-Slug, Rechte und Sync-Zustand sind ohne Navigation erreichbar.
4. Progressive Disclosure: Moderations- und Admin-Funktionen nur bei Berechtigung zeigen.
5. Deterministische UI-States: pending/confirmed/failed fuer jede Write-Aktion klar markieren.
6. Flexibles Theming: `light/dark/auto` ist ein First-Class UX-Feature.

## Layout-Konzept
Desktop (>= 1200px):
1. Topbar (global):
   - Community Name/ID
   - Sync-Status
   - User/Permission Badge
   - Schnellaktionen (New Thread, Report Queue bei Moderatoren)
2. Left Sidebar:
   - Forum-Navigation (general + weitere forum-slugs)
   - Filter (aktiv, popular, unresolved reports)
   - Mini-Relay-Health
3. Main Content:
   - `/forums/:id`: Thread-Feed und Composer
   - `/forums/:id/:thread_id`: Thread-Detail + Replies
4. Right Sidebar:
   - Memberliste (General/Moderation)
   - Thread-Metadaten
   - Pending Writes/Retry Liste
5. Footer:
   - Relay endpoint
   - Last sync
   - Build/App metadata

Tablet (768-1199px):
1. Right Sidebar als Drawer.
2. Left Sidebar collapsible.
3. Main Content bleibt priorisiert.

Mobile (< 768px):
1. Topbar + Bottom Nav.
2. Sidebar-Inhalte in Sheet/Drawer Tabs.
3. Thread Composer sticky unten (optional, route-abhaengig).

## Seitenmodell nach Route
1. `/forums`
   - Community-Auswahl/Entry (Cards)
   - Sync readiness Hinweis
2. `/forums/:id`
   - Forum Dashboard:
     - Topbar + Sidebars
     - New Thread Composer
     - Thread-Liste mit Statusbadges
3. `/forums/:id/:thread_id`
   - Thread Fokus:
     - Root Post Hero
     - Reply Stream
     - Reaction/Vote Bar
     - Report Action
4. `/forums/:id/:thread_id/:post_id`
   - Wie Thread-Fokus mit Post-Highlight und Jump-Anchor

## Component Mapping (shadcn + Lucide)
Empfohlene Basis:
1. `shadcn` Blocks:
   - Application Shell Block (Topbar + Sidebar + Content)
   - Feed/List Blocks fuer Thread Cards
   - Detail Block fuer Thread Content
2. `shadcn` Komponenten:
   - `Button`, `Input`, `Textarea`, `Badge`, `Card`, `Separator`, `Tabs`, `Sheet`, `Dropdown Menu`, `Tooltip`, `Toast`, `Skeleton`, `Alert`, `Dialog`
3. Icons:
   - `@lucide/svelte`
   - Standardset:
     - `MessageSquare`, `Send`, `CircleAlert`, `Shield`, `Users`, `RefreshCw`, `Wifi`, `WifiOff`, `Clock3`, `ThumbsUp`, `ThumbsDown`, `Heart`
4. Toasts:
   - `sonner` als Standard fuer on-screen Meldungen
   - Erfolg/Warnung/Fehler/Info einheitlich ueber zentrale Toast-API

## Visuelle Richtung (State of the Art)
1. Heller neutraler Grund mit kontrastierten Panels.
2. Dichte Information, aber klare Hierarchie:
   - starke Typo fuer Thread-Titel
   - sekundaire Metadaten dezent
3. Statusfarben konsequent:
   - pending: amber
   - confirmed: green
   - failed: red
   - stale cache: blue/neutral hint
4. Subtile Motion:
   - Staggered entry fuer Thread-Liste
   - Optimistic items mit soft pulse bis confirmation

## Theme-Architektur (Tailwind 4 Variablen)
1. Theming ueber CSS-Variablen in `:root` und `.dark`.
2. Tailwind 4 `@theme inline` mappt Variablen auf Utility-Tokens.
3. Theme-Modi:
   - `light`
   - `dark`
   - `auto` (folgt `prefers-color-scheme`)
4. Theme-State:
   - persistiert in LocalStorage
   - initialer SSR-safe Fallback auf `auto`
   - Klassensteuerung ueber Root-Element (`.dark`)
5. Erlaubte Anpassung:
   - Palette, Radius, Shadow, Typography ueber Variablen
   - keine hardcoded Seitenfarben in Komponenten

## UI State Contract
1. Loading:
   - Skeletons fuer Thread-Liste und Detail
2. Stale cache:
   - Persistenter Hinweis wenn letzter erfolgreicher Sync zu alt ist
3. Sync progress:
   - Topbar progress + per-relay status
4. Partial relay failure:
   - Non-blocking Alert mit Retry CTA
5. Write states:
   - per item pending/confirmed/failed
   - deterministic retry button fuer failed writes
6. Toast feedback:
   - write success/failure
   - sync failure/restore
   - moderation action results

## Accessibility und UX-Qualitaet
1. Tastatur-navigierbar (Composer, Listen, Sidebars).
2. Fokuszustand sichtbar.
3. Semantische Landmarken (`header`, `nav`, `main`, `aside`, `footer`).
4. Farbkontrast >= WCAG AA fuer Text und Status.

## Umsetzungsreihenfolge (UI)
1. UI Foundation (shadcn setup + `@lucide/svelte` + `sonner` + Tailwind-4 theme vars + `light/dark/auto`).
2. App Shell (Topbar/Sidebar/Footer + responsive behavior).
3. Forum Dashboard (`/forums/:id`) inkl. Composer + Thread Cards.
4. Thread Detail (`/forums/:id/:thread_id`) inkl. reactions/reports UI.
5. Sync/Error/Retry Oberflaechen.
6. Moderations-/Member-Panels.

## Offene Entscheidungen
1. Ob `/forums` als Multi-Community Hub jetzt schon produktiv gebraucht wird.
2. Ob Right Sidebar standardmaessig offen bleibt oder kontextabhaengig.
3. Ob Bottom Composer auf Mobile immer sticky sein soll.
