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

- `docs/data/trip.json`: reisevindu, hovedrute, budsjett, oversiktskuratering og destinasjonstemaer/farger. Destinasjonsfargen er én felles identitet for rute, steder, opplevelser og mat.
- `docs/data/places.json`: komplett master for steder: navn, tekst, kartposisjon, bilde/illustrasjon og eksterne lenker.
- `docs/data/food.json`: restauranter, priser, kartposisjoner, ratinger, lenker og bestillingsforslag, samt felles matmetadata som prisbånd og planleggingsnotater.
- `docs/data/hotels.json`: overnattingskandidater, overnattingsformer, basevalg, familieoppsett, planpriser, kilder og kartposisjoner.
- `docs/data/transport.json`: intercity-etapper, tider, priser og stasjoner.
- `docs/data/route-geometry.json`: kun fysisk rutegeometri og visuelle spor-offsets for parallelle/overlappende jernbanestrekninger. Farger skal ikke lagres her.
- `docs/data/guide.json`: praktiske råd, bookingradar, ord og mediekoblinger. Bookingradar refererer til `placeId`; den skal ikke kopiere navn, område eller lenker fra stedet.
- `docs/data/prep.json`: forberedelser før turen og deres kobling til steder via `placeIds`. Medie-/forberedelseskoblinger skal ikke dupliseres i `places.json` eller `guide.json`.
- `docs/data/fx.json`: live valutakilde + lagret ECB-fallback. Alle omregninger skal gå gjennom den felles `loadFx()`-funksjonen.
- `docs/data/sources.json`: felles kildeliste.

HTML og JavaScript er visninger av disse dataene. Ikke kopier domeneinformasjon inn i en ny fil bare fordi en ny visning trenger den. `trip.json` skal referere til steder med ID og ikke duplisere navn eller koordinater som eies av `places.json`.

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

## Ny chat eller konteksttap

En ny chat skal ikke rekonstruere prosjektet fra samtalehistorikk. Bruk denne korte startinstruksen:

> Arbeid videre i `MKarthum/japan-2027`. Hent siste `main`, les `START_HERE.md`, `AGENTS.md` og `PUBLIC_DATA_POLICY.md`, og behandle repoet som autoritativ state. Ikke bruk gammel chat som implementasjonsgrunnlag.

Hvis noe i en gammel chat avviker fra repoet, gjelder repoet.

## Visnings- og releasekontrakt

- Domeneinnhold ligger i JSON. HTML/JavaScript bestemmer struktur og hvordan felt vises, ikke konkrete reisedetaljer.
- Oversiktens budskap ligger i `trip.json.overview`. Oversikten skal være en inngang til reisen, ikke en katalog over rute, steder, mat og booking.
- Steder, Mat og Overnatting skal bruke samme destinasjons-/basefilter basert på `trip.json`, slik at Nara arver Kyoto, Miyajima arver Hiroshima osv. Filteret støtter `?base=<routeId>` for lenking mellom sider.
- Rutesiden skal lenke videre fra hvert stopp til relevant stoppdetalj, Steder, Mat og Overnatting. Kart-popupene skal være korte; full prisdetalj hører hjemme i panelet under kartet.
- Mobilvisningen av Steder skal følge den kompakte ruten: smalt bilde til venstre, tekst til høyre. Stor tom medieflate over bildet er en regresjon. Ikke pakk hele kortet i en `<a>` når bildekrediteringen også inneholder lenke.
- Rutedetaljpanelet under kartet skal vise det som faktisk ble valgt på kartet. Strekning/pris vises bare når en rutelinje eller etappe velges.
- Felles visuelle objekter gjenbruker delte renderere/CSS-klasser. Endre komponenten én gang fremfor å rette samme mønster side for side.
- Nettsiden skal leses som én aktuell utgave, ikke som en logg over tidligere utgaver.
- `site.json` inneholder kun versjon og publiseringsdato. Versjonen bumpes ved hver publisert endring på `main`.
- Releases til `main` skal være atomiske. Bruk arbeidsbranch og squash-merge når en endring berører flere filer.

## Før publisering

Kjør:

```bash
node scripts/check-public-content.mjs
node scripts/check-data-integrity.mjs
node scripts/check-content-style.mjs
node scripts/check-release-discipline.mjs
```

Alle tre skal passere. Hvis miljøet ikke kan kjøre Node, må tilsvarende validering gjøres eksplisitt før commit og begrensningen dokumenteres.

Ved brukersynlige endringer bumpes `docs/data/site.json`, og CSS/JS-assetversjonen i alle `docs/*.html` skal samsvare med den versjonen. Versjon og sist oppdatert skal være synlig i bunnteksten på alle sider.


## Bilder og medier

Dette er en offentlig side. Bruk bare bilder med dokumentert gjenbruksrett:

- foretrekk Wikimedia Commons-bilder med eksplisitt fri lisens, CC0/public domain eller prosjektets egne bilder;
- ikke kopier bilder fra Google Maps, Booking.com, Tripadvisor, Instagram, hotell-/restaurantnettsteder eller andre nettsider bare fordi de er offentlig synlige;
- «offisiell nettside» betyr ikke automatisk at bildet kan gjenbrukes;
- lisensierte bilder bruker `image.type: "licensed"` og skal ha kilde, kreditering, lisens og lisenslenke; AI-illustrasjoner bruker `image.type: "ai"`, lagres lokalt og merkes tydelig som AI-generert i UI-et;
- hvert sted skal som hovedregel ha et eget, representativt bilde. Ikke gjenbruk et områdebilde på et konkret museum/slott/helligdom bare som fallback.

Dersom gjenbruksretten er uklar, skal bildet ikke brukes.
