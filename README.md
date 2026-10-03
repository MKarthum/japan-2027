# Japan 2027

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

- `docs/data/trip.json` – rute, foreløpige datoer og arbeidsbudsjett
- `docs/data/places.json` – kanoniske steder, forklaringer og kartposisjon
- `docs/data/food.json` – kanonisk restaurant-/matliste med prioritet, pris og kartposisjon
- `docs/data/prep.json` – spill, film, mat og familieoppgaver før turen
- `docs/data/guide.json` – bilder, eksterne lenker, bookingradar, transport, ordbok, etikette og mediekoblinger
- `docs/data/sources.json` – kilder

`docs/place.html?id=<id>` er generisk detaljside for steder, slik at nye steder normalt ikke trenger ny HTML.

## Prinsipper

- Ingen avledet `map-pois.json`: rutekartet bygges direkte fra `places.json` og `food.json`, slik at detaljendringer slår gjennom overalt.
- Startsiden skal være visuelt attraktiv og gi lyst til å utforske.
- Detaljer skal ligge ett klikk ned, ikke fylle hovedoversikten.
- Bruk offisielle lenker for billetter og praktisk informasjon der de finnes.
- Restaurantprioriteringer betyr **planprioritet for denne turen**, ikke en objektiv rangering av restaurantkvalitet.
- Bilder skal ha gjenbrukbar lisens og synlig kreditering.
- Fakta som kan endre seg skal ha kilde og formuleres som dagens regel/arbeidshypotese.
- Ingen privat reiseinformasjon skal inn i repoet.
- Alle priser vises i både NOK og JPY via en felles, datert planleggingskurs.

## Oppdatere

Kjør `node scripts/check-public-content.mjs` og `node scripts/check-data-integrity.mjs` før publisering. Den automatiske GitHub Actions-kontrollen er et ekstra sikkerhetsnett, ikke en runtime-avhengighet.
