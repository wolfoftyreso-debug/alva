# Guidad Felsökning (Geführte Fehlersuche) — vollständige Systembeschreibung

> **Deutsche Übersetzung.** Maßgeblich ist [SYSTEM-DESCRIPTION.md](SYSTEM-DESCRIPTION.md) (Englisch).
> Bei Widersprüchen gilt das englische Dokument.
>
> **Bezeichner im Code werden nicht übersetzt.** Ereignistypen, Funktions- und
> Feldnamen, Dateipfade und Konfigurationsschlüssel sind *im Code selbst*
> schwedisch. Eine Übersetzung würde dieses Dokument gegenüber dem Repository
> unbrauchbar machen; sie stehen daher wörtlich, mit deutscher Erläuterung, wo
> die Bedeutung nicht offensichtlich ist.
>
> Ein eigenständiges Referenzdokument. Alles Folgende stammt aus dem Code in
> `felsokning/` (Branch `claude/guidad-felsokning-vision-1mnx7f`), nicht aus
> Plänen oder Absichten. Wo etwas **nicht** existiert, wird das ausdrücklich
> gesagt.
>
> Zuletzt mit dem Code abgeglichen: Commit `1bb4031`, 04.08.2026.

---

## 0. Zusammenfassung in dreißig Sekunden

Guidad Felsökning ist eine SaaS-Plattform für **Kfz-Werkstätten**. Sie führt
eine Technikerin oder einen Techniker durch eine strukturierte Fehlersuche,
verlangt für jede Aussage einen Nachweis und erzeugt eine nachvollziehbare
Dokumentation, die mit der Kundschaft, einer Versicherung oder der nächsten
Schicht geteilt werden kann.

Der tragende Gedanke ist negativ, nicht positiv formuliert: **Das System stellt
eine Hypothese niemals als festgestellten Fehler dar.** Das ist keine Richtlinie
in einem Dokument — es ist codiert, getestet, und es blockiert Abläufe. Fehlt
der Nachweis, steht dort „Evidens saknas" (Nachweis fehlt), nicht eine
qualifizierte Vermutung.

Technisch: ein **ausschließlich anfügendes Ereignisprotokoll** (append-only) ist
die einzige Wahrheitsquelle. Alles andere — die Fallansicht, das Briefing, der
Kundenbericht, das Qualitätstor, die Statistik — ist eine reine Projektion des
Protokolls und lässt sich jederzeit neu erzeugen.

| | |
|---|---|
| Client | React 18 + TypeScript + Vite + Tailwind + zustand + react-router |
| Backend | Zwei Node-Dienste (`plattform`, `ai-orkester`), reines `node:http`, minimale Abhängigkeiten |
| Datenbank | PostgreSQL (Aurora Serverless v2), append-only durch Datenbank-Trigger erzwungen |
| Modell | Claude, serverseitiges Routing pro Aufgabe |
| Infrastruktur | AWS + EKS, 126 Terraform-Ressourcen in zwei Schichten |
| Git & CI | **Selbst gehostetes Gitea + Actions-Runner auf eigenem EKS** — kein GitHub im Betriebspfad |
| Tests | 120 vitest-Tests + Integrationstest gegen echtes Postgres |
| Sprache im Code | Schwedisch (Bezeichner, Kommentare, Commit-Nachrichten) |

---

## 1. Produktprinzipien

Diese fünf sind Invarianten, keine Empfehlungen. Jedes hat eine Entsprechung im
Code und in einem Test.

### 1.1 Keine Hypothese wird als festgestellter Fehler dargestellt

Hypothesen sind ein eigener Ereignistyp (`hypotes`) mit verpflichtender
Zuverlässigkeitsstufe und können **niemals** die Stufe `hog` (hoch) annehmen —
`niva: Exclude<Tillforlitlighet, "hog">`; das Typsystem verbietet es. Im
Kundenbericht sind sie ausdrücklich als nicht verifiziert gekennzeichnet. Das
Qualitätstor hat dafür eine eigene Zeile.

Die Formulierung bei fehlgeschlagener Reproduktion lautet *„kunde inte
reproduceras under de förhållanden som rådde"* („konnte unter den herrschenden
Bedingungen nicht reproduziert werden") — niemals „Fehler festgestellt" oder
„kein Fehler gefunden". Das ist sowohl in den Projektionen als auch im
Basis-Prompt des Orchesters codiert.

### 1.2 Ein Häkchen ist kein Nachweis

Jeder Prüfpunkt jeder Methodik trägt eine **Mindestanforderung**: `matvarde`
(Messwert) | `kommentar` (Beobachtung) | `foto` (Foto). Eine Messung kann ohne
Wert nicht als erledigt markiert werden; eine Fotoprüfung nicht ohne Bild. Will
die Technikerin etwas überspringen, ist eine **dokumentierte Ausnahme** mit
einem Grund aus einer festen Liste erforderlich.

Festgeschrieben durch den Test *„varje kontroll kräver bevis — en kryssruta är
inte evidens"*.

### 1.3 Das Protokoll ist append-only, bis ganz nach unten

Es gibt keine Update- oder Delete-Operationen in der API, und die Datenbank hat
Trigger, die sie auch dann abweisen, wenn jemand die Anwendung umgeht. Ein Test
sucht im Servercode aktiv nach `update`/`delete` gegen die Ereignistabelle und
schlägt fehl, wenn sie auftauchen.

Folge: Eine falsche Angabe wird *durch ein neues Ereignis korrigiert*, niemals
dadurch, dass die alte verschwindet. Die Historie ist das, was der Dokumentation
im Streitfall ihren Wert gibt.

### 1.4 Terminologie

In der Oberfläche und in der Kundenkommunikation heißt es **das System, die
Analyse, die Bewertung, die Entscheidungsunterstützung** — nicht „KI", sofern
nicht technisch nötig. Das Produkt wird als *evidenzbasiertes Diagnosesystem* /
*intelligente Entscheidungsunterstützung* beschrieben.

Der Grund ist kommerziell und erkenntnistheoretisch zugleich: Wer als
Werkstattkunde „KI" hört, hört „Vermutung". Wer als Sachbearbeiterin einer
Versicherung „KI-Bewertung" in einer Dokumentation liest, gewichtet sie
niedriger.

### 1.5 Die Freigabegrenze ist eine Positivliste

Was die Organisation verlassen darf, wird **positiv** aufgezählt, je Stufe. Ein
neuer Ereignistyp ist damit intern, bis ihn jemand aktiv freigibt. Ein Test
verlangt, dass jeder Typ des Domänenmodells eingestuft ist — wird einer
vergessen, schlägt der Build fehl, statt dass er nach außen gelangt.

---

## 2. Das Domänenmodell — das Ereignisprotokoll

`app/src/felsokning/domain.ts` (281 Zeilen).

Ein Fall besteht aus: Identität + Metadaten + einer **geordneten Liste von
Protokolleinträgen**. Jeder Eintrag trägt `id`, `tidpunkt` (Zeitpunkt),
`tekniker` (Techniker) und ein `handelse` (Ereignis).

### 2.1 Sämtliche Ereignistypen

