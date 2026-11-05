# Konzept: Fortschrittsansicht für das Mapping des REN+-Netzes

Konzept vom 3. November 2026. Gebaut in der Nacht zum 5. November 2026 auf dem lokalen Branch `infravelo-apps` (nicht gepusht). Was gebaut ist und wie gerechnet wird, steht in `README.md`, `fortschritt/README.md` und `netzanpassungen/README.md`. Dieses Dokument hält die Gründe fest. Wo sich gegenüber dem Konzept etwas geändert hat, steht ein Hinweis **Umgesetzt**.

**Umgesetzt, Daten am 4. November 2026:** Das Netz wurde neu erzeugt (Upload 4. November, 9:29 Uhr). Es hat 12.043 Kanten und 1.996,4 km, `lfd_nr` sind jetzt fest vergeben (höchste 17.292). Alle 488 Markierungen treffen eine Kante, das sind 80,5 km. Der Bezirk steht als `08 - Neukölln` in den Daten. Die Zahlen in den Tabellen unten sind der Stand vom 3. November.

Kennzeichnung: **[geprüft]** heißt, ich habe es in Code, Doku oder mit einer echten Anfrage nachgesehen. **[Annahme]** heißt, es ist nicht geprüft.

## Kurzfassung

- **Wo:** Das Repo `knotenpunkte` wird in `infravelo-apps` umbenannt und privat. Darin liegen drei Apps: `knotenpunkte/`, `netzanpassungen/` und neu `fortschritt/`. Deploy über Netlify, weil GitHub Pages im Free-Plan keine privaten Repos kann (siehe „Umbenennen und privat machen“).
- **Daten:** Die Karte nimmt die vorhandenen PMTiles. Die Statistik nimmt das GeoJSON, das zu jedem statischen Datensatz ohnehin unter derselben Adresse mit `.geojson` liegt. Es gibt keinen zusätzlichen Upload und keine Änderung an der Pipeline. Der Fortschritt kommt beim Laden aus der key-value-db, wird in IndexedDB gehalten und höchstens einmal am Tag oder auf Klick neu geholt.
- **Einheit:** Kilometer, Kanten nur als Nebenzahl.
- **Lieferplan:** Lieferung 2 (6 Bezirke) bis 1. März 2027, Lieferung 3 (restliche 6) bis 1. August 2027 (Deadline Mapping). Das Projekt endet mit Lieferung 3.
- **Netz-Update später:** Es kommen noch Wege dazu, das ist aber erst in einigen Wochen klar. Die App baut nicht darauf auf. Sie liest das GeoJSON jedes Mal neu, das Ziel wächst dann einfach mit. Beim Update selbst muss `lfd_nr` bestehender Kanten erhalten bleiben (siehe unten).

## Ausgangslage (geprüft am 3. November 2026)

|                            | Wert                                                                                                                                                   | Quelle                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kanten im Kartierungs-Netz | 12.062                                                                                                                                                 | veröffentlichtes `infravelo-ren-netz-zuteilung-netz.geojson` **[geprüft]**                                                                                         |
| Netz-Kilometer             | 2.005,5 km                                                                                                                                             | ebenda **[geprüft]**                                                                                                                                               |
| Accounts                   | 5: `fmc_7`, `fmc_8`, `fmc_9`, `fmc_11`, `fmc_12`                                                                                                       | `accounts.txt` und veröffentlichte Daten **[geprüft]**. Die Aufgabe nannte 8 (`fmc_6` … `fmc_13`); `fmc_6`, `fmc_10` und `fmc_13` sind seit Commit `07f195b` raus. |
| Erledigt                   | 432 Kanten, 68,5 km (3,4 %)                                                                                                                            | key-value-db, Projekt `infravelo-tracker` **[geprüft]**                                                                                                            |
| Erste Markierung           | 28. Oktober 2026                                                                                                                                       | ebenda **[geprüft]**                                                                                                                                               |
| Wer markiert               | `updated_by.display_name` ist der Account (`fmc_9` 197, `fmc_7` 144, `fmc_11` 83, `fmc_8` 8). Alle 432 Kanten wurden vom zugeteilten Account markiert. | **[geprüft]**                                                                                                                                                      |

Kilometer je Bezirk und Lieferung (Bezirksreihenfolge nach Tobias):

