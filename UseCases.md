# Use Cases - Nostr Forum auf Communikeys

Dieses Dokument beschreibt typische Nutzungsfaelle fuer das Forum und zeigt, welche Events wann publiziert werden.

## Annahmen (MVP)
- Community wird ueber `kind:10222` beschrieben.
- Forum-Posts laufen ueber `kind:11` mit `h=<community-pubkey>` (community-exklusiv).
- Zugriff wird im MVP ueber Section-Listen (`kind:30000`) gesteuert.
- Signatur im Client via NIP-07.
- In deinem Rechte-Modell referenzieren `General` und `Forum` dieselbe Liste (`d=General`).
- Unterforen nutzen das Tag-Schema aus `plans/architecture-communikeys-v2.md` (Abschnitt "Verbindliches Tag-Schema fuer Unterforen").
- Moderation nutzt Badge-Rolle `moderator` und Liste `d=Moderation`.
- Reaktionen/Votes nutzen `kind:7`, Reports nutzen `kind:1985`.

## Use Case 1 - Community initial aufsetzen

Ziel: Owner/Admin erstellt eine neue Community mit Forum und General-Interaktion.

Ablauf:
1. Community-Profil wird angelegt oder aktualisiert.
2. Community-Definition wird auf Relay(s) publiziert.
3. Initiale Mitgliederliste `d=General` wird publiziert und von `General` sowie `Forum` referenziert.

Events:
- `kind:0` (optional, aber empfohlen): Profil-Metadaten fuer Community-Key.
- `kind:10222`: Definition mit `r`, `content`, `k`, `a` Tags.
- `kind:30000` mit `d=General`: Whitelist fuer Interaktion (`1111`, `7`, `1985`).

Signierende Keys:
- `community_key` fuer `10222` (und meist `kind:0`).
- `membership_admin_key` fuer `30000` Listen.

## Use Case 2 - Mitglied wird freigeschaltet

Ziel: Ein Nutzer soll im Forum posten duerfen.

Ablauf:
1. Admin waehlt Nutzer im Admin-Flow aus (z. B. aus WordPress-Quelle).
2. Admin-Client fuegt dessen Pubkey in die gemeinsame Schreibliste (`d=General`) ein.
3. Aktualisierte Liste wird neu publiziert.

Events:
- Neues `kind:30000` mit `d=General` und erweitertem Satz an `p`-Tags.

Wichtig:
- Es ist kein "Patch" am alten Event, sondern eine neue Version derselben Liste.
- Clients verwenden immer die neueste gueltige Version der Liste.

## Use Case 3 - Nutzer liest Forum-Inhalte

Ziel: Nutzer sieht alle erlaubten Threads der Community.

Ablauf:
1. Client laedt `kind:10222` der Community.
2. Client liest aus der Forum-Section das `a`-Tag (im Modell: `30000:<pubkey>:General`).
3. Client laedt die referenzierte Liste (`kind:30000`, `d=General`).
4. Client fragt Threads an: `kinds=[11]`, `authors=[whitelist]`, `#h=[community_pubkey]`.
5. Optional: Client laedt `kind:0` der Autoren fuer Anzeige.

Events:
- Keine neuen Events; reiner Read-Flow.

## Use Case 4 - Nutzer erstellt neuen Thread

Ziel: Berechtigter Nutzer erstellt einen neuen Forum-Post.

Ablauf:
1. Client prueft lokal, ob der Nutzer in der gemeinsamen Schreibliste (`kind:30000`, `d=General`) steht.
2. Client erstellt `kind:11` mit `h=<community_pubkey>` und Inhalt.
3. Nutzer signiert via NIP-07.
4. Client publiziert auf alle in `10222` definierten `r`-Relays.

Events:
- `kind:11` (neu).

Beispiel Tags:
- `["h", "<community-pubkey>"]`
- optional Thread/Reply-Tags nach Client-Logik (`e`, `p`, `title`, ...).

## Use Case 5 - Kommentar und Reaktion auf Thread

Ziel: Mitglieder interagieren mit einem Thread.

Ablauf:
1. Client prueft Berechtigung in `General`-Liste (`kind:30000`, `d=General`).
2. Kommentar wird erstellt und signiert.
3. Reaktion wird erstellt und signiert.

Events:
- `kind:1111` fuer Kommentar auf den Thread.
- `kind:7` fuer Reaktion.
- optional `kind:1985` fuer Label/Moderationsmarkierung.