| Typ | Inhalt | Rolle |
|---|---|---|
| `objekt_identifierat` | `objekt` (Kennzeichen/FIN, Marke, Modell, Motor …) | Worum es geht |
| `arbetsorder_skannad` | `falt[]` + Anhang | Ausgelesener Auftrag (**intern**) |
| `felbeskrivning` | `text` | Die Worte der Kundschaft, wörtlich |
| `arendetyp_satt` | `arendetyp` | Garantie / Versicherung / Kunde — wählt Regelpaket |
| `fraga_besvarad` | `stegId`, `frageId`, `fraga`, `svar` | Symptomfragen der Methodik |
| `kontroll_utford` | `stegId`, `kontrollId`, `text`, `resultat?`, `undantag?` | Verifizierter Prüfpunkt |
| `observation` | `text` | Was beobachtet wurde — nicht was vermutet wird |
| `matvarde` | `beskrivning`, `varde`, `enhet?` | Messung (E4) |
| `hypotes` | `text`, `niva` (nie `hog`) | Arbeitshypothese (**intern**) |
| `foto` | `beskrivning` + Anhang | Bildnachweis (E2) |
| `video` | `beskrivning` + Anhang | Bewegtbildnachweis (E3) |
| `matarstallning` | `lage` (ein/aus), `varde` + Anhang | Kilometerstand ein/aus |
| `historik_kontrollerad` | `kontrollerad`, `kommentar?` | Servicehistorie |
| `reproducering` | `status` (ja/delvis/nej), `beskrivning` | **Symptomverifizierung** |
| `felorsak` | strukturierte Ursachenanalyse | Ursache, Kategorie, Grundlage |
| `atgardsforslag` | Vorschlag mit Begründung | Was getan werden sollte |
| `kundbeslut` | genehmigt/abgelehnt, Kanal | Entscheidung der Kundschaft |
| `atgard_utford` | ausgeführte Arbeit | Was tatsächlich getan wurde |
| `kvalitetskontroll` | Prüfung nach der Reparatur | Ist das Symptom weg? |
| `kommentar` | `text` | Freie Notiz |
| `kategori_byte` | `kategori` | Zeiterfassung (**intern**) |
| `inaktivitet_forklarad` | `text`, `minuter` | Warum es stillstand |
| `overlamning` | `fran`, `till?` | Schichtübergabe |
| `ansvarig_satt` | `ansvarig` | Umverteilung durch die Leitung (**intern**) |
| `ai_svar` | klassifizierte `rader[]`, Modellname | Antwort der Entscheidungsunterstützung (**intern**) |
| `export_skapad` | `format`, `version` | Der Export protokolliert sich selbst |
| `arende_avslutat` | `signatur?` | Unterschrift der Technikerin |

### 2.2 Anhänge sind inhaltsadressiert

`foto`, `video`, `matarstallning` und `arbetsorder_skannad` sind
*Schnittmengentypen* mit `Bilaga` (Anhang):

```ts
export interface Bilaga {
  bilagaId?: string;
  bilagaHash?: string;   // SHA-256
  dataUrl?: string;      // bleibt für immer — das Protokoll ist append-only
}
```

Der Inhalt liegt außerhalb des Protokolls (S3 oder Datenbank), **der Hash aber
im Protokoll**. Beim Lesen wird der Hash geprüft; stimmt er nicht, wird `409`
zurückgegeben. Die Bedeutung: Wird ein Bild im Speicher ausgetauscht, fällt das
auf, und das Protokoll kann belegen, dass das ursprüngliche Bild ein anderes
war.

`dataUrl` bleibt im Typ, weil ältere Einträge es eingebettet enthalten — und das
Protokoll lässt sich nicht umschreiben.

---

## 3. Die Methodik-Engine

Seit der jüngsten Änderung sind **Engine und Inhalt getrennt**:

- `metodik.ts` (171 Zeilen) — Typen, Methodikauswahl, Ableitung des nächsten
  Schritts.
- `metodiker.ts` (899 Zeilen) — die sechzehn Methodiken.

Die Bibliothek kann wachsen, ohne dass die Engine sich ändert.

### 3.1 Die Methodikbibliothek

Schritt-IDs sind Code und bleiben schwedisch. `symptom` = Symptom, `visuell` =
Sichtprüfung, `matningar` = Messungen, `provkorning` = Probefahrt, `sakerhet` =
Sicherheit, `avlasning` = Auslesen, `glapp` = Spiel, `packning` = Dichtung.

| id | Name (im Code) | Bereich | Schritte | Prüfungen |
|---|---|---|---|---|
| `vibration` | Vibration under körning | Räder und Auswuchtung | symptom → visuell → kontroller → provkorning | 19 |
| `bromsar` | Bromssystem | Fahrwerk | symptom → visuell → matningar → system | 14 |
| `styrning_fjadring` | Styrning och fjädring | Fahrwerk | symptom → visuell → glapp → installning | 11 |
| `elsystem` | Elsystem och strömförsörjning | Elektrik | symptom → visuell → matningar → rela → funktionstest | 12 |
| `start_laddning` | Start- och laddningssystem | Elektrik | symptom → batteri → start → laddning → krypstrom | 15 |
| `motor_drift` | Motorgång och effekt | Motor | symptom → felkoder → mekanik → tandning_bransle → provkorning | 16 |
| `kylsystem` | Kylsystem och överhettning | Motor | symptom → visuell → matningar → packning | 12 |
| `drivlina` | Växellåda och drivlina | Antrieb | symptom → visuell → matningar → provkorning | 10 |
| `avgas_emission` | Avgassystem och emissioner | Motor | symptom → avlasning → matningar → orsak | 12 |
| `klimat` | Klimatanläggning | Komfort | symptom → visuell → matningar → styrning | 11 |
| `hogvolt` | Högvoltsystem — elbil och hybrid | Hochvolt | **sakerhet** → symptom → avlasning → laddning | 16 |
| `diagnos_natverk` | Felkoder och kommunikation | Diagnose | symptom → grund → buss → koder | 10 |
| `lackage` | Läckage | Sonstiges | symptom → visuell → metod | 8 |
| `missljud` | Missljud | Sonstiges | symptom → inspelning → lokalisering | 7 |
| `adas` | Förarassistans och kalibrering | Diagnose | symptom → forutsattningar → kalibrering | 9 |
| `generisk` | Generell strukturerad felsökning | Sonstiges | symptom → visuell → grundkontroller → funktionstest | 9 |

Deutsche Namen: Vibration während der Fahrt · Bremsanlage · Lenkung und
Federung · Elektrik und Stromversorgung · Start- und Ladesystem · Motorlauf und
Leistung · Kühlsystem und Überhitzung · Getriebe und Antriebsstrang · Abgas und
Emissionen · Klimaanlage · Hochvoltsystem (E-Auto/Hybrid) · Fehlercodes und
Kommunikation · Leckage · Störgeräusche · Fahrerassistenz und Kalibrierung ·
generische strukturierte Fehlersuche.

### 3.2 Drei Regeln, durch Tests festgeschrieben

1. **Jede Prüfung hat eine Mindestanforderung.** Messwert, Foto oder
   Beobachtung.