| Lieferung | Bezirk                        |          km | Kanten | erledigt km |
| --------- | ----------------------------- | ----------: | -----: | ----------: |
| 2         | 1. Neukölln                   |       131,7 |    795 |        38,0 |
| 2         | 2. Treptow-Köpenick           |       286,2 |  1.424 |        30,6 |
| 2         | 3. Tempelhof-Schöneberg       |       160,3 |  1.015 |           0 |
| 2         | 4. Steglitz-Zehlendorf        |       227,1 |  1.427 |           0 |
| 2         | 5. Spandau                    |       170,8 |    888 |           0 |
| 2         | 6. Charlottenburg-Wilmersdorf |       154,8 |  1.021 |           0 |
| 3         | Friedrichshain-Kreuzberg      |        59,6 |    398 |           0 |
| 3         | Marzahn-Hellersdorf           |       180,1 |  1.246 |           0 |
| 3         | Lichtenberg                   |       118,3 |    717 |           0 |
| 3         | Pankow                        |       229,8 |  1.377 |           0 |
| 3         | Mitte                         |       128,7 |    843 |           0 |
| 3         | Reinickendorf                 |       158,1 |    911 |           0 |
|           | **Lieferung 2**               | **1.131,0** |        |        68,6 |
|           | **Gesamt**                    | **2.005,5** |        |        68,5 |

Was das für das Tempo heißt (ab 3. November 2026):

| Ziel                                       | Wochen | nötig je Woche | je Account (5) |
| ------------------------------------------ | -----: | -------------: | -------------: |
| Lieferung 2 bis 1. März 2027               |   16,9 |          63 km |        12,6 km |
| Lieferung 3 vom 1. März bis 1. August 2027 |   21,9 |          40 km |           8 km |

Bisher sind es etwa 53 km je Woche, gerechnet ab der Woche vom 26. Oktober und einschließlich Testphase. Für Lieferung 2 reicht das noch nicht ganz.

## 1. Wo bauen und deployen?

### Die Knotenpunkt-App heute **[geprüft]**

- Repo `FixMyBerlin/knotenpunkte` mit zwei Apps, die sich `shared/` teilen: `src/` (Knotenpunkte) und `netzanpassungen/`. Die „Netzvervollständigung“ ist nach meinem Verständnis `netzanpassungen/`: neue Kanten und virtuelle Knoten dort zeichnen, wo ein Radfernweg keine Kante hat. Im Repo kommt das Wort „Netzvervollständigung“ nicht vor.
- `shared/` enthält das UI-Kit (Catalyst-artig: `button`, `table`, `badge`, `sidebar` …), `AppHeader`, `StepNav`, `SidebarLayout`, `BaseMap` (Hintergründe, Favoriten, Straßennetz, Kamera in der URL), OSM-Login (`use-osm-auth`, `AuthButton`), einen eigenen KV-Client (`shared/kv-client`, mit `updatedSince`, `cursor`, `tags`), `kvQueryOptions` und `DataTablePage`.
- Stack: Vite, React 19, TanStack Router und Query, Zustand, react-map-gl mit MapLibre, `pmtiles`, Tailwind 4, `idb-keyval`, Zod, Bun, oxlint/oxfmt, Vitest, Playwright.
- Deploy: GitHub Pages (`.github/workflows/deploy-pages.yml`), Basis `/knotenpunkte/`, Netzanpassungen unter `/knotenpunkte/netzanpassungen/`. Der Mapping-Editor läuft dagegen auf Netlify (`radnetz-mapping.netlify.app`).

### Die drei Optionen

**(a) Unterordner in `infravelo-radnetz`, Deploy über Netlify.**
Technisch geht das. Netlify kann ein Base Directory setzen, und mit `ignore` in der `netlify.toml` baut es nur, wenn sich bestimmte Pfade ändern, z. B. `ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- fortschritt/ mapping-zuteilung/fortschritt-daten.json"`. Laut Netlify-Doku sind die Pfade relativ zum Base Directory, und der Befehl darf auch Pfade außerhalb davon vergleichen (im Monorepo-Beispiel `packages/blog-1 packages/common`) **[geprüft, Netlify-Doku „Ignore builds“]**. Ich nehme an, dass Netlify das ganze Repo auscheckt und der Build auch Dateien außerhalb des Base Directory lesen kann **[Annahme, die Doku sagt es nicht ausdrücklich]**. Ohne eigenes `ignore` vergleicht Netlify grob nur das Base Directory.
Das Hauptproblem: `mapping-zuteilung/output/` ist nicht versioniert. Die App bekäme ihre Daten nur, wenn das Skript zusätzlich eine Datei eincheckt. Dazu kommt ein zweiter JS-Stack in einem reinen Python-Repo, und `shared/` aus der Knotenpunkt-App müsste kopiert werden, weil es kein Paket ist.

**(b) Eigenes Repo.**
Sauber getrennt, aber `shared/` müsste ebenfalls kopiert werden. Das gäbe ein drittes Repo, das man bei Abhängigkeiten und Dependabot mitpflegen muss.

**(c) Dritte App im Repo `knotenpunkte`.** ← Empfehlung