Hinweis:
- In diesem Modell teilen sich `General` und `Forum` dieselbe Schreibliste, damit alle WP-User beides duerfen.

## Use Case 6 - Cross-Community Publishing (spaeterer Ausbau)

Ziel: Ein Long-form Beitrag soll in mehreren Communities sichtbar sein.

Ablauf:
1. Autor publiziert den eigentlichen Beitrag (z. B. `kind:30023`).
2. Autor publiziert ein Targeting-Event mit Ziel-Communities.
3. Community-Clients lesen das Targeting und zeigen den Beitrag an, wenn Section-Regeln passen.

Events:
- `kind:30023` (Original-Publikation).
- `kind:30222` mit:
  - Referenz auf Original (`e` oder `a`)
  - `k=<original-kind>`
  - mehrere `p=<community-pubkey>` und passende `r=<relay-url>`.

Abgrenzung:
- `kind:30222` ist fuer Targeting.
- `kind:11` bleibt community-exklusiv und nutzt direkt `h`.

## Use Case 7 - Beitrag "bearbeiten"

Ziel: Nutzer korrigiert einen bestehenden Thread.

Realitaet:
- Nostr-Events sind unveraenderlich; ein bestehendes `kind:11` wird nicht in-place editiert.

Pragmatischer App-Flow:
1. Client erstellt neue Revision als neues `kind:11`.
2. Neue Revision referenziert alten Beitrag (client-spezifische Konvention).
3. UI zeigt standardmaessig die neueste Revision.
4. Optional wird alter Beitrag per `kind:5` als geloescht markiert.

Events:
- Neues `kind:11` (Revision).
- Optional `kind:5` (Delete/Hide-Hinweis, relay/client-abhaengig).

## Use Case 8 - Mitglied verliert Schreibrecht

Ziel: Nutzer darf ab jetzt nicht mehr posten.

Ablauf:
1. Admin entfernt den Pubkey aus der relevanten Section-Liste.
2. Aktualisierte Liste wird publiziert.
3. Clients blocken kuenftige Posts dieses Nutzers in dieser Section.

Events:
- Neues `kind:30000` fuer `d=General`.

Wirkung:
- Alte, bereits publizierte Events bleiben historisch vorhanden.
- Die neue Liste steuert, was kuenftig als gueltig/anzeigenwert gilt.

## Use Case 9 - Nicht-Owner legt neues "Forum" an

Ziel: Ein normaler, berechtigter User legt ohne Owner-Eingriff ein neues Unterforum an.

Wichtig:
- Es wird keine neue `content`-Section in `kind:10222` angelegt.
- Stattdessen wird ein Forum als Root-Event innerhalb der bestehenden Forum-Section modelliert.

Ablauf:
1. Client prueft Schreibrecht ueber gemeinsame Liste (`kind:30000`, `d=General`).
2. Nutzer erstellt ein Forum-Root-Event.
3. Nutzer signiert via NIP-07 und publiziert auf Community-Relays.
4. Andere Nutzer erstellen Threads mit demselben `forum:<slug>` Tag.

Events:
- Forum-Root: `kind:11` mit Tags
  - `["h", "<community-pubkey>"]`
  - `["t", "forum-root"]`
  - `["t", "forum:<slug>"]`
  - `["title", "<Forumname>"]`
- Thread im Unterforum: `kind:11` mit Tags
  - `["h", "<community-pubkey>"]`
  - `["t", "forum:<slug>"]`

## Use Case 10 - Slug-Kollision beim Forum-Anlegen

Ziel: Zwei User wollen nahezu gleichzeitig dasselbe Unterforum anlegen.

Ablauf:
1. User A und User B schlagen beide den Slug `dev-help` vor.
2. Client A publiziert Root mit `t=forum:dev-help`.
3. Client B erkennt Kollision (oder spaetestens beim Sync) und publiziert deterministisch `t=forum:dev-help-2`.
4. UI zeigt beide Unterforen getrennt an.

Events:
- `kind:11` Root A mit `["t","forum-root"]`, `["t","forum:dev-help"]`.
- `kind:11` Root B mit `["t","forum-root"]`, `["t","forum:dev-help-2"]`.

