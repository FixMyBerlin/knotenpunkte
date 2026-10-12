# Änderungen vom 12.10.2026

## Bewerten: Tastatur

- Ein Attribut ist immer aktiv (blau umrandet). Jeder Knoten beginnt beim obersten.
- **Q / W / E** wählen die erste, zweite und dritte Antwort des aktiven Attributs. Danach springt die Auswahl automatisch zum nächsten Attribut.
- **Tab** und **Umschalt+Tab** wechseln ohne Antwort zum nächsten oder vorherigen Attribut.
- Die alten Kürzel pro Attribut (A/S, 1–9, R/T, D/F/G) gibt es nicht mehr.

## Bewerten: Knoten wechseln und abschließen

- Vor und Zurück stehen jetzt oben neben der Knoten-ID (Tasten **J** und **K**).
- Unten gibt es drei Buttons, jeweils mit Tastenkürzel im Button:
  - **Speichern** (Enter): speichert und geht zum nächsten Knoten.
  - **Nicht relevant** (X): der Knoten wird nicht betrachtet. HVS und LSA werden auf Nein gesetzt, der Knoten gilt als bewertet.
  - **Zurückstellen** (Z): später bewerten. Dafür ist ein interner Hinweis nötig. Fehlt er, springt der Cursor in das Feld und es wird markiert. Der Knoten bleibt offen.
- Über dem internen Hinweis steht der Schnell-Button **Fehlendes Fotomaterial**. Er füllt den Hinweis aus; danach noch einmal **Zurückstellen** drücken.

## Bewerten: Hinweise, Quelle, Fotos

- „Weitere Angaben“ zum Ausklappen gibt es nicht mehr. Alles steht immer unter den Attributen. Das Verschieben der ganzen Anwendung beim Ausklappen ist damit weg.
- Zwei Hinweisfelder: **Hinweis an den Kunden** und **Hinweis intern**.
- Neues Feld **Quelle** mit den Haken Mapillary und infra3D. Mapillary wird gesetzt, sobald ein Foto zugeordnet wird; infra3D, sobald der infra3D-Button geklickt wird. Beide Haken lassen sich wieder entfernen.
- Mapillary-Fotos zuordnen: Über dem Foto im Viewer steht ein Pipetten-Button. Ein Klick ordnet das gezeigte Foto dem Knoten zu. Zugeordnete Fotos stehen daneben als Buttons („Foto 1“, „Foto 2“ …): Klick zeigt das Foto, das × entfernt die Zuordnung. Mehrere Fotos sind möglich; gespeichert werden sie mit Semikolon getrennt.
- Die von Mapillary erkannten Objekte (Ampeln, Markierungen) sind entfernt: die Zählung über dem Formular, die Punkte auf der Karte und die Umrisse im Foto.

## Karte: Mapillary

- Oben rechts: **An/Aus** schaltet die Fotos, der Pfeil klappt die Einstellungen aus.
- Einstellungen wie in TILDA: Farbe nach Alter oder Fototyp, Filter auf 360°-Fotos oder klassische Fotos, Datums-Schieberegler mit Markierung am Stichtag 01.01.2024.
- Standard: Fotos ab dem 01.01.2024. Filter gelten auch für die vorgeschlagenen Blickrichtungen. Nach dem Neuladen gilt wieder der Standard.
- Die Foto-Linien sind jetzt kräftig und gut erkennbar.

## Karte: Luftbilder

- In der Hintergrund-Liste hat jeder Eintrag einen Stern. Mit Stern markierte Luftbilder erscheinen als Buttons direkt auf der Karte, mit Kurznamen (das Jahr) und Tastenkürzel.
- Tasten **1** bis **9** wechseln zwischen den Favoriten, in der Reihenfolge der Buttons. (Y/X/C/V ging nicht, weil X schon „Nicht relevant“ ist.)
- Die Favoriten werden in diesem Browser gespeichert.

## Export

- Die drei Exporte stehen in getrennten Gruppen mit Erklärung: Ergebnis für GIS (GeoJSON), Bewertungen dieses Gebiets (JSON), Bewertungen aller Gebiete (JSON).
- Alle Exporte enthalten beide Hinweise, die Quelle und die zugeordneten Fotos.
- Neue Spalten: `Kommentar_intern` und `Quelle`. `Kommentar` ist der Hinweis an den Kunden, `Mapillary-ID` kann mehrere IDs enthalten.

## Datenbank-Ansicht

- Der Datenbank-Button oben rechts zeigt immer das gerade gewählte Projekt. Die Gebietsauswahl auf der Seite ist entfernt.
- Derselbe Button führt zurück zur Bewertung. Projekt, Knoten und Kartenausschnitt bleiben erhalten.
- Ein Klick auf eine Zeile wählt den Knoten aus; nach dem Zurückwechseln ist er in der Bewertung geöffnet.