- Das Muster gibt es dort schon: `netzanpassungen/` ist genau so eine zweite App mit eigenem `vite.config.ts` auf `shared/`. Eine dritte App `fortschritt/` übernimmt Karte, UI, Header, Login und KV-Client ohne Kopie.
- **Kein neuer Origin nötig:** Der Origin ist `https://fixmyberlin.github.io` für alle Pfade. Das Projekt `infravelo-tracker` lässt ihn schon zu **[geprüft, WORKDOC Feature 35, Stand 12. Oktober 2026]**. Für die lokale Entwicklung ist `http://127.0.0.1:*` freigegeben. Vor dem Bau einmal mit dem Admin-MCP nachsehen, ob es noch stimmt.
- Die Daten kommen von TILDA (CORS `*`, siehe unten). Darum gibt es keine Kopplung an Dateien in `infravelo-radnetz`, und das Netlify-Thema fällt weg.
- Nachteil: Der Repo-Name passt nicht mehr ganz, und jeder Push baut alle drei Apps. Das Bauen kostet bei GitHub Pages nichts, und das Repo ist faktisch schon die Sammlung der infraVelo-Apps.

### Umbenennen und privat machen (Idee Tobias, 3. November 2026)

Das Repo wird in **`infravelo-apps`** umbenannt (entschieden). Darin liegen drei gleichrangige Unter-Apps: `knotenpunkte/` (heute `src/`), `netzanpassungen/` und `fortschritt/`, alle auf `shared/`.

Die Netlify-Site heißt dagegen **`radnetz-apps`**, passend zum Editor `radnetz-mapping.netlify.app`. Die Regel: Repos heißen `infravelo-…`, Netlify-Sites `radnetz-…`.

Geprüft:

- `FixMyBerlin/knotenpunkte` ist heute **öffentlich**. Die Organisation hat den **Free-Plan**, Pages läuft über das Workflow **[geprüft mit `gh`]**.
- GitHub Pages aus einem **privaten** Repo gibt es erst ab GitHub Team. Im Free-Plan würde die Seite beim Umstellen auf privat abgeschaltet **[GitHub-Doku, nicht ausprobiert]**.
- Auch mit Team-Plan wäre die Pages-Seite öffentlich. Nur das Repo wäre privat. Das ist aber ohnehin der Fall: Die Seite und die Lesezugriffe auf die key-value-db sind öffentlich.

Daraus folgt:

- **Privat + Free-Plan:** Deploy über **Netlify** statt GitHub Pages. Netlify baut auch aus privaten Repos, und der Editor läuft dort schon. Eine Netlify-Site `radnetz-apps.netlify.app` mit den Pfaden `/knotenpunkte/`, `/netzanpassungen/` und `/fortschritt/`. Mit `ignore` baut sie nur bei Änderungen im Repo, das ist hier ohnehin immer der Fall.
- Bei einem neuen Origin muss man nachziehen: ihn in den KV-Projekten `knotenpunkte`, `netzanpassungen` und `infravelo-tracker` erlauben (Admin-MCP); die OSM-OAuth-Redirect-URIs `…/knotenpunkte/osm-oauth-land.html` und `…/netzanpassungen/osm-oauth-land.html` ergänzen; die Links in READMEs und bei den Mappern anpassen.
- Beim Umbenennen leitet GitHub Repo- und Git-URLs weiter, die Pages-Adresse `fixmyberlin.github.io/knotenpunkte/` aber nicht **[Annahme nach GitHub-Doku]**. Deshalb passt der Wechsel zu Netlify gut zum Umbenennen: Die Adressen ändern sich ohnehin nur einmal.
- Reihenfolge: siehe „Vorgehen“ im nächsten Abschnitt. Umbenannt wird erst ganz am Ende, sonst ist die alte App sofort weg.

### Browser-Speicher beim Umzug

localStorage und IndexedDB gehören zum **Origin** (Schema + Host + Port), nicht zum Pfad. Ein anderer Pfad auf demselben Origin ändert nichts. Der Wechsel von `https://fixmyberlin.github.io` zu `https://radnetz-apps.netlify.app` dagegen heißt: In der neuen Adresse ist der Speicher leer. Die alten Daten bleiben im Browser liegen, aber die neue Seite kann sie nicht lesen. Ein Iframe-Trick hilft nicht, weil Browser den Speicher in fremden Iframes heute getrennt halten.

Schon heute teilen sich Knotenpunkte und Netzanpassungen den Origin `fixmyberlin.github.io`, und das gilt auch für alle anderen GitHub-Pages-Seiten von FixMyBerlin. Die Schlüssel haben Präfixe, darum gibt es keine Überschneidungen. Auf Netlify bleibt das so; `fortschritt/` bekommt ein eigenes Präfix (`fp:`).

Was heute im Browser steht **[geprüft im Code von `knotenpunkte`, 3. November 2026]**:

