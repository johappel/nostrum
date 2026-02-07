# Nostr Forum Client - Communikeys Konzept (v2)

## Ziel
Ein rein browserbasierter Forum-Client auf Basis von Communikeys (kind `10222` + `30222`), ohne Vermischung mit NIP-72-Modelllogik.

## Normative Begriffe
- `MUST`: zwingend fuer Interoperabilitaet in diesem Konzept.
- `SHOULD`: starke Empfehlung; Abweichung ist moeglich, muss aber bewusst begruendet werden.

## Klare Abgrenzung
- Dieses Konzept basiert auf Communikeys aus `Communikeys-NIP.md`.
- Community-Identitaet ist die `pubkey` des Community-Keys (latest `kind:10222`).
- NIP-72 (moderated communities) ist nicht Teil dieses Designs.

## Rollen und Keys
- `community_key`:
  - signiert `kind:10222` (Community Definition)
  - bleibt idealerweise offline/cold
- `membership_admin_key`:
  - aktualisiert `kind:30000` Profile-Listen (`d=General`, optional weitere)
  - kann identisch mit `community_key` sein, muss aber nicht
- `moderation_bot_key` (empfohlen):
  - verarbeitet Moderationsaktionen von berechtigten Moderatoren
  - schreibt abgeleitete Moderations-Events und aktualisiert Listen atomar
- `user_key`:
  - signiert Postings (`kind:11`, optional weitere Kinds)

## Event-Modell (MVP)

### 1) Community Definition (`kind:10222`)
MUST:
- `["r", "<relay-url>"]` (mind. ein Relay, erstes ist main relay)
- pro Section:
  - `["content", "<SectionName>"]`
  - mindestens ein `["k", "<kind>"]`
  - `["a", "30000:<list_pubkey>:<d-tag>", "<relay-url>"]`

SHOULD:
- Section `General` mit `k=1111`, `k=7`, `k=1985`
- `badge`-Tags pro Section (NIP-58), wenn Zugriff ueber Badges erzwungen werden soll

### 2) Profile Lists (`kind:30000`)
- Eine Liste pro Section (`d` = Section Name)
- `p`-Tags enthalten erlaubte Publisher-Pubkeys
- Client filtert Content ueber diese Listen (authors-filter)

## Rechte-Modell fuer deine Anforderung (WP-User schreiben automatisch)
- Ziel: Alle erkannten WordPress-User duerfen Threads und Beitraege erstellen.
- Umsetzung:
  - `General` bleibt Interaktions-Section (`1111`, `7`, `1985`) mit Liste `d=General`.
  - `Forum` (`k=11`) referenziert dieselbe Liste wie `General` (gleiches `a`-Tag).
- Effekt:
  - Jeder Pubkey in `d=General` darf sowohl interagieren als auch Forum-Posts erstellen.
- Wichtig:
  - "Automatisch" bedeutet in Communikeys: Die `kind:30000` Liste wird laufend mit der WP-Userbasis synchronisiert.
  - Source-of-Truth bleibt Nostr (`30000`), nicht direkt WordPress.

## Moderation ueber Badge-Rollen (NIP-58)
- Ziel:
  - Moderatoren duerfen Inhalte moderieren und Nutzerrechte entziehen, ohne dass der Community-Owner jedes Mal manuell eingreifen muss.

MUST:
- Moderator-Rolle als Badge definieren (Badge Definition `kind:30009`, z. B. `d=moderator`).
- Moderatoren in einer dedizierten Liste `kind:30000` mit `d=Moderation` fuehren.
- Badge-Vergabe und `d=Moderation` Liste synchron halten (kein Drift zwischen Badge und Liste).

SHOULD:
- Vergabe/Entzug ueber delegierten `moderation_bot_key` ausfuehren.
- Clients akzeptieren Moderationsaktionen nur, wenn Autor in `d=Moderation` steht (optional zusaetzlich Badge-Pruefung).

Moderationsaktionen (app-Konvention):
- Beitrag ausblenden (Soft-Delete):
  - `kind:1985` Label auf Ziel-Event mit `mod:hide`.
- Beitrag neu zuordnen (Unterforum wechseln):
  - `kind:1985` Label auf Ziel-Event mit `mod:move` und neuem `forum:<slug>`.
- User Schreibrechte entziehen:
  - `moderation_bot_key` publiziert neue `kind:30000` fuer `d=General` ohne den betreffenden `p`-Tag.

Grenze von "Loeschen":
- "Hartes" Loeschen via `kind:5` ist relay-abhaengig und oft nur fuer den Originalautor garantiert.
- Fuer Interoperabilitaet im Community-Kontext gilt daher:
  - Moderation primar als Soft-Delete/Hide per Moderations-Label + Client-Filter.

