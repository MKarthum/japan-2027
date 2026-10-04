# Japan 2027

> Skal du videreutvikle repoet eller bruke en AI-agent? Start med `START_HERE.md`.

Offentlig planleggingsrepo for en mulig Japan-tur våren 2027. Nettsiden er en enkel, datadrevet GitHub Pages-side som skal være interessant å utforske for hele familien – uten å bli et tungt reiseplanleggingssystem.

> **Viktig:** Dette repoet er offentlig. Ikke legg inn private eller identifiserende opplysninger. Les `PUBLIC_DATA_POLICY.md` før du legger til eller endrer innhold.

## Nettside

GitHub Pages publiserer fra repoet, og rotens `index.html` sender videre til `/docs/`.

Hovednavigasjonen holdes bevisst liten:

- Oversikt
- Rute
- Steder
- Mat
- Overnatting
- Før turen
- Praktisk
- Budsjett

Kilder og personvern ligger i bunnteksten.

## Datamodell

- `docs/data/trip.json` – rute, planleggingsdatoer, budsjett, oversiktskuratering og destinasjonstemaer/farger
- `docs/data/places.json` – komplett master for steder: tekst, kartposisjon, bilde/illustrasjon og eksterne lenker
- `docs/data/food.json` – kanonisk matdomene med restaurantliste, prisbånd, planleggingsnotater, prioritet, pris og kartposisjon
- `docs/data/hotels.json` – overnattingskandidater og overnattingsformer per base, med familieoppsett, logistikk, planpris og kartposisjon
- `docs/data/route-geometry.json` – fysisk rutegeometri og spor-offsets; ingen egne destinasjonsfarger
- `docs/data/prep.json` – spill, film, mat og familieoppgaver før turen
- `docs/data/guide.json` – bookingradar, praktiske råd, ordbok, etikette og mediekoblinger; stedsspesifikk info refereres med ID
- `docs/data/sources.json` – kilder

`docs/place.html?id=<id>` er generisk detaljside for steder, `docs/restaurant.html?id=<id>` for restauranter og `docs/hotel.html?id=<id>` for overnattingsalternativer. Nye steder og restauranter trenger derfor normalt bare dataendringer, ikke ny HTML.

## Prinsipper

- Bilder: `licensed` brukes for medier med dokumentert gjenbruksrett og synlig kreditering; `ai` brukes bare som tydelig merket illustrasjon lagret lokalt. Ikke anta at Google/Booking/Tripadvisor/offisielle nettsider kan kopieres.
- Destinasjonsfargen i `trip.json` gjenbrukes på rutelinjer, destinasjonskort, steder, opplevelser og mat i samme område.
- Ingen avledet `map-pois.json`: rutekartet bygges direkte fra masterdataene.
- Rute og booking lagrer referanser til steder, ikke kopier av stedets navn, koordinater eller lenker.
- Startsiden skal være visuelt attraktiv og gi lyst til å utforske.
- Detaljer skal ligge ett klikk ned, ikke fylle hovedoversikten.
- Versjon og sist oppdatert er brukerrelevant metadata og skal alltid vises i bunnteksten.
- Bruk offisielle lenker for billetter og praktisk informasjon der de finnes.
- Restaurantprioriteringer betyr **planprioritet for denne turen**, ikke en objektiv rangering av restaurantkvalitet.
- Bilder skal ha gjenbrukbar lisens og synlig kreditering.
- Fakta som kan endre seg skal ha kilde og konkret kontroll-dato; offentlig tekst skal ikke bruke relative formuleringer som «dagens regel».
- Ingen privat reiseinformasjon skal inn i repoet.
- Alle priser vises i både NOK og JPY via én felles kursfunksjon. Ved sidelasting hentes siste ECB-referansekurs; `fx.json` er bare dokumentert fallback. Budsjett er primært i NOK.

## Visningsarkitektur

HTML og JavaScript er et tynt visningslag over de kanoniske JSON-filene. Konkrete reisedetaljer og kuraterte lister skal ikke hardkodes i visningskoden.

- `trip.json.overview` eier budskapet på oversikten. Oversikten skal forklare hvorfor reisen og hvordan siden brukes, ikke gjengi innholdet fra alle undersidene.
- `food.json` er ett samlet matdomene med metadata + `restaurants`.
- `app.js` har små delte visningsprimitiver i stedet for side-spesifikke kopier av samme komponent.
- Steder, Mat og Overnatting bruker samme reise-/basefilter slik at innhold kan avgrenses etter del av reisen. Filtertilstanden kan åpnes via `?base=<routeId>`, og rutesiden bruker dette for navigasjon videre.
- Rutekartet bruker korte popup-kort til orientering. Panelet under kartet følger valgt objekt; detaljerte reisepriser vises bare når en rutelinje/etappe velges. Mobilkort for steder er kompakte rader med fast bildekolonne og gyldig HTML uten nested anchors. Mediekort bruker `entityMediaHtml()`; relaterte alternativer bruker `relatedEntityCardHtml()`.
- Endres et delt visuelt mønster, endres helperen/CSS-primitiven slik at alle tilsvarende visninger følger med.
- Offentlig tekst beskriver nåværende plan. Release-/endringshistorikk hører ikke hjemme i siden eller `site.json`.

## Release

Hver publisert endring på `main` skal ha ny versjon i `docs/data/site.json`. Alle HTML-sider skal bruke samme assetversjon, og flerfilendringer skal squash-merges slik at den publiserte releasen er atomisk.

## Oppdatere

Kjør `node scripts/check-public-content.mjs`, `node scripts/check-data-integrity.mjs`, `node scripts/check-content-style.mjs` og `node scripts/check-release-discipline.mjs` før publisering. GitHub Actions kjører de samme kontrollene automatisk.