| Schlüssel                                                      | Speicher                 | Inhalt                                                     | geht verloren?     | schlimm?                                                                          |
| -------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------- |
| `__osmAuth`, `__osmAuthTemp`                                   | localStorage (`osm-api`) | OSM-Login                                                  | ja                 | nein, neu anmelden                                                                |
| OSM-Rücksprung-URL (`osm-auth.ts`)                             | localStorage             | nur während des Logins                                     | ja                 | nein                                                                              |
| `knotenpunkte-private-rasters`                                 | localStorage             | private Hintergründe, die URLs enthalten oft API-Schlüssel | ja                 | **lästig**: jede Person muss sie neu eintragen; sie stehen bewusst nirgends sonst |
| `knotenpunkte-background`, `knotenpunkte-background-favorites` | localStorage             | gewählter Hintergrund, Favoriten (Tasten 1–9)              | ja                 | wenig                                                                             |
| `knotenpunkte-sidebar-width`                                   | localStorage             | Breite der Sidebar                                         | ja                 | nein                                                                              |
| `na:skipped-suggestions`                                       | localStorage             | Netzanpassungen: übersprungene Knotenvorschläge            | ja                 | wenig, ist ein persönliches „später“                                              |
| `na:no-action-suggestions`                                     | localStorage             | Netzanpassungen: Vorschläge mit „Keine Aktion nötig“       | ja                 | **ja**: Das ist Arbeitsergebnis und liegt nur in einem Browser                    |
| `kp:nodes:<gebiet>`, `kp:suggestions:<gebiet>`                 | IndexedDB                | importierte Knoten und Vorschläge der Knotenpunkte         | ja                 | lästig: neu importieren, die Bewertungen selbst liegen in der KV-db               |
| `na:data:<gebiet>`                                             | IndexedDB                | importierte Netzanpassungen-Datei (rund 25 MB für Berlin)  | ja                 | lästig: neu importieren                                                           |
| `na:entries:<gebiet>`                                          | IndexedDB                | nur im Testmodus ohne KV-Schlüssel                         | in Produktion leer | nein                                                                              |

Bewertungen, Netzanpassungen und Erledigt-Markierungen liegen alle in der key-value-db. Daran ändert der Umzug nichts, solange der neue Origin dort erlaubt ist.

Vorgehen (Tobias, 3. November 2026):

Nur ein Datensatz muss übertragen werden: `na:no-action-suggestions`. Alles andere ist neu einzurichten (Login, Hintergründe, Favoriten) oder neu zu importieren (Knoten, Netzanpassungen-Datei). Die privaten Hintergründe sind das einzige Geheime. Sie werden bewusst nicht übertragen und gehören auch nicht in die key-value-db.

1. **„Keine Aktion nötig“ in die key-value-db**, noch in der alten App auf `fixmyberlin.github.io`:
   - Die Netzanpassungen lesen und schreiben „Keine Aktion nötig“ künftig in der key-value-db, z. B. als Eintrag `{gebiet}:vorschlag:{id}` im Projekt `netzanpassungen`. Dann sieht das ganze Team die Entscheidungen.
   - Beim Öffnen schreibt die App die lokalen Einträge einmalig in die key-value-db (`batch`, höchstens 25 auf einmal) und löscht sie erst danach aus dem localStorage, wenn das Schreiben geklappt hat.
   - Schreiben braucht den OSM-Login. Ohne Login bleibt der lokale Stand liegen, bis sich die Person anmeldet; die App weist darauf hin.
   - Hat jemand anders denselben Vorschlag schon so markiert, ist das kein Konflikt, der Eintrag bleibt einfach bestehen.
   - Wer schon übertragen hat, sieht man an `created_by` der Einträge. Wer noch nicht, sieht man nicht. Darum alle, die mit den Netzanpassungen gearbeitet haben, bitten, die alte App einmal angemeldet zu öffnen.
2. **Backup per Konsole** für alle, die ihre Einstellungen behalten wollen (siehe unten). Die Datei bleibt auf dem eigenen Rechner.
3. **Neue App bauen**: Repo `infravelo-apps` als Netlify-Site `radnetz-apps`, neuer Origin in den KV-Projekten erlaubt, OSM-Redirect-URIs ergänzt. Die alte App läuft so lange parallel weiter. Weil alle Arbeitsdaten in der key-value-db liegen, ist es egal, in welcher App jemand arbeitet.
   - Vor dem Umbau das Pages-Workflow abschalten (`deploy-pages.yml` entfernen oder in den Actions deaktivieren). GitHub Pages zeigt dann weiter die letzte Version an **[Annahme nach GitHub-Verhalten, vorher kurz prüfen]**. Sonst würde der Umbau auf `main` die alte Adresse mit dem neuen Stand überschreiben.
   - Das Repo erst im letzten Schritt umbenennen. Ein Umbenennen verschiebt die Pages-Seite sofort nach `fixmyberlin.github.io/infravelo-apps/`, wo die alte App mit ihrem festen Basispfad `/knotenpunkte/` nicht mehr läuft.
   - Netlify verbindet sich mit dem Repo unter dem alten Namen. Nach dem Umbenennen und Privatmachen prüfen, ob Netlify noch baut **[Annahme: die Netlify-GitHub-App folgt dem Umbenennen]**.