2. **Jede Methodik beginnt damit, das Symptom zu verifizieren**, nie mit der
   Instandsetzung. Die Worte der Kundschaft werden erst dann zum verifizierten
   Symptom, wenn sie reproduziert wurden.
3. **Wo die Arbeit jemanden verletzen kann, steht der Sicherheitsschritt an
   erster Stelle.** Nur `sakerhet` darf `symptom` vorausgehen — der Test lässt
   genau diese Ausnahme zu und keine andere.

`hogvolt` ist die einzige Methodik mit Sicherheitsschritt. Sie verlangt die
Befähigung, den dokumentiert entnommenen Servicestecker (Foto), die Wartezeit
nach Herstellerangabe, die **gemessene Spannungsfreiheit** (ein Messwert — kein
Ja auf eine Frage) und die Schutzausrüstung. Der Test prüft, dass der Schritt an
erster Stelle steht, dass `spanningsfrihet` einen Messwert verlangt und dass die
Beschreibung das Wort „livsfarlig" (lebensgefährlich) enthält.

Der Grund ist einfach: Diese Arbeit kann tödlich sein. Ein Häkchen genügt dort
nicht.

### 3.3 Auswahl der Methodik

Früher eine Regex-Kette mit drei Ausgängen. Jetzt **punktbewertetes
Stichwort-Matching**:

```ts
export function metodikPoang(metodik: Metodik, text: string): number
export function valjMetodik(felbeskrivning: string): Metodik
```

- Punktzahl = Summe der Längen der treffenden Stichwörter. Ein längeres — also
  spezifischeres — Wort wiegt schwerer. `traktionsbatteri` (16) schlägt
  `batteri`.
- **Kurze Wörter (≤3 Zeichen) treffen als ganzes Wort, längere als Wortstamm.**
  Sonst hätte `"ac"` das Wort *acceleration* getroffen und eine Vibration wäre
  in der Klimaanlage gelandet.
- Bei Gleichstand gewinnt das in der Bibliothek zuerst stehende Element → die
  Auswahl ist **stabil** über Läufe hinweg.
- Kein Treffer → `generisk`.

**Eine Falle, die in der Entwicklung tatsächlich zugeschlagen hat:** Die
Stichwörter müssen *Wortstämme* sein, keine fertig gebeugten Wörter. Die
schwedische Flexion tilgt oft ein `e`: *filter → filtret*, weshalb
`"partikelfilter"` den Text, den eine Technikerin wirklich schreibt, nie trifft.
Dasselbe gilt für *regenerering → regenererar*, *misständning → misständer*,
*skrammel → skramlar*. Die Bibliothek verwendet daher `partikelfilt`,
`regenerer`, `misständ`, `skram`.

*(Für eine Lokalisierung: Das ist eine Eigenschaft der schwedischen Morphologie.
Im Deutschen entsteht dieselbe Problemklasse durch Komposita —
`Partikelfilter` steckt in `Dieselpartikelfilter`, aber `Bremse` nicht am
Wortanfang von `Feststellbremse`. Ein lokalisierter Stichwortsatz muss gegen
denselben Test validiert und nicht Wort für Wort übersetzt werden.)*

**Die Auswahl ist eine Fragenreihenfolge, keine Diagnose.** Sie entscheidet, wo
gesucht wird, nicht was defekt ist. Trifft nichts zu, ist `generisk` die
ehrliche Antwort — strukturell vollständig und besser als eine Vermutung.

### 3.4 Nächster Schritt

```ts
export function nastaSteg(arende: Arende, metodik: Metodik): NastaSteg
```

Rein aus dem Protokoll abgeleitet: die erste unbeantwortete Frage, danach die
erste nicht ausgeführte Prüfung, in der Reihenfolge der Methodik. Keine
verborgene Zustandsmaschine — dasselbe Protokoll ergibt immer denselben nächsten
Schritt.

### 3.5 Zum Anspruch „alles abdecken"

Das lässt sich nicht ehrlich versprechen, und die Dokumentation behauptet es
auch nicht. Möglich ist, die Systeme des Fahrzeugs systematisch abzudecken und
`generisk` als strukturell vollständiges Auffangnetz für das Unvorhergesehene
zu belassen.

---

## 4. ECM v2.0 — die Evidenz- und Regel-Engine

`app/src/felsokning/ecm.ts` (749 Zeilen). Sechs Engines:

### 4.1 Evidence Engine

Evidenzstufen, aus dem Protokoll abgeleitet:

| Stufe | Bedeutung |
|---|---|
| E0 | Keine Grundlage |
| E1 | Beobachtung der Technikerin |
| E2 | Foto |
| E3 | Video |
| E4 | Messwert |
| E5 | Diagnosedaten / Dokument |
| E6 | Mehrere unabhängige Quellen |

Die Evidenzstufe eines Falls ist die höchste, die die Grundlage trägt. Sie wird
in der Oberfläche angezeigt und wandert mit dem Export mit.

**Inhalts-Hash:** `innehallsHash()` ist ein deterministischer FNV-1a über den
Evidenzinhalt. Dieselbe Grundlage ⇒ derselbe Hash, unabhängig von Maschine oder
Zeitpunkt. Damit ist der Export nachträglich überprüfbar.

### 4.2 Rule Engine

- `ORSAKSKATEGORIER` — feste Liste von Ursachenkategorien (ergibt vergleichbare
  Statistik über den Fuhrpark).
- `UNDANTAGSORSAKER` — feste Liste für „warum dies nicht getan wurde".
- `UNDERLAGSKALLOR` — worauf eine Schlussfolgerung beruht.
- `INGEN_ATGARD_ORSAKER`, `KUNDKANALER` (Kundenkanäle).
- `granskaAvvikelse()` — markiert Text, der als Feststellung formuliert ist,
  ohne gedeckt zu sein.

Feste Listen statt Freitext sind eine bewusste Entscheidung: Freitext lässt sich
nicht aggregieren, und die Fuhrparkstatistik ist eines der echten Aktiva des
Produkts.

### 4.3 Compliance Engine

`ARENDETYPER` (Fallarten) bestimmt, welches **Regelpaket** gilt. Ein Garantiefall
verlangt Claim-Nummer und Servicehistorie; ein Versicherungsfall Schadennummer
und Bildnachweis; ein Kundenfall weniger. Die Pakete sind Daten
(`ecm-regler.json`, ausliefbar über `/api/ecm/regler`) — neue Anforderungen
brauchen kein neues Release.

### 4.4 Validation Engine — Vordiagnostik

Bevor die Fehlersuche beginnen darf: Objektidentifizierung verifiziert, Auftrag
eingelesen, Fahrzeughistorie geprüft **oder begründet**, eingehender
Kilometerstand dokumentiert, Fehlerbeschreibung der Kundschaft verifiziert,
frühe Beobachtungen bearbeitet.

### 4.5 Completion Engine — das Qualitätstor

Die größte Einzelfunktion (`kvalitetsgrind`, ~240 Zeilen). Der Fall kann nicht
abgeschlossen werden, bevor jede Zeile grün oder begründet ist:

- Fahrzeughistorie geprüft oder begründet
- Eingehender/ausgehender Kilometerstand dokumentiert
- Fehlerbeschreibung der Kundschaft verifiziert
- **Symptomverifizierung:** reproduziert oder als nicht reproduzierbar
  dokumentiert
