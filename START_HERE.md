# Start her

Dette dokumentet er inngangen for mennesker og AI-er som skal videreutvikle Japan 2027.

## Rehydreringsrekkefølge

Ved hver ny arbeidsøkt, etter konteksttap eller når arbeidet flyttes til en annen AI:

1. Hent siste `main`. Repoets nåværende innhold er autoritet.
2. Les `START_HERE.md`, `AGENTS.md` og `PUBLIC_DATA_POLICY.md`.
3. Les `README.md` for arkitektur og filansvar.
4. Les `docs/data/site.json` for gjeldende publisert versjon.
5. Åpne de kanoniske datafilene som er relevante for oppgaven.
6. Sjekk eksisterende data før nye poster opprettes. Ikke rekonstruer state fra en tidligere chat.
7. Etter endringer: kjør alle kontroller i «Før publisering» nedenfor.

Tidligere samtaler, sammendrag og modellminne kan brukes som spor til hva man skal undersøke, men skal aldri overstyre siste `main`.

## Kanoniske dataeiere

- `docs/data/trip.json`: reisevindu, hovedrute, budsjett og destinasjonstemaer/farger. Destinasjonsfargen er én felles identitet for rute, steder, opplevelser og mat.
- `docs/data/places.json`: steder, forklaringer og kartposisjoner.
- `docs/data/food.json`: restauranter, priser, kartposisjoner, ratinger, lenker og bestillingsforslag.
- `docs/data/hotels.json`: hotellkandidater, basevalg, familieoppsett, planpriser, kilder og kartposisjoner.
- `docs/data/transport.json`: intercity-etapper, tider, priser og stasjoner.
- `docs/data/route-geometry.json`: kun fysisk rutegeometri og visuelle spor-offsets for parallelle/overlappende jernbanestrekninger. Farger skal ikke lagres her.
- `docs/data/guide.json`: praktiske råd, bookingradar, bilder for steder, ord og mediekoblinger.
- `docs/data/prep.json`: forberedelser før turen.
- `docs/data/fx.json`: felles planleggingskurs.
- `docs/data/sources.json`: felles kildeliste.

HTML og JavaScript er visninger av disse dataene. Ikke kopier domeneinformasjon inn i en ny fil bare fordi en ny visning trenger den.

## Innholdskontrakt

Offentlig tekst skal kunne leses av en person som aldri har sett repoet eller en tidligere samtale.

- Skriv tidløst og selvstendig.
- Beskriv nåværende plan, ikke endringshistorikk.
- Unngå formuleringer som «ny kandidat», «nedgradert», «beholdes», «vi la til» og «tidligere».
- Ikke forklar JSON, cache, arkitektur, commits eller andre implementasjonsdetaljer i den offentlige nettsiden.
- Fakta som kan endres skal ha kontroll-dato i data. Bruk konkret dato fremfor «dagens regel».
- Ikke vis tomme felter eller «ikke kontrollert». Skjul et felt som ikke er dokumentert, eller hold posten utenfor aktiv liste til research er komplett.
- Ratinger skal ha plattform, score, plattformlenke og `checked`-dato. Antall anmeldelser lagres når det er tilgjengelig.
- Bilder må ha dokumentert gjenbruksrett, kreditering og lisens.
- Prioritetsord er reiseprioriteringer for denne planen, ikke objektive kvalitetsdommer.

## Før publisering

Kjør:

```bash
node scripts/check-public-content.mjs
node scripts/check-data-integrity.mjs
node scripts/check-content-style.mjs
```

Alle tre skal passere. Hvis miljøet ikke kan kjøre Node, må tilsvarende validering gjøres eksplisitt før commit og begrensningen dokumenteres.

Ved brukersynlige endringer bumpes `docs/data/site.json`, og CSS/JS-assetversjonen i alle `docs/*.html` skal samsvare med den versjonen.


## Bilder og medier

Dette er en offentlig side. Bruk bare bilder med dokumentert gjenbruksrett:

- foretrekk Wikimedia Commons-bilder med eksplisitt fri lisens, CC0/public domain eller prosjektets egne bilder;
- ikke kopier bilder fra Google Maps, Booking.com, Tripadvisor, Instagram, hotell-/restaurantnettsteder eller andre nettsider bare fordi de er offentlig synlige;
- «offisiell nettside» betyr ikke automatisk at bildet kan gjenbrukes;
- hvert bilde skal ha kilde, kreditering, lisens og lisenslenke i dataene, og krediteringen skal vises i UI-et der bildet brukes;
- hvert sted skal som hovedregel ha et eget, representativt bilde. Ikke gjenbruk et områdebilde på et konkret museum/slott/helligdom bare som fallback.

Dersom gjenbruksretten er uklar, skal bildet ikke brukes.