## Reaktionen, Votes und Alerts
Ziel:
- Einheitliches Verhalten fuer Smilies, Abstimmungen und Meldungen.

MUST (Smilies/Reaktionen):
- Event-Typ: `kind:7`.
- Zielbezug per `["e","<target-event-id>"]`.
- Community-Bezug per `["h","<community-pubkey>"]`.
- Rechtepruefung gegen `d=General` Liste.

SHOULD (Smilies/Reaktionen):
- `content` enthaelt genau ein Emoji oder einen kurzen Reaktionscode (z. B. `:heart:`).

MUST (Votes):
- Event-Typ: `kind:7`.
- Zielbezug per `e`, Community-Bezug per `h`.
- `content` nur `+` oder `-`.
- Pro `(target-event-id, voter-pubkey)` zaehlt nur die neueste Vote-Reaktion.

SHOULD (Votes):
- Client blendet fruehere Vote-Reaktionen desselben Users auf dasselbe Ziel aus.

MUST (Alert/Report):
- Event-Typ: `kind:1985` (Label).
- Zielbezug per `["e","<target-event-id>"]`.
- Community-Bezug per `["h","<community-pubkey>"]`.
- Label-Klasse per Tag `["t","mod:report"]` oder `["t","alert"]`.

SHOULD (Alert/Report):
- Report-Grund als zusaetzlicher Tag, z. B. `["reason","spam"]`, `["reason","abuse"]`.
- Mod-UI zeigt offene Reports gruppiert nach Ziel-Event.

### 3) Forum Posts (`kind:11`, community-exclusive)
- Fuer Forum-Posts nur `h`-Tag auf Community-Pubkey:
  - `["h", "<community-pubkey>"]`
- Kein `kind:30222` fuer `kind:11` verwenden

### 4) Optional: Long-form (`kind:30023`)
- Falls `30023` erlaubt sein soll:
  - in Section als `k=30023` zulassen
  - fuer Multi-Community-Targeting `kind:30222` nutzen
  - fuer single-community kann ebenfalls `30222` genutzt werden, wenn der Client dieses Muster konsistent erzwingen will

### 5) Entscheidungshilfe: `kind:11` vs `kind:30222`
- `kind:11` ist der eigentliche Forum-Post und community-exklusiv:
  - genau eine Community via `["h", "<community-pubkey>"]`
- `kind:30222` ist ein Targeting-Event fuer eine bestehende Publikation:
  - kann eine oder mehrere Communities adressieren (`p`-Tags + passende `r`-Relay-Hints)
- Im MVP fuer Forum gilt:
  - `kind:11` mit `h`, ohne `30222`
- Fuer nicht-exklusive Kinds (z. B. `30023`) kann `30222` genutzt werden, wenn Community-Targeting benoetigt wird.

Beispiel A (`kind:11`, exklusiv):
```json
{
  "kind": 11,
  "pubkey": "<author-pubkey>",
  "tags": [
    ["h", "<community-pubkey>"],
    ["title", "Forum Thema"]
  ],
  "content": "Mein Beitrag"
}
```

Beispiel B (`kind:30222`, multi-target):
```json
{
  "kind": 30222,
  "pubkey": "<author-pubkey>",
  "tags": [
    ["d", "<random-id>"],
    ["e", "<event-id-of-original-publication>"],
    ["k", "30023"],
    ["p", "<community-pubkey-1>"],
    ["r", "wss://relay-1.example"],
    ["p", "<community-pubkey-2>"],
    ["r", "wss://relay-2.example"]
  ],
  "content": ""
}
```

## Publish-/Read-Workflow

### Read
1. Lade latest `kind:10222` der Community-Pubkey.
2. Parse Sections (`content` + zugehoerige `k`/`a`/`badge`).
3. Lade referenzierte `kind:30000` Listen.
4. Query Events pro Section:
   - `kinds`: erlaubte Kinds der Section
   - `authors`: Pubkeys aus Listen-`p`-Tags
   - plus Community-Zuordnung:
     - `#h=[community_pubkey]` fuer exclusive Kinds (`11`, `9`)
     - oder via `30222`-Aufloesung bei targeted Kinds

### Write (kind:11)
1. Client prueft lokal, ob User in der Liste der Forum-Section enthalten ist (`kind:30000` aus dem `a`-Tag; in deinem Modell dieselbe Liste wie `General`).
2. Client erstellt `kind:11` mit `h=<community_pubkey>`.
3. Signatur via NIP-07.
4. Publish auf alle in `r` definierten Relays.

## Wie koennen Nicht-Owner neue Foren anlegen?
- Grenze im Protokoll:
  - Neue `content`-Sections in `kind:10222` kann nur der `community_key` anlegen.