4. **Alte App löschen**: GitHub Pages abschalten, das Repo umbenennen und privat machen, `https://fixmyberlin.github.io` aus den Origins der KV-Projekte nehmen. Ausnahme: Der Mapping-Editor braucht ihn eventuell weiter für `infravelo-tracker`. Alte Links auf `fixmyberlin.github.io/knotenpunkte/` gehen dann ins Leere; das nehmen wir in Kauf.

**Umgesetzt (Tobias, 4. November 2026):** Vor dem Push führen alle das Konsolen-Skript aus und behalten die Datei. Die Netzanpassungen speichern „Keine Aktion nötig“ jetzt in der key-value-db (`{gebiet}:keine-aktion:{id}`, Tags `[gebiet, keine-aktion]`). Beim Start überträgt die App eine noch vorhandene lokale Liste nach dem Login und löscht sie erst danach. Im Schritt Gebiet gibt es **Sicherung einspielen** für die Backup-Datei. Damit werden „Keine Aktion nötig“ in die key-value-db übertragen und die übrigen Einstellungen in den localStorage der neuen Adresse geschrieben, wenn sie dort noch fehlen. Ein Schreiben in die echte key-value-db ist noch nicht ausprobiert.

Konsolen-Skript für das Backup, auszuführen auf `https://fixmyberlin.github.io/knotenpunkte/` (Entwicklerwerkzeuge → Konsole). Es nimmt alle Einstellungen der beiden Apps mit, aber nicht den OSM-Login:

```js
;(() => {
  const keep = (key) => key.startsWith('knotenpunkte-') || key.startsWith('na:')
  const data = Object.fromEntries(
    Object.keys(localStorage)
      .filter(keep)
      .map((key) => [key, localStorage.getItem(key)]),
  )
  const file = new Blob(
    [
      JSON.stringify(
        { origin: location.origin, exported_at: new Date().toISOString(), localStorage: data },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  )
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(file),
    download: 'knotenpunkte-einstellungen.json',
  })
  link.click()
  console.log('Exportiert:', Object.keys(data))
})()
```

Die Datei enthält die privaten Hintergründe mit ihren Schlüsseln. Sie gehört nicht in Chats oder Tickets. Für den Rückweg in der neuen App reicht das Gegenstück in der Konsole: `Object.entries(backup.localStorage).forEach(([k, v]) => localStorage.setItem(k, v))` mit dem Inhalt der Datei als `backup`, danach die Seite neu laden.

**Allgemeine „Fortschrittsansicht“?** Erst einmal nicht. Ich würde den Kern nur so schneiden, dass er wiederverwendbar ist: KV-Projekt, GeoJSON, PMTiles und Lieferplan stehen in einer Konfigurationsdatei. Daraus etwas Generisches zu machen, lohnt sich erst beim zweiten echten Anwendungsfall.

**Projekt `infravelo-track-tracker` (track-Radwege):** nicht in die erste Version. Die Daten haben keine Länge und keinen Account im gleichen Schema, und es gibt keinen Lieferplan dafür. Die Konfigurationsdatei lässt Platz für einen zweiten Tracker; später wäre das ein Reiter „track-Trennung“ mit einfacher Zahl und Karte, ohne Soll.

## 2. Daten

### Karte: PMTiles direkt **[geprüft]**

- Beide Dateien sind ohne Login abrufbar, `access-control-allow-origin: *`, Range-Anfragen ergeben `206`. Aus einem Browser auf fremdem Origin (`example.com`) lieferte `fetch` mit `Range` `206` mit 16 KB. Die Preflight-Antwort hat keine CORS-Header, wird aber nicht gebraucht, weil ein einfacher `Range`-Header keinen Preflight auslöst.
- Größen: Netz 6,2 MB, Gebiete 0,8 MB; `cache-control: max-age=3600`.
- Erledigte Kanten färbt die Karte über `feature-state` mit `promoteId: 'lfd_nr'`, nicht über einen Filter mit tausenden ids (Skill `react-map-gl`). Die Gebiete werden je Account eingefärbt, beim Hover zeigen sie Account, Bezirk und Prozent.

### Statistik: das vorhandene GeoJSON

PMTiles taugen nicht für Summen. Die statischen Datensätze liegen in TILDA aber immer auch als GeoJSON vor. Die App nimmt deshalb `https://tilda-geo.de/api/uploads/infravelo-ren-netz-zuteilung-netz.geojson`:

- Ohne Login abrufbar, CORS `*`, alle 12.062 Kanten mit `lfd_nr`, `laenge_m`, `bezirk`, `account` **[geprüft]**.
- 17,5 MB, aber mit Brotli komprimiert ausgeliefert (`content-encoding: br`). Übertragen werden 0,7 MB **[geprüft]**.
- Die App liest die Datei einmal, behält nur `lfd_nr`, `laenge_m`, `bezirk`, `account` und legt das in IndexedDB ab. Sie lädt neu, wenn sich die Datei geändert hat oder der Cache älter als einen Tag ist. **Umgesetzt:** TILDA gibt den `ETag` an fremde Origins nicht heraus. Darum vergleicht ein `HEAD`-Request `Last-Modified`, ersatzweise `Content-Length`.
- Die Lieferung eines Bezirks steht im Lieferplan der App (siehe Konfiguration). Dafür braucht es kein neues Feld in den Daten.