Aufloesung:
- Wenn trotzdem derselbe Slug doppelt auftaucht (Race auf unterschiedlichen Relays), wird fuer Primaranzeige der aelteste Root bevorzugt (`created_at`, dann `id`).

## Use Case 11 - Moderator blendet Beitrag aus (Soft-Delete)

Ziel: Ein Moderator entfernt einen problematischen Beitrag aus der Community-Ansicht.

Ablauf:
1. Moderator waehlt Zielbeitrag.
2. Client prueft Moderationsrecht gegen `d=Moderation` (optional zusaetzlich Badge-Check).
3. Moderator signiert Moderations-Label.
4. Clients filtern den Zielbeitrag aus Standardansicht.

Events:
- `kind:1985` auf Ziel-Event mit Moderations-Tags (app-Konvention), z. B.
  - `["e","<target-event-id>"]`
  - `["h","<community-pubkey>"]`
  - `["t","mod:hide"]`
  - optional Grund/Code als weiterer Tag

Hinweis:
- Das ist ein Soft-Delete. Ein globales physisches Loeschen auf allen Relays ist nicht garantiert.

## Use Case 12 - Moderator ordnet Beitrag anderem Unterforum zu

Ziel: Ein Thread liegt im falschen Unterforum und soll verschoben werden.

Ablauf:
1. Moderator waehlt Zielthread und neues `forum:<slug>`.
2. Client prueft Moderationsrecht.
3. Moderator signiert Move-Label.
4. UI zeigt den Thread kuenftig im neuen Unterforum (auf Basis des neuesten gueltigen Move-Labels).

Events:
- `kind:1985` auf Ziel-Event mit Tags (app-Konvention), z. B.
  - `["e","<target-event-id>"]`
  - `["h","<community-pubkey>"]`
  - `["t","mod:move"]`
  - `["t","forum:<new-slug>"]`

## Use Case 13 - Moderator entzieht einem User Schreibrechte

Ziel: Ein User soll nicht mehr posten duerfen.

Ablauf:
1. Moderator startet "remove user" Aktion in der Mod-UI.
2. `moderation_bot_key` validiert, dass der anfragende User in `d=Moderation` ist.
3. Bot publiziert neue `kind:30000` Liste fuer `d=General` ohne den User.
4. Clients blocken neue Posts dieses Users.

Events:
- Optionaler Moderations-Request (app-intern oder eigenes Event je nach Implementierung).
- Verbindlich: neues `kind:30000` fuer `d=General` (User entfernt).

## Use Case 14 - Nutzer reagiert mit Smilie

Ziel: Ein Nutzer reagiert auf einen Thread oder Kommentar mit einem Emoji.

Ablauf:
1. Client prueft Schreibrecht in `d=General`.
2. Nutzer waehlt Reaktion (z. B. `:smile:` oder `:heart:`).
3. Client erstellt `kind:7` auf das Ziel-Event.
4. Nutzer signiert via NIP-07 und publiziert.

Events:
- `kind:7` mit Tags
  - `["e","<target-event-id>"]`
  - `["h","<community-pubkey>"]`
  - `content` = Emoji/Reaktionscode

## Use Case 15 - Nutzer stimmt per Up/Down-Vote ab

Ziel: Ein Nutzer gibt Upvote oder Downvote auf einen Beitrag.

Ablauf:
1. Client prueft Schreibrecht in `d=General`.
2. Nutzer waehlt `+` oder `-`.
3. Client publiziert `kind:7` mit `content` `+` oder `-`.
4. Beim Zaehlen gilt pro `(target, user)` nur die neueste Vote-Reaktion.

Events:
- `kind:7` mit Tags
  - `["e","<target-event-id>"]`
  - `["h","<community-pubkey>"]`
  - `content` = `+` oder `-`

## Use Case 16 - Nutzer meldet Beitrag (Alert/Report)

Ziel: Ein Nutzer meldet problematischen Inhalt an Moderatoren.

Ablauf:
1. Client prueft Schreibrecht in `d=General`.
2. Nutzer waehlt Meldegrund (z. B. `spam`, `abuse`).
3. Client erstellt Report-Label.
4. Moderations-UI/Bot sammelt offene Reports und zeigt sie Moderatoren.

Events:
- `kind:1985` mit Tags
  - `["e","<target-event-id>"]`
  - `["h","<community-pubkey>"]`
  - `["t","mod:report"]` (oder `["t","alert"]`)
  - optional `["reason","<code>"]`

