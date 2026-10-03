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
- Før turen
- Praktisk
- Budsjett

Kilder og personvern ligger i bunnteksten.

## Datamodell

- `docs/data/trip.json` – rute, planleggingsdatoer, budsjett og destinasjonstemaer/farger
- `docs/data/places.json` – komplett master for steder: tekst, kartposisjon, bilde/illustrasjon og eksterne lenker
- `docs/data/food.json` – kanonisk restaurant-/matliste med prioritet, pris og kartposisjon
- `docs/data/hotels.json` – hotellkandidater per base med familieoppsett, logistikk, planpris og kartposisjon
- `docs/data/route-geometry.json` – fysisk rutegeometri og spor-offsets; ingen egne destinasjonsfarger
- `docs/data/prep.json` – spill, film, mat og familieoppgaver før turen
- `docs/data/guide.json` – bookingradar, praktiske råd, ordbok, etikette og mediekoblinger; stedsspesifikk info refereres med ID
- `docs/data/sources.json` – kilder

`docs/place.html?id=<id>` er generisk detaljside for steder, `docs/restaurant.html?id=<id>` for restauranter og `docs/hotel.html?id=<id>` for hotellalternativer. Nye steder og restauranter trenger derfor normalt bare dataendringer, ikke ny HTML.

## Prinsipper

- Bilder: `licensed` brukes for medier med dokumentert gjenbruksrett og synlig kreditering; `ai` brukes bare som tydelig merket illustrasjon lagret lokalt. Ikke anta at Google/Booking/Tripadvisor/offisielle nettsider kan kopieres.
- Destinasjonsfargen i `trip.json` gjenbrukes på rutelinjer, destinasjonskort, steder, opplevelser og mat i samme område.
- Ingen avledet `map-pois.json`: rutekartet bygges direkte fra masterdataene.
- Rute og booking lagrer referanser til steder, ikke kopier av stedets navn, koordinater eller lenker.
- Startsiden skal være visuelt attraktiv og gi lyst til å utforske.
- Detaljer skal ligge ett klikk ned, ikke fylle hovedoversikten.
- Bruk offisielle lenker for billetter og praktisk informasjon der de finnes.
- Restaurantprioriteringer betyr **planprioritet for denne turen**, ikke en objektiv rangering av restaurantkvalitet.
- Bilder skal ha gjenbrukbar lisens og synlig kreditering.
- Fakta som kan endre seg skal ha kilde og konkret kontroll-dato; offentlig tekst skal ikke bruke relative formuleringer som «dagens regel».
- Ingen privat reiseinformasjon skal inn i repoet.
- Alle priser vises i både NOK og JPY via en felles, datert planleggingskurs.

## Oppdatere

Kjør `node scripts/check-public-content.mjs`, `node scripts/check-data-integrity.mjs` og `node scripts/check-content-style.mjs` før publisering. GitHub Actions kjører de samme kontrollene automatisk.