Ein zusätzlicher Upload nach TILDA ist damit nicht nötig. Das ist auch besser so, weil der Kunde dort alles sieht.

### `reihenfolge`

Das Feld `reihenfolge` zählt gegen den Uhrzeigersinn ab Neukölln: 1 Neukölln, 2 Treptow-Köpenick, 3 Friedrichshain-Kreuzberg, … 12 Tempelhof-Schöneberg **[geprüft]**. Tobias' Reihenfolge ist eine andere. Die Gebiete selbst hängen davon nicht ab: Sie werden je Bezirk gebildet und je Bezirk von West nach Ost den Accounts zugeordnet (`assign_accounts.py`, Kommentar Zeile 272). `reihenfolge` ist nur eine Nummer **[geprüft durch Lesen des Codes, nicht durch einen Neulauf]**.
Die App braucht `reihenfolge` nicht, sie sortiert nach dem Lieferplan. Damit die Nummer in TILDA nicht verwirrt, könnte `assign_accounts.py` die Zählung gegen den Uhrzeigersinn durch Tobias' Reihenfolge ersetzen. Das ist optional und kann beim nächsten Netz-Update mitlaufen.

### Risiko: `lfd_nr` ist nicht stabil **[geprüft]**

**Umgesetzt:** Tobias hat die Erzeugung in `infravelo-radnetz` umgebaut, die `lfd_nr` sind jetzt fest vergeben. Der Abschnitt bleibt als Begründung stehen.

`ren-network/unify_networks.py:466` vergibt `lfd_nr = 1 … n` nach der Reihenfolge der Zeilen. Ich habe den alten lokalen Stand (14. Oktober, 12.043 Kanten) mit dem veröffentlichten (26. Oktober, 12.062 Kanten) verglichen: 9.385 `lfd_nr` stehen in beiden, aber nur bei 1.319 davon ist es dieselbe Kante (`element_nr` gleich). Wird das Netz neu gerechnet, zeigen die Einträge der key-value-db (id = `lfd_nr`) danach auf andere Kanten.
`assign_accounts.py` allein ändert `lfd_nr` nicht, solange `ren_netz_gesamt.gpkg` gleich bleibt. Ein neuer Lauf ändert also nur `account`, und das ist für die App unkritisch, weil sie die Zuteilung jedes Mal frisch liest.

Stand der Klärung (Tobias, 3. November 2026): Es wird ein Netz-Update geben, bei dem Wege dazukommen und in die Lieferungen eingeflochten werden. Wann, ist erst in einigen Wochen klar. Für die App heißt das:

- Sie rechnet immer mit dem aktuellen GeoJSON. Kommen Kanten dazu, steigt im Burn-up die Ziellinie, und das Soll je Account erhöht sich ab dann. Das ist ein Grund für Burn-up statt Burn-down.
- Erledigte ids, die im GeoJSON fehlen, zeigt die App als Hinweis an („n Markierungen ohne Kante“), so wie `load_status.py` sie heute ins Log schreibt.

Für das Update selbst (Aufgabe in diesem Repo, nicht in der App): Bestehende Kanten müssen ihre `lfd_nr` behalten und neue Kanten neue Nummern hinter der höchsten bekommen. Sonst muss das Update die Erledigt-Markierungen auf die neuen ids übertragen (über die Geometrie oder `element_nr`) und in die key-value-db zurückschreiben.

## 3. Fortschritt aus der key-value-db

### API **[geprüft, `key-value-db/docs/API.md` und echte Abfrage]**

- `GET /v1/projects/infravelo-tracker/entries?limit=500&cursor=…` mit `X-Api-Key` und einem erlaubten `Origin`. Von einem anderen Origin scheitert `fetch` **[geprüft von `example.com`]**.
- Ein Eintrag hat `id` (= `lfd_nr` als String), `data: { done: true }`, `tags` (z14-Kacheln, meist eine), `version`, **`created_at`**, `updated_at`, `created_by`, `updated_by`.
- `updated_since` gibt es. Gelöschte Einträge gibt es nicht als Löschmarke (keine Tombstones); „nicht erledigt“ löscht den Eintrag einfach.
- `GET /tags` liefert die Zahl der Einträge je Kachel.
- Kosten: Der gesamte Stand sind heute 1 Anfrage; bei 12.062 erledigten Kanten wären es 25 Anfragen und 12.062 gelesene Zeilen. Das Cloudflare-Free-Tier erlaubt 100.000 Anfragen und 5 Mio. gelesene Zeilen am Tag. Das ist unkritisch.

### Laden und Cache