- Ursachenanalyse dokumentiert
- Maßnahme dokumentiert oder begründet
- Entscheidung der Kundschaft zum Vorschlag erfasst
- Arbeit trotz abgelehntem Vorschlag ausgeführt (sofern zutreffend)
- Qualitätskontrolle durchgeführt — Symptom verifiziert
- Prüfungen der Methodik: Nachweis oder dokumentierte Ausnahme
- Fotos vorhanden für fotopflichtige Prüfungen
- Schlussfolgerung der Technikerin unterschrieben
- Hypothesen als nicht verifiziert ausgewiesen
- Regelpaket der Fallart erfüllt (Claim / Schadennummer / Kilometerstand /
  Historie)

### 4.6 Traceability Engine

`sparbarhetspaket()` — die gesamte Beweiskette in einem strukturierten Objekt:
was behauptet wird, worauf es beruht, wer es dokumentiert hat und wann.

---

## 5. Symptomverifizierung (SVP)

Ein eigenes Prinzip, weil es die schärfste Kante des Produkts zur Wirklichkeit
ist.

**Die Beschreibung der Kundschaft ≠ ein festgestellter Fehler.**

1. Die Beschreibung wird **wörtlich** dokumentiert (`felbeskrivning`).
2. Sie wird über die Symptomfragen der Methodik präzisiert — *wann, wo, wie*,
   nie „was ist kaputt".
3. Sie wird **reproduziert**, mit drei möglichen Ausgängen:
   - **Ja** — mit dokumentierten Bedingungen.
   - **Teilweise** — was sich nachstellen ließ und was nicht.
   - **Nein** — verpflichtende Begründung.

Die Beweiskette des Berichts trennt vier Dinge, die sonst vermischt werden: *die
Beschreibung der Kundschaft*, *die verifizierte Beobachtung*, *die
Ursachenanalyse* und *die empfohlene Maßnahme*.

---

## 6. Der Client

`app/src/felsokning/` + `app/src/pages/felsokning/`.

| Modul | Zeilen | Verantwortung |
|---|---|---|
| `ArendeSida.tsx` | 2433 | Die Fallansicht. Dreispaltiges Layout am Schreibtisch |
| `metodiker.ts` | 899 | Die Methodikbibliothek |
| `ecm.ts` | 749 | Regel- und Evidenz-Engine |
| `NyttArende.tsx` | 497 | Fallanlage, Auftragsscan |
| `Arendelista.tsx` | 399 | Dashboard: Zähler, Filter |
| `projektioner.ts` | 356 | Alle Ansichten als reine Funktionen des Protokolls |
| `ai.ts` | 305 | Clientseite des Orchesters, Prompt-Bau, Antwort-Parsing |
| `plattform.ts` | 296 | API-Client gegen die selbst gehostete Plattform |
| `DelatArendeVy.tsx` | 283 | Geteilte Ansicht (Kunde/Partner/intern) |
| `domain.ts` | 281 | Ereignistypen |
| `Installningar.tsx` | 281 | Organisation, Benutzer, Integrationen |
| `Oversikt.tsx` | 238 | Ansicht für die Werkstattleitung |
| `demo.ts` | 200 | Demofall mit 1 Std. 35 Min. Historie |
| `ui.tsx` | 174 | Industrielle Werkstattoberfläche |
| `metodik.ts` | 171 | Die Methodik-Engine |
| `synk.ts` | 141 | Konfliktfreies Zusammenführen von Ereignissen |
| `ikoner.tsx` | 132 | Eigene SVG-Linienicons (keine Emojis) |
| `streckkod.ts` | 131 | Barcode-/FIN-Erfassung |
| `store.ts` | 106 | zustand-Store |
| `bilagor.ts` | 96 | Upload + Blob-URL-Cache |
| `installningar.ts` | 86 | Organisationseinstellungen |
| `Bilagevisning.tsx` | 69 | `<Bild>` / `<Klipp>` |
| `Mikrofon.tsx` / `rost.ts` | 66 / 65 | Spracherkennung |
| `format.ts` | 48 | Fotoskalierung u. a. |

### 6.1 Die Projektionen

```
objekt · felbeskrivning · ansvarig · arendeidentitet · arAvslutat
lokalFordonshistorik · utfordaKontroller · ejKontrollerat
observationer · hypoteser · foton · videor
tidsfordelning · formateraTid · tillforlitlighet
brief · overlamningstext · tidsfordelningsRader · sistaAktivitet
```