- Loesung ohne Owner-Bottleneck:
  - "Forum anlegen" nicht als neue `10222`-Section modellieren.
  - Stattdessen als user-generiertes Forum-Root-Event innerhalb der bestehenden `Forum`-Section.
- Konvention (app-spezifisch, aber einfach):
  - Forum-Root: `kind:11` mit Tags `["h","<community>"]`, `["t","forum-root"]`, `["t","forum:<slug>"]`, `["title","<name>"]`.
  - Threads in diesem Forum: `kind:11` mit `["h","<community>"]` und `["t","forum:<slug>"]`.
- Berechtigung:
  - Wer in der (General/Forum) `30000`-Liste ist, darf Forum-Roots und Threads erstellen.

## Verbindliches Tag-Schema fuer Unterforen
MUST:
- Forum-Root ist `kind:11` mit:
  - `["h","<community-pubkey>"]`
  - `["t","forum-root"]`
  - `["t","forum:<slug>"]`
  - `["title","<anzeigename>"]`
- Thread in Unterforum ist `kind:11` mit:
  - `["h","<community-pubkey>"]`
  - `["t","forum:<slug>"]`

MUST (Slug-Regeln):
- Normalisiert in lowercase.
- Erlaubte Zeichen: `a-z`, `0-9`, `-`.
- Regex: `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$` (2-40 Zeichen, kein `-` am Rand).
- Slug ist innerhalb einer Community eindeutig.
- Reservierte Slugs sind verboten: `general`, `forum`, `admin`, `mod`, `system`, `all`.

MUST (Kollisionsregeln):
- Existiert `forum:<slug>` bereits, erzeugt der Client deterministisch den naechsten freien Suffix:
  - `forum:<slug>-2`, dann `forum:<slug>-3`, usw.
- Kandidaten werden gegen bestehende Forum-Root-Events derselben Community geprueft (`h` + `t=forum-root`).
- Bei gleichzeitiger Kollision auf verschiedenen Relays gewinnt fuer die Anzeige der aelteste Root (`created_at`, danach `id` lexikografisch als Tie-Break).

SHOULD:
- Anzeigename (`title`) darf frei sein, auch wenn Slug technisch normalisiert ist.
- Umbenennen erzeugt neues Root-Event mit neuem Slug; alte Threads bleiben beim alten Slug (kein stilles Re-Mapping).

## WordPress Integration (realistisch)
- WordPress ist Provisioning-/Admin-Quelle, nicht Protokoll-Source-of-Truth.
- Source-of-Truth im Netzwerk sind `10222` + `30000` Events.
- Fuer praktikable WP-Integration wird ein minimaler Endpoint empfohlen:
  - liefert `{id, display_name, nostr_pubkey_hex}` fuer freigeschaltete Mitglieder
  - normale `/wp/v2/users` Responses liefern typischerweise nicht alle benoetigten Meta-Felder oeffentlich
- Dev-Setup im Client:
  - lokaler Provisioning-Endpoint: `/api/wp-members`
  - `WP_MEMBERS_ENDPOINT` (ENV) schaltet auf echten WP-Endpoint um
  - wenn `WP_MEMBERS_ENDPOINT` nicht gesetzt ist, liefert `/api/wp-members` Mock-Daten aus `/api/mock-wp-users`
  - synchronisiert Liste `d=General` in Dexie beim Oeffnen von `/forums/:id`
  - `preserveExisting=true`, damit Demo-/bestehende Mitglieder nicht ueberschrieben werden

## Muss-Praezisierungen vor Implementierung
- Pubkey-Format:
  - intern immer hex
  - `npub` nur fuer UI-Eingabe/Anzeige (beim Import dekodieren)
- Section-Regeln:
  - exakte Definition, welche Kinds pro Section erlaubt sind
  - ob `badge` zwingend ist oder `30000`-Liste alleine reicht
- Governance:
  - wer darf `30000` aktualisieren (ein Key oder mehrere)
  - wie Konflikte bei konkurrierenden Listen aufgeloest werden
  - welche Moderator-Aktionen direkt akzeptiert werden und welche ueber `moderation_bot_key` laufen
- Relay-Strategie:
  - write-to-all, read-from-all, dedupe per event id
  - Timeout/Retry/Partial-Failure Verhalten

## Minimaler MVP-Scope
- Eine Community
- Sections:
  - `General` (`1111`, `7`, `1985`)
  - `Forum` (`11`)
- Access Control nur ueber `30000` Listen
- Keine Badge-Pflicht fuer normales Posting im MVP
- Moderator-Badge (`d=moderator`) optional fuer Moderationsfunktionen
- Kein `30222` im MVP (da nur `kind:11`)

## Spaeterer Ausbau
- `30023` + `30222` fuer cross-community Long-form
- Badge-basierter Zugang (NIP-58)
- Delegated award/admin keys
- Moderations-UI (labels, policy references, retention)