Empfehlung: **immer den vollen Stand laden, aber höchstens einmal am Tag**. Inkrementelles Laden ist bei dieser Datenmenge nicht nötig.

1. Beim Öffnen liest die App den Cache aus IndexedDB (`idb-keyval`, ist schon eine Abhängigkeit): `{ geladen_am, entries: { lfd_nr → { created_at, updated_at, von } } }`.
2. Ist der Cache jünger als 24 Stunden, zeigt die App ihn sofort an, mit „Stand: …“ und dem Knopf **Neu laden**.
3. Sonst oder auf Klick: alle Seiten holen und den Cache ersetzen. Löschungen sind damit von selbst erledigt.

Falls es doch inkrementell sein soll (z. B. bei vielen Nutzern oder deutlich mehr Daten): erst `updated_since = letzter Abruf − 5 min` für neue und geänderte Einträge, dann `/tags` mit der Zahl je Kachel aus dem Cache vergleichen und nur die Kacheln mit Abweichung per `tag=…&match=any` neu laden. Ids, die dort fehlen, sind gelöscht. So macht es auch der Editor (`modules/progress/tracker.ts`, „marks someone else removed“). Das ist mehr Code für wenig Gewinn, darum nicht in der ersten Version.

Die PMTiles cacht der Browser selbst. Die gekürzten Kanten aus dem GeoJSON kommen mit in IndexedDB, damit die Seite ohne Netz die letzten Zahlen zeigt.

### Datum einer Erledigung

- Die App rechnet mit **`created_at`**, nicht `updated_at`.
- Der Editor speichert eine schon erledigte Kante nicht noch einmal (`setDone` gibt dann `already` zurück) **[geprüft, `tracker.ts`]**. „Erneut erledigt speichern“ verschiebt das Datum also nicht. Heute gilt für alle 432 Einträge `version = 1` und `created_at = updated_at` **[geprüft]**.
- Was bleibt: Wird eine Kante entmarkiert und wieder markiert, ist das ein neuer Eintrag mit neuem Datum. Das gilt auch für `created_at`.
- Hinweis in der App (Info-Box an der Analyseansicht):

  > Das Datum einer Kante ist der Zeitpunkt, an dem sie im Editor als erledigt markiert wurde, nicht der Zeitpunkt der Änderung in OSM. Wird eine Markierung zurückgenommen und neu gesetzt, zählt das neue Datum. Frühere Wochen können sich dadurch nachträglich leicht verschieben.

## 4. Ansichten

Aufbau wie die Knotenpunkt-App: `AppHeader`, links eine Sidebar (`SidebarLayout`), rechts die Karte (`BaseMap`). Drei Schritte in der `StepNav`:

### Karte

- Gebiete je Account (Farbe), Kanten rot oder grün wie im Editor.
- Filter in der Sidebar: Lieferung, Bezirk, Account. Die Auswahl steht in der URL (Skill `tanstack-router-conventions`).
- Klick auf ein Gebiet: km gesamt und erledigt, Prozent, Link „Im Editor öffnen“ (vorhandenes `editor_markdown` des Gebiets).

### Überblick

- Kopfzeile mit Stat-Kacheln: gesamt km erledigt und Prozent; Lieferung 2 Prozent und „im Plan / x km hinterher“; Wochen bis zur Deadline.
- **Bezirke:** Tabelle in Tobias' Reihenfolge, mit Badge „Lieferung 2/3“, Balken in Prozent, km erledigt/gesamt, Kanten erledigt/gesamt.
- **Burn-up**, eins für das Gesamtprojekt und eins je Lieferung (Umschalter):
  - x: Wochen ab der Woche der ersten Markierung (Montag, 26. Oktober 2026), bis zur Deadline.
  - y: km erledigt, kumuliert; dazu eine waagerechte Linie für das Ziel (km der Lieferung).
  - Solllinie: gerade vom Start bis zum Ziel an der Deadline.
  - Prognose: Tempo der letzten 4 Wochen fortgeschrieben, mit dem Datum, an dem das Ziel erreicht wäre.
  - „Fortschrittsbasiert“ heißt hier, dass wahlweise die y-Achse in Prozent statt in km steht. Damit lassen sich Lieferungen unterschiedlicher Größe vergleichen.
- **Burn-up statt Burn-down:** Ein Burn-up zeigt, ob sich das Ziel ändert (z. B. wenn Kanten dazukommen). Ein Burn-down versteckt das.

### Personen (für die Wochengespräche)

Je Account eine Zeile:

| Account | Rest in Lieferung 2 | nötig je Woche | Ø letzte 2 Wochen | Stand      |
| ------- | ------------------- | -------------- | ----------------- | ---------- |
| fmc_9   | 210 km              | 12,4 km        | 18,0 km           | 🟢 im Plan |

(Beispielzahlen.)