Alles reine Funktionen von `Arende`. `ejKontrollerat` („noch nicht geprüft") ist
die, die in der Praxis am meisten Zeit spart: *Was beim Schichtwechsel
Doppelarbeit verursacht, ist das, wovon niemand aufgeschrieben hat, dass es
niemand getan hat.*

### 6.2 Gestaltungssprache

Eine an ETKA angelehnte Werkstattoberfläche: flache hellgraue Flächen
(#ECECEC/#F7F7F7), scharfe Kanten, tiefes Marineblau als Primärfarbe, dichte
Typografie (11–15 px), rechteckige Schaltflächen (max. 4 px Radius),
Werkzeugleiste ~44 px. Eigene Linienicons statt Emojis; Status als Farbpunkte.

Das Motiv: Die Technikerin trägt Handschuhe, steht in einem lauten Raum und hat
keine Zeit für eine luftige Consumer-Oberfläche.

### 6.3 Lokaler Betrieb

Ohne Anmeldung arbeitet die App gegen `localStorage`. Die Methodik führt allein,
das Orchester ist aus. Der Status steht im Fallkopf. Bei der Anmeldung werden
lokale Ereignisse mit denen des Servers zusammengeführt — konfliktfrei je
Ereignis-ID, getestet.

---

## 7. Backend

### 7.1 `services/plattform` (1210 Zeilen)

Reines `node:http`. Einzige Abhängigkeit ist `pg`.

**API-Pfade:**

```
GET  /halsa                        Gesundheitsprüfung
GET  /api/openapi.yaml
POST /api/auth/registrera          legt Organisation + Systemadministrator an
POST /api/auth/logga-in            Anmeldung
POST /api/auth/logga-ut-alla       erhöht token_version → alle Sitzungen enden
GET  /api/anvandare                Benutzer; nur Admin
POST /api/anvandare
POST /api/anvandare/{id}/avaktivera | /aktivera
GET  /api/organisation
GET/PUT /api/organisation/installningar
GET  /api/ecm/regler               Regelpakete als Daten
GET/POST /api/arenden              Fälle
POST /api/arenden/{id}/handelser   append-only
POST /api/arenden/{id}/bilagor     Anhänge
GET  /api/bilagor/{id}             Hash beim Lesen geprüft
GET  /api/fordon/{identifierare}/historik
GET  /api/statistik/felorsaker     Ursachenstatistik
GET  /api/oversikt                 Leitungsansicht
GET  /api/delad/{kod}              geteilt, nach Stufe gefiltert
POST /api/delad/{kod}/beslut       Kundenentscheidung ohne Anmeldung
GET  /api/delad/{kod}/bilagor/{id} stufengefiltert
GET  /api/integrationer/leverantorer
GET/PUT/DELETE /api/integrationer/{leverantor}
POST /api/integrationer/{leverantor}/uppslag
```

Es gibt keine Update- oder Delete-Pfade auf Falldaten. Mit Absicht.

**Sicherheitsfunktionen im Dienst:**

```
ursprungFor · forTataForsok · kallaFor · inloggningSparrad · loggaForsok
skapaJwt · verifieraJwt · kontoGiltigt · kravAuth · arendeIOrg
integrationsNyckel · kryptera · dekryptera · maskera
arPrivatAdress · pekarInat · gorUppslag · skickaBilaga · synligaTyper
```

### 7.2 `services/ai-orkester` (400 Zeilen)

Besitzt den Claude-Schlüssel. Der Client hat ihn **nie**. Routing pro Aufgabe:

| Aufgabe | Modell | Effort | Vision |
|---|---|---|---|
| `handledning` (Begleitung in Echtzeit) | `claude-sonnet-5` | medium | — |
| `granskning` (Tiefenprüfung) | `claude-opus-5` | **high** | — |
| `sammanfattning` (Übergabezusammenfassung) | `claude-sonnet-5` | low | — |
| `metodikval` (Klassifizierung) | `claude-haiku-4-5` | *(keiner — das Modell nimmt den Parameter nicht)* | — |
| `instrumentavlasning` (Instrumentenablesung) | `claude-sonnet-5` | low | ✔ |
| `dokumenttolkning` (Dokumentenauswertung) | `claude-sonnet-5` | low | ✔ |

Alle Antworten sind **schemagebunden** (`json_schema`). Der Basis-Prompt codiert
die Regeln: *„Erfinde niemals Fakten"*, *„niemals eine Hypothese als
festgestellten Fehler"*, *„ERFORDERT Verifizierung"*. Bei abgelehnter Anfrage
erfolgt automatischer Rückfall auf ein Reservemodell. **Das antwortende Modell
wird in jedem `ai_svar`-Ereignis protokolliert** — die Grundlage muss
nachträglich prüfbar sein.

Der Methodikkatalog wird aus einer einzigen Liste (`METODIK_KATALOG`) gebaut,
die sowohl das `enum` des Schemas als auch die Aufzählung im Prompt erzeugt. Ein
Test vergleicht ihn mit der Bibliothek des Clients: Driften die Listen
auseinander, liefert der Klassifikator eine ID, die der Client nicht kennt, und
die Auswahl fiele *stillschweigend* auf generisch zurück. Jetzt schlägt
stattdessen der Test fehl.

### 7.3 `services/gemensam/observation.mjs` (166 Zeilen)

Tracing und Metriken **ohne neue Abhängigkeiten**. Die Dienste haben bewusst
fast keine Abhängigkeiten; ein OpenTelemetry-SDK mit dreißig Paketen
hereinzuholen, um vier Dinge zu messen, wäre die falsche Abwägung. Stattdessen
zwei Standards, die beide nur Text auf stdout sind:

- **W3C Trace Context** — `traceparent` läuft durch die ganze Kette mit
  (Client → Plattform → Orchester).
- **CloudWatch EMF** — strukturiertes JSON, aus dem CloudWatch selbst Metriken
  zieht. Kein Agent, kein SDK, nichts, was still ausfallen kann.

```
spårFrån(Header) · traceparent(Spur) · starta(Name, Spur)
  → .mät(Teilname, Arbeit) · .ms() · .delar()
logga(Stufe, Meldung, Felder) · mätvärde(Name, Wert, Einheit, Dim, Extra)
avsluta(Span, { status, väg, extra })
```

Was gemessen wird, ergab sich aus einer Frage: *Was will man um drei Uhr nachts
wissen, wenn etwas langsam ist?* Die Antwort ist **wohin die Zeit ging** — nicht
wie viele Aufrufe erfolgten. Daher `delar()` („Teile"): die Datenbank, der
Modellaufruf, der Objektspeicher, der Anbieter der Kundschaft, mit Anzahl und
Summe je Teil in derselben Protokollzeile.

`mät()` misst auch, wenn die Arbeit eine Ausnahme wirft — sonst sähen Fehler wie
null Zeit aus.

**Dimensionen werden bewusst knapp gehalten.** Jede eindeutige Kombination ist
eine eigene, kostenpflichtige Zeitreihe; Organisation, Fall und Spur-ID dürfen
daher nie zu Dimensionen werden — sie sind gewöhnliche Felder. Festgeschrieben
durch einen Test, der `org`, `organisation`, `arende`, `spårId`, `anvandare`
unter den Dimensionen ausdrücklich verbietet.

---

## 8. Sicherheit

| Schutz | Umsetzung |
|---|---|
| **Mandantentrennung** | Alle Fallabfragen sind organisationsgebunden (`arendeIOrg`); integrationsgetestet gegen echtes Postgres |
| **Rollen** | `tekniker` / `arbetsledare` / `admin` (Techniker / Werkstattleitung / Admin), im JWT und als Datenbank-Check |
| **JWT-Claims** | `{ sub, namn, org, roll, tv }` — `tv` = token_version |
| **Sofortiger Entzug** | `kontoGiltigt()` prüft `aktiv` + `token_version` bei *jeder* authentifizierten Anfrage. Eine gültige Signatur genügt nicht |
| **Globale Abmeldung** | `/api/auth/logga-ut-alla` erhöht `token_version` → alle ausgestellten Tokens verfallen sofort |
| **Passwörter** | bcrypt über `gen_salt('bf')` in der Datenbank |
| **Anmeldesperre** | 15-Minuten-Fenster; max. 10 Versuche je Konto, 30 je Quelle. Probabilistisch aufgeräumt (2 % je Schreibvorgang), um einen Cron-Job zu vermeiden |
| **Verschlüsselung im Ruhezustand** | AES-256-GCM für die Integrationszugänge der Kundschaft; geheime Felder werden in API-Antworten immer maskiert |
| **SSRF-Abwehr** | `arPrivatAdress()` + `pekarInat()`: 10/8, 127/8, 169.254/16, 172.16–31, 192.168/16, 100.64/10, ::1, fc/fd, fe80, ::ffff:. **DNS wird aufgelöst**, bevor der Aufruf erfolgt; `.local`/`.internal` blockiert. Notausgang `TILLAT_INTERNA_UPPSLAG` für Testumgebungen |
| **CORS** | `TILLATNA_URSPRUNG`-Positivliste; der Ursprung wird einmal je Anfrage gesetzt |
| **Integrität von Anhängen** | SHA-256 im Protokoll, beim Lesen geprüft → `409` bei Abweichung |
| **Append-only in der Datenbank** | Trigger `before update or delete` auf `felsokning_handelser` und `felsokning_arenden` |
| **Pod-Härtung** | IMDSv2 verpflichtend, Hop-Limit 1 → Pods können die IAM-Rolle des Knotens nicht ausleihen |
| **IRSA** | Jedes Service-Konto hat eine eigene Rolle; die Knoten teilen keine Rechte |
| **Getrennte IAM-Rollen** | `bygg` (Build) darf nach ECR veröffentlichen, aber den Cluster nicht anfassen; `drift` (Betrieb) darf den Cluster anfassen, aber keine Images veröffentlichen |
| **Netzwerkrichtlinie** | Eingehend standardmäßig verboten; explizite `_ut`-Regeln (ausgehend) je Dienst |
| **Datenbankzugriff** | Nur von den Cluster-Knoten, in einer Subnetzschicht **ohne Route nach draußen** |

### 8.1 Datenbankschema

```
organisationer · anvandare · inloggningsforsok
felsokning_arenden · felsokning_handelser
bilagor · bilage_innehall
delningar · integrationer
```

(Organisationen · Benutzer · Anmeldeversuche · Fälle · Ereignisse · Anhänge ·
Anhangsinhalte · Freigaben · Integrationen)

---

## 9. Live Share — Freigabestufen

Drei Stufen, serverseitige Filterung:

| Stufe | Sieht |
|---|---|
| **kund** (Kundschaft) | 22 Ereignistypen: Objekt, Fehlerbeschreibung, Fragen, Prüfungen, Beobachtungen, Messwerte, Fotos, Videos, Kommentare, Übergaben, Maßnahmen, Qualitätskontrolle … |
| **partner** | Alles, was die Kundschaft sieht **+ `hypotes`** (als nicht verifiziert gekennzeichnet) |
| **intern** | Volle Einsicht — keine Filterung |

**Niemals außerhalb der Organisation:**
`kategori_byte`, `hypotes`, `ai_svar`, `ansvarig_satt`, `arbetsorder_skannad`.

```js
export function synligaTyper(niva) {
  if (niva === "intern") return null;           // volle Einsicht
  return niva === "partner" ? DELBART_PARTNER : DELBART_KUND;
}
```

Links sind widerrufbar. Die öffentliche Freigabeseite
(`/felsokning/delad/:kod`) verlangt keine Anmeldung und pollt für
Live-Aktualisierung. Die Kundschaft kann ihre Entscheidung direkt in der Ansicht
abgeben (`POST /api/delad/{kod}/beslut`).

**Warum eine Positivliste:** Eine Negativliste muss aktualisiert werden, sobald
ein neuer Ereignistyp hinzukommt — und genau das wird vergessen. Eine
Positivliste macht aus „vergessen" ein „intern", und das ist der sichere
Ausgang.

---

## 10. Markenspezifische Anbindungen

Anbieter sind **Daten, kein Code** (`integrationer.json`, als ConfigMap über
`INTEGRATIONER_FIL` einhängbar). Neue Marken erfordern keinen Neubau.

| id | Anbieter |
|---|---|
| `generisk_vin` | Beliebiger FIN-Dienst über HTTP |
| `vag_erwin` | Volkswagen Group erWin (VW, Audi, Škoda, SEAT) |
| `volvo_vida` | Volvo VIDA |
| `fordonsregister` | Kennzeichen → Fahrzeug |

Jeder Anbieter deklariert seine Felder, welche geheim sind (verschlüsselt +
maskiert) und wie die Antwort auf die Domänenfelder abgebildet wird (`marke`,
`modell`, `arsmodell`, `motor`, `vaxellada` — Marke, Modell, Baujahr, Motor,
Getriebe).

Abfragen laufen durch den SSRF-Schutz — eine Kundin kann einen „Anbieter" also
nicht auf interne Adressen des Clusters richten.

---

## 11. Visual-first

Die Kamera **ist** die Integrationsschicht. Was auf einem Bildschirm oder einem
Instrument steht, wird fotografiert und ausgewertet, statt angebunden zu werden.

- **Auftragsscan** ist der Hauptweg bei der Fallanlage. Sonnet 5 (Vision) liest
  Kunden-, Fahrzeug- und Werkstattangaben unabhängig vom Layout, mit einer
  Konfidenz je Feld:
  - 🟢 ≥95 % automatisch übernommen
  - 🟡 80–95 % zum Durchlesen markiert
  - 🔴 <80 % erfordert aktive Bestätigung

  Die Technikerin prüft also nur die unsicheren Felder. Visuelle Kontrolle mit
  dem Dokument neben den Feldern; ein Klick markiert die ungefähre Position.

- **Instrumentenablesung** — Foto eines Diagnosebildschirms oder Instruments →
  strukturierte Werte.

Das Motiv ist kommerziell: Eine Anbindung je Werkstattsystem bedeutet einen
Vertriebszyklus je Kunde. Eine Kamera funktioniert sofort gegen alles.

---

## 12. Infrastruktur

Zwei Terraform-Schichten. Die Basis läuft selten, die Arbeitslastschicht oft.

### 12.1 `infra/aws` — die Basis (91 Ressourcen)

| Bereich | Inhalt |
|---|---|
| **Netz** | 1 VPC, 3 Subnetzschichten × 3 Zonen: öffentlich (nur ALB + NAT), privat (Knoten, keine öffentlichen Adressen), Daten (Aurora, **überhaupt keine Route nach draußen**). VPC-Endpunkte: S3 (Gateway); ECR, Logs, Secrets Manager, STS, ELB (Interface) → der Verkehr verlässt das Netz nie |
| **Cluster** | EKS, arm64-Knoten, IRSA über OIDC-Provider, IMDSv2 Hop-Limit 1, alle fünf Control-Plane-Logs an |
| **Daten** | Aurora PostgreSQL Serverless v2, PITR sekundengenau, KMS mit eigenem Schlüssel, `sslmode=require` |
| **Objektspeicher** | S3 für Anhänge: SSE-KMS, öffentlicher Zugriff blockiert, TLS verpflichtend, Versionierung an. Die Plattformrolle darf lesen und schreiben — **aber nie löschen** |
| **Registry** | ECR mit **unveränderlichen Tags** + Schwachstellen-Scan |
| **Geheimnisse** | Secrets Manager; nur von der Plattformrolle über IRSA lesbar |
| **Rollen** | 9 IAM-Rollen, darunter die getrennten `bygg` / `drift` |
| **Domäne** | Route 53 + ACM mit DNS-Validierung |
| **Beobachtbarkeit** | 7 Alarme, 1 Dashboard, 3 Log-Gruppen, SNS-Topic |

**Die Alarme** — wenige, aber die vorhandenen bedeuten etwas. *Ein Alarm, auf
den niemand reagiert, bringt Menschen bei, Alarme zu ignorieren.*

- Aurora-CPU > 85 % über drei Perioden (die Skalierungsgrenze könnte erreicht
  sein)
- Aurora freier lokaler Speicher < 5 GiB
- **Backup-Alter** — `treat_missing_data = "breaching"`. Fehlt der Messwert,
  gibt es keine Sicherung. *Ein Backup, von dem man glaubt, es gäbe es, ist
  schlimmer als keines.*
- Weniger Knoten als das gewünschte Minimum
- Antwortzeit **p95** > 3 s über drei Perioden — nicht der Mittelwert, der
  verdeckt, dass jede zwanzigste Technikerin unzumutbar lange wartet
- Serverfehler (Summe > 5)
- Das Modell lehnt ab (deutet auf unerwartete Eingaben hin, nicht auf einen
  Betriebsfehler)

### 12.2 `infra/terraform` — die Arbeitslast (35 Ressourcen)

Liest die Basis über `terraform_remote_state`; wiederholt nichts.

```
kubernetes_namespace_v1        denna, gitea
kubernetes_service_account_v1  plattform (IRSA), drift, runner
kubernetes_deployment_v1       plattform, orkester, web
kubernetes_service_v1          plattform, orkester, web
kubernetes_horizontal_pod_autoscaler_v2  × 3
kubernetes_pod_disruption_budget_v1      × 3
kubernetes_ingress_v1          denna, gitea
kubernetes_network_policy_v1   neka_allt_in, tjanster_in, dns_ut,
                               plattform_ut, orkester_ut, web_ut
kubernetes_manifest            hemlighetskalla, hemligheter (External Secrets)
helm_release                   lastbalanserare (ALB), external_secrets,
                               cloudwatch, metrics, gitea
aws_route53_record             denna
```

`karta.tf` (117 Zeilen) erzeugt eine lesbare Karte des gesamten Betriebsbildes:
`terraform output karta`.

### 12.3 Git und CI — vollständig selbst gehostet

Eine ausdrückliche Produktentscheidung: **kein GitHub im Betriebspfad.** Gitea +
Actions-Runner laufen auf eigenem EKS. `.gitea/workflows/felsokning.yml`:

| Job | Inhalt |
|---|---|
| `test-och-bygg` | `vitest run`, `typkontroll`, eslint, `vite build` |
| `tjanster` | eslint auf den Diensten, **Integrationstest gegen echtes Postgres**, `swagger-cli validate` |
| `terraform` | `fmt -check -recursive`, `init -backend=false`, `validate` |
| `publicera` | Nur auf `main`, nur wenn das Obige durchlief. Baut drei Images, taggt mit dem Commit-SHA, schiebt in die eigene ECR. **OIDC, kein statischer Schlüssel** |
| `driftsatt` | **Manuell** (`workflow_dispatch`) mit explizitem Image-Tag |

Die Inbetriebnahme ist bewusst ein eigener Schritt: *Ein Image in der Registry
ist nicht dasselbe wie ein laufendes Image.* Rollback = erneut mit dem
vorherigen Tag ausführen.

Die API-Adresse des Clients wird beim Build eingebacken (Vite), das Image ist
also umgebungsgebunden. Der Build-Kontext der Dienste ist `services`,
damit beide das gemeinsame Beobachtungsmodul erreichen, ohne es zu duplizieren.

---

## 13. Testen

**120 vitest-Tests** in 13 Dateien:

| Datei | Anzahl | Schreibt fest |
|---|---|---|
| `ecm.test.ts` | 32 | Evidenzstufen, Regelpakete, Qualitätstor, Vordiagnostik |
| `metodiker.test.ts` | 14 | Bibliotheksstruktur, Methodikauswahl, Katalogparität mit dem Orchester |
| `projektioner.test.ts` | 13 | Ansichten als reine Funktionen, nächster Schritt |
| `ai.test.ts` | 11 | Orchesterparität, OpenAPI ↔ Server, append-only, Prompt-Regeln |
| `observation.test.ts` | 10 | Tracing, EMF-Format, **verbotene Dimensionen** |
| `bilagor.test.ts` | 9 | Inhalts-Hash, SigV4, Speicherschichtwahl |
| `delning.test.ts` | 7 | Die Positivliste deckt jeden Ereignistyp ab |
| `integrationer.test.ts` | 7 | Anbieterabfragen, SSRF-Schutz |
| `demo.test.ts` | 4 | Der Demofall ist reichhaltig genug zum Zeigen |
| `installningar.test.ts` | 4 | Organisationseinstellungen |
| `streckkod.test.ts` | 4 | FIN/Barcode |
| `synk.test.ts` | 4 | Konfliktfreies Zusammenführen |
| `example.test.ts` | 1 | — |

**Über die Unit-Tests hinaus:**

- `integrationstest.sh` — der gesamte Ablauf gegen **echtes Postgres**:
  Organisationen, Rollen, der Append-only-Trigger, Trennung, Freigabe, Anhänge.
- SigV4 **bitgenau gegen botocore quergeprüft** (`sigv4-referens.json`).
- `swagger-cli validate` auf der OpenAPI-Spezifikation.
- Paritätstests zwischen Spezifikation ↔ Server, Client ↔ Orchester (× 2
  Kopien), Domänenmodell ↔ Freigabeliste.

### 13.1 Die Prüfschleife vor jedem Commit

```
npx vitest run                    # 120 Tests
npm run typkontroll               # tsc --noEmit  (vite build prüft KEINE Typen)
npx eslint src/felsokning src/pages/felsokning
cd ../services && npx eslint .
npm run build
terraform fmt -check -recursive
# CI der Wurzel: lint · format:check · typecheck · test
```

`typkontroll` kam hinzu, nachdem zwei latente Abstürze (`TextFalt` und
`UNDANTAGSORSAKER` ohne Import verwendet) an `vite build` vorbeigekommen waren —
das transpiliert, prüft aber keine Typen.

---

## 14. Repository-Struktur

`main` ist ein npm-workspaces-Monorepo namens **Semantika**, das die Wurzel
besitzt. Bei der Zusammenführung der beiden Produkte wurden beide behalten, mit
**je Baum getrennten Werkzeugketten** — nicht dadurch, dass die Regeln einer
Seite aufgeweicht wurden.

```
/                             Semantika (Workspaces-Wurzel)
├── apps/mobile/              Semantika
├── services/api/             Semantika
├── infra/                    Semantika
├── .github/workflows/ci.yml  Semantika  — unangetastet
│
├── .gitea/workflows/felsokning.yml      Guidad Felsökning (eigene CI)
└── felsokning/
    ├── app/                  Client (eigene package.json, eslint, vitest, tsconfig)
    ├── services/
    │   ├── plattform/
    │   ├── ai-orkester/
    │   └── gemensam/         observation.mjs (gemeinsam)
    ├── infra/
    │   ├── aws/              die Basis, 91 Ressourcen
    │   ├── terraform/        die Arbeitslast, 35 Ressourcen
    │   └── postgres-init.sql
    ├── docs/
    └── supabase/             Migrationen + Edge-Funktion (älterer Weg)
```

**Zwei Betriebswege bestehen parallel:** der selbst gehostete AWS-Stack (der
gilt) und ein älterer Supabase-basierter (die Edge-Funktion `felsokning-ai`,
Migrationen). Das Orchester existiert daher in **zwei Kopien**, durch Tests
synchron gehalten.

---

## 15. Dokumentation im Repository

```
docs/VISION.md                          die Produktvision
docs/MASTER-PROMPT.md                   die Gründungsinstruktion
docs/MVP.md                             was gebaut ist, Funktion für Funktion
docs/DEMO.md                            Demoskript für Vorführungen
docs/OPERATIONS.md                           Betrieb
docs/SYSTEM-DESCRIPTION.md              Englisch — die maßgebliche Fassung
docs/SYSTEM-DESCRIPTION.sv.md           Schwedisch
docs/SYSTEM-DESCRIPTION.de.md           dieses Dokument
docs/SYSTEM-DESCRIPTION.da.md           Dänisch
docs/SYSTEM-DESCRIPTION.no.md           Norwegisch (Bokmål)
docs/examples/vibration-at-88-km-h.md   durchgerechnetes Beispiel
docs/modules/                           acht Moduldokumente
```
Alle Dokumente oben sind auf Englisch maßgeblich und haben ein schwedisches
`.sv.md`-Gegenstück. Nur SYSTEM-DESCRIPTION liegt in allen fünf Sprachen vor.


---

## 16. Entwurfsentscheidungen und ihre Beweggründe

Zusammengestellt, weil der Beweggrund oft wichtiger ist als die Entscheidung.

| Entscheidung | Beweggrund |
|---|---|
| Event Sourcing | Die Dokumentation muss im Streitfall halten. Die Historie *ist* der Wert |
| Append-only auch in der Datenbank | Die Anwendungsschicht lässt sich umgehen, der Trigger nicht |
| Positivliste für Freigaben | Ein vergessener Ereignistyp wird intern, nicht geleakt |
| Feste Ursachenkategorien | Freitext lässt sich nicht aggregieren; die Fuhrparkstatistik ist ein Aktivum |
| Serverseitiges Modell-Routing | Der Client darf den Schlüssel nie halten, und Routing muss sich ohne Release ändern lassen |
| Modell je Antwort protokolliert | Die Grundlage muss nachträglich prüfbar sein |
| Das Wort „KI" vermeiden | Die Kundschaft hört „Vermutung"; die Sachbearbeitung gewichtet niedriger |
| Visual-first | Eine Anbindung je Werkstattsystem = ein Vertriebszyklus je Kunde. Die Kamera funktioniert sofort |
| Anbieter als Daten | Eine neue Marke soll kein Release erfordern |
| Eigene Beobachtbarkeit, null Abhängigkeiten | 30 Pakete, um 4 Dinge zu messen, ist die falsche Abwägung |
| Wenige EMF-Dimensionen | Jede Kombination ist eine kostenpflichtige Zeitreihe |
| p95 im Alarm, nicht der Mittelwert | Der Mittelwert verdeckt, dass jede zwanzigste Technikerin wartet |
| Alarm auf *fehlende* Backup-Daten | Ein geglaubtes Backup ist schlimmer als keines |
| Getrennte Build-/Betriebsrollen | Ein kompromittierter Build darf den Cluster nicht anfassen können |
| Manuelle Inbetriebnahme | Ein Image in der Registry ≠ ein laufendes Image |
| Unveränderliche ECR-Tags | Ein Tag muss morgen dasselbe bedeuten |
| Inhaltsadressierte Anhänge | Ein ausgetauschtes Bild muss auffallen, nicht unterstellt werden |
| Hash-Prüfung beim Lesen | Hashen beim Schreiben genügt nicht |
| Die S3-Rolle darf nicht löschen | Append-only muss auch für den Speicher gelten |
| Engine vom Inhalt getrennt | Die Bibliothek wächst; die Engine soll sich nicht ändern müssen |
| Punktbewertete Methodikauswahl | Regex-Ketten werden bei 16 Alternativen undurchschaubar |
| Stichwörter als Wortstämme | Die schwedische Flexion tilgt ein `e` — sonst trifft nichts |
| `generisk` als Rückfall | Ein ehrliches „wir wissen es nicht" schlägt eine Vermutung |
| Sicherheitsschritt zuerst bei Hochvolt | Diese Arbeit kann tödlich sein |
| Schwedisch im Code | Die Domäne ist schwedisch; Hin- und Herübersetzen verliert Präzision |

---

## 17. Bekannte Grenzen und offene Punkte

Ausdrücklich nicht fertig:

- **Zwei Orchester-Kopien** (Supabase-Edge-Funktion + K8s-Dienst) werden durch
  Tests synchron gehalten, nicht durch gemeinsamen Code. Der Supabase-Weg ist
  der ältere und sollte abgelöst werden.
- **`ArendeSida.tsx` hat 2433 Zeilen.** Es funktioniert, ist aber die Datei, die
  am meisten kostet, wenn man sie ändert.
- **`terraform validate` lässt sich lokal nicht ausführen** (die ausgehende
  Netzwerkrichtlinie blockiert Provider-Downloads). Ersetzt durch
  `terraform fmt` plus eine eigene statische Referenzprüfung; die echte
  Validierung erfolgt in der CI.
- **Der Claude-Schlüssel wird von Hand eingetragen**, nach dem ersten `apply` —
  er liegt bewusst nicht im Terraform-State.
- **`postgres-init.sql` wird manuell** gegen die Datenbank ausgeführt, nachdem
  die Basis angewandt wurde.
- **Kein automatischer Wiederherstellungstest des Backups.** Der Alarm sagt,
  dass gesichert *wird*, nicht dass sich *wiederherstellen lässt*.
- **Die Methodikbibliothek deckt nicht alles ab** — und behauptet es auch nicht.
  `generisk` ist das Auffangnetz.
- Das eslint der Wurzel hat 20 vorbestehende Fehler in Semantikas eigenen Seiten
  (`no-explicit-any`), die nichts mit Guidad Felsökning zu tun haben.

---

## 18. Glossar

Die linke Spalte ist der Begriff, wie er in Code und Oberfläche erscheint.

| Schwedisch | Deutsch |
|---|---|
| Ärende | Fall — ein Fehlersuchauftrag |
| Händelse / loggpost | Ereignis / Protokolleintrag — unteilbarer Eintrag im Append-only-Protokoll |
| Metodik | Methodik — strukturierter Fehlersuchablauf |
| Steg | Schritt — Phase einer Methodik (Symptom, Sichtprüfung, Messungen …) |
| Kontroll | Prüfung — einzelner Checklistenpunkt mit Mindestanforderung |
| Krav | Anforderung — `matvarde` / `kommentar` / `foto` |
| Undantag | Ausnahme — dokumentierter Grund, warum eine Prüfung entfiel |
| Brief | Briefing — verdichtetes Fallbild; eine Projektion |
| Kvalitetsgrind | Qualitätstor — Regelwerk, das vor dem Abschluss passiert werden muss |
| Evidensnivå | Evidenzstufe — E0–E6, die Beweiskraft der Grundlage |
| Reproducering | Reproduktion — Symptomverifizierung: ja / teilweise / nein |
| Felorsak | Fehlerursache — strukturierte Analyse mit Kategorie und Grundlage |
| Delning | Freigabe — externer Link mit Berechtigungsstufe |
| Orkester | Orchester — der Dienst, dem das Modell-Routing gehört |
| Spann / spår | Span / Spur — Zeitmessung bzw. W3C-Tracing |
| Bilaga | Anhang — inhaltsadressiertes Foto/Video/Dokument |
| Tekniker | Technikerin, Techniker |
| Arbetsledare | Werkstattleitung, Meister |
| Fordon | Fahrzeug |
| Mätvärde | Messwert |
| Felbeskrivning | Fehlerbeschreibung (die Worte der Kundschaft) |
| Arbetsorder | Werkstattauftrag |
| Mätarställning | Kilometerstand |
| Överlämning | Übergabe |
| Åtgärd | Maßnahme, Instandsetzung |
| Kundbeslut | Kundenentscheidung |
| Säkerhet | Sicherheit |
| Högvolt | Hochvolt |