- **Nötig je Woche** = Rest km des Accounts in der aktuellen Lieferung ÷ verbleibende Wochen bis zur Deadline Mapping. Das wird jede Woche neu gerechnet, damit ein Rückstand sich auf die übrigen Wochen verteilt.
- **Stand:** 🟢 ab 100 % des Solls, 🟡 80–100 %, 🔴 unter 80 %, gemessen am Durchschnitt der letzten 2 Wochen. Die Grenzen stehen in der Konfiguration.
- Gezählt wird nach dem **zugeteilten** Account der Kante (`account`), nicht nach `updated_by`. Eine zweite Spalte zeigt, wie viel ein Account in fremden Gebieten markiert hat (heute 0).
- Darunter ein kleines Säulendiagramm km je Woche je Account, mit der Solllinie.
- Knopf **Für Gespräch kopieren**: eine Textzusammenfassung je Account für Notizen.

**Einheit:** km. Die Kanten sind sehr unterschiedlich lang (Median 124 m, 95 % unter 402 m, längste 6,4 km **[geprüft]**), die Zuteilung gleicht nach km aus, und die Lieferungen sind Bezirke, also Strecke. Eine Woche mit vielen kurzen Kanten sähe in Kanten zu gut aus. Kanten stehen in den Tabellen als zweite Zahl.

### Lieferplan als Konfiguration

```ts
export const plan = {
  start: 'erste Markierung', // Montag dieser Woche
  lieferungen: [
    {
      nr: 2,
      deadlineMapping: '2027-03-01',
      abgabe: '2027-04-01',
      bezirke: [
        'Neukölln',
        'Treptow-Köpenick',
        'Tempelhof-Schöneberg',
        'Steglitz-Zehlendorf',
        'Spandau',
        'Charlottenburg-Wilmersdorf',
      ],
    },
    {
      nr: 3,
      deadlineMapping: '2027-08-01',
      abgabe: '2027-09-01',
      bezirke: [
        'Friedrichshain-Kreuzberg',
        'Marzahn-Hellersdorf',
        'Lichtenberg',
        'Pankow',
        'Mitte',
        'Reinickendorf',
      ],
    },
  ],
}
```

Lieferung 1 (RVN, andere) taucht nicht auf. Das Gesamtprojekt reicht bis zur `deadlineMapping` von Lieferung 3. Seine Solllinie hat einen Knick am 1. März 2027: bis dahin das Ziel von Lieferung 2, danach bis zum 1. August 2027 der Rest.
Das Soll eines Accounts gilt immer für die laufende Lieferung. Bis 1. März zählen nur die Kanten in Lieferung 2. Was ein Account vorher schon in Lieferung 3 markiert, steht als eigene Zahl daneben und zählt ab März für Lieferung 3.

## 5. Zugang

Tobias' Antwort: Die Namen sind die Accounts `fmc_7` … `fmc_12`, die auch die Zuteilung verwendet. Personenbezogen ist dann nur noch, wer hinter einem Account steckt. Vorschlag:

- **Lesen ohne Login.** Die key-value-db ist ohnehin öffentlich lesbar, und die App schreibt nicht. Ein Login würde nichts schützen, das nicht schon offen liegt.
- Keine echten Namen in der App oder in Commits. Die Zuordnung Account → Person bleibt außerhalb.
- Mit `noindex` ausliefern und nicht von anderen Seiten verlinken.
- Den OSM-Login erst einbauen, wenn die App etwas schreibt (z. B. Notizen zu Wochengesprächen). Dann wäre auch `read_access = osm_user` für `infravelo-tracker` denkbar. Das würde aber den Editor und `load_status.py` treffen.

## 6. Arbeitsschritte (wenn freigegeben)

1. Mit dem key-value-db-Admin-MCP prüfen, ob `https://fixmyberlin.github.io` in `infravelo-tracker` erlaubt ist.
2. In `knotenpunkte`: `fortschritt/` nach dem Muster von `netzanpassungen/` (eigenes `vite.config.ts`, `dev-fortschritt`, `build` ergänzen), Karte, Cache, Überblick, Personen.
3. Tests: Vitest für die Rechnungen (Wochen, Soll, Ampel) mit festen Daten; ein Playwright-Smoke-Test mit nachgestellten KV-Antworten.

## Offene Fragen

Im Chat an Tobias gestellt, hier zur Übersicht:

1. ~~Projektende~~ geklärt: Es gilt die Tabelle, also Lieferung 2 bis 1. März 2027 und Lieferung 3 bis 1. August 2027.
2. ~~Netz-Update~~ geklärt: Es kommt später und ändert dann nur die Datengrundlage. Beim Update muss `lfd_nr` erhalten bleiben.
3. ~~Zwischenziele je Bezirk~~ entschieden (4. November): einfaches Modell, keine Zwischenziele.
4. ~~Anzahl Accounts~~ entschieden: Die App nimmt die Accounts aus den Daten.
5. Lesen ohne Login: so gebaut, nicht ausdrücklich bestätigt.
6. ~~Urlaub und Ausfälle~~ entschieden: fließen nicht ein.
