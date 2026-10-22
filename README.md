# Japan 2027

> Skal du videreutvikle repoet eller bruke en AI-agent? Start med `START_HERE.md`.

Offentlig planleggingsrepo for en mulig Japan-tur våren 2027. Nettsiden er en enkel, datadrevet GitHub Pages-side som skal være interessant å utforske for hele familien – uten å bli et tungt reiseplanleggingssystem.

> **Viktig:** Dette repoet er offentlig. Ikke legg inn private eller identifiserende opplysninger. Les `PUBLIC_DATA_POLICY.md` før du legger til eller endrer innhold.

## Nettside

GitHub Pages publiserer fra repoet, og rotens `index.html` sender videre til `/docs/`.

Hovednavigasjonen holdes bevisst liten:

- Oversikt
- Rute
- Dagidéer – geografisk logiske, uforpliktende kombinasjoner med lokale vurderingsvalg
- Steder
- Mat
- Overnatting
- Bli kjent med Japan: spill, film, bøker, historie og mat
- Språk og fraser: ordliste, uttale, stedsnavn\n- Planlegg reisen: transport/pass, billetter, flysøk, overnatting og budsjett\n- På reisen: praktiske råd og droneregler\n- Mine valg: lokale interesser med kobling til dagidéer
- Droner
- Budsjett

Kilder og personvern ligger i bunnteksten.

## Datamodell

- `docs/data/trip.json` – rute med nummererte reisedager, budsjett, oversiktskuratering, destinasjonstemaer/farger og prisscenarier
- `docs/data/flights.json` – fire klikkbare, illustrative flysøkoppsett, metodikk, datovariasjoner, knutepunkter, sammenligningssjekkliste og åpne søkekilder
- `docs/data/places.json` – komplett master for steder: tekst, kartposisjon, bilde/illustrasjon, eksterne lenker og inngangspris
- `docs/data/food.json` – kanonisk matdomene med restaurantliste, prisbånd, planleggingsnotater, prioritet, pris og kartposisjon
- `docs/data/hotels.json` – overnattingskandidater og overnattingsformer per base, med familieoppsett, logistikk, planpris og kartposisjon
- `docs/data/route-geometry.json` – fysisk rutegeometri og spor-offsets; ingen egne destinasjonsfarger
- `docs/data/prep.json` – spill, film/TV, bøker, historie, mat og små oppgaver før turen, med tydelig målgruppe
- `docs/data/guide.json` – bookingradar, praktiske råd og kanonisk ordbok (`placeWords` med `inline`, `aliases`, `meaning`, valgfri `showInGuide`); stedsspesifikk info refereres med ID
- `docs/assets/glossary.js` – én gjenbrukbar frontend-funksjon som understreker ord diskret og viser små klikkbare forklaringsbokser på mobil og desktop; ingen definisjoner hardkodes her
- `docs/data/passes.json` – kompakt beslutningslogg for togpass, aktivitets-/transportpass og kombipakker
- `docs/data/drones.json` – japanske droneregler, besøksforberedelser, modellvurdering og sjekklister for flyging
- `docs/data/pages.json` – sidebudskap og forklarende tekst for oversikts-/indekssider
- `docs/data/sources.json` – kilder

På `docs/places.html` grupperes attraksjonene under reisebasene i ruterekkefølge, og filteret viser samme gruppering for valgt base. Ingen subjektiv primær/sekundær-rangering. 

`docs/flights.html` er en integrert flysøkside med eksempler på hvordan søkene utføres, rutespesifikke lenker for hver strekning og ingen faktiske søkeresultater. Den er utformet slik at søkefunksjonaliteten på sikt kan gjenbrukes i en separat åpen guide, mens den personlige reiseplanleggeren eventuelt flyttes til en privat løsning. Ingen slik deling er gjennomført nå. `trip.json` beskriver ruten med dagnumre og antall netter, ikke bekreftede reisedatoer. `docs/place.html?id=<id>` er generisk detaljside for steder, `docs/restaurant.html?id=<id>` for restauranter og `docs/hotel.html?id=<id>` for overnattingsalternativer. `docs/prep-item.html?id=<id>` gir ekstra forklaring når et lite forberedelsesmål trenger mer plass, og `docs/phrases.html` viser den utvidede fraselisten med japanske tegn og uttale.

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
- Ingen privat reiseinformasjon skal inn i repoet. Ikke lagre faktiske flysøk, datohistorikk, flybestillinger, PNR, billettdata eller innloggede/brukerspesifikke lenker.
- Alle priser vises i både NOK og JPY via én felles kursfunksjon. Ved sidelasting hentes siste tilgjengelige ECB-referansekurs; ECB publiserer kun virkedager, så helger viser siste virkedag. `fx.json` er dokumentert fallback. Budsjett er primært i NOK.

## Pass og pakkeløsninger

Pass vurderes samlet under Transport og pass. Siden viser bare kandidatstatus, kort begrunnelse og når den bør sjekkes igjen. Detaljert katalogmatch ligger i `passes.json`, slik at vi kan huske vurderingen uten å gjøre hvert sted til et pass-regnestykke.

## Visningsarkitektur

- Prisscenarier styres av `trip.json.priceParties`: én standardfamilie (2+2) er default, og to-familiescenarioet (4+4) kan velges på alle prisrelevante sider. Standardfamiliepriser lagres én gang per domene og skaleres i visningen. Overnatting ved to familier er eksplisitt et sammenligningsanslag fordi større felles enheter kan endre økonomien.
- Alle steder har inngangspris eller eksplisitt «Gratis», med kilde og kontrolldato. Dynamiske priser må være tydelig dynamiske; ukjent 2027-pris skal ikke gjettes.

HTML og JavaScript er et tynt visningslag over de kanoniske JSON-filene. Konkrete reisedetaljer, kuraterte lister og sidebudskap skal ikke hardkodes i visningskoden. `pages.json` eier sidecopy som ikke hører til et spesifikt domene.

- `trip.json.overview` eier budskapet på oversikten. Oversikten skal forklare hvorfor reisen og hvordan siden brukes, ikke gjengi innholdet fra alle undersidene.
- `food.json` er ett samlet matdomene med metadata + `restaurants`.
- `app.js` har små delte visningsprimitiver i stedet for side-spesifikke kopier av samme komponent.
- Steder, Mat og Overnatting bruker samme reise-/basefilter slik at innhold kan avgrenses etter del av reisen. Steder vises i ruteorden, med lokale attraksjoner først og hver dagstur samlet under sin overnattingsbase. Filtertilstanden kan åpnes via `?base=<routeId>`, og rutesiden bruker dette for navigasjon videre.
- Rutekartet bruker minimale popup-kort (kategori + navn + detaljlenke). Panelet under kartet følger popupen som faktisk åpnes og eier beskrivelse, pris og kontekst; reisepriser vises når en rutelinje/etappe velges. Mobilkort for steder er kompakte rader med fast bildekolonne og gyldig HTML uten nested anchors. Mediekort bruker `entityMediaHtml()`; relaterte alternativer bruker `relatedEntityCardHtml()`.
- Endres et delt visuelt mønster, endres helperen/CSS-primitiven slik at alle tilsvarende visninger følger med. CSS skal konsolideres i én kanonisk regel per delt komponent, ikke bygges opp som versjonsvise override-lag.
- Offentlig tekst beskriver nåværende plan. Release-/endringshistorikk hører ikke hjemme i siden eller `site.json`.

## Release

Hver publisert endring på `main` skal ha ny versjon i `docs/data/site.json`. Alle HTML-sider skal bruke samme assetversjon, og flerfilendringer skal squash-merges slik at den publiserte releasen er atomisk.

## Oppdatere

Kjør `node scripts/check-public-content.mjs`, `node scripts/check-data-integrity.mjs`, `node scripts/check-content-style.mjs` og `node scripts/check-release-discipline.mjs` før publisering. GitHub Actions kjører de samme kontrollene automatisk.


## Nettlesertilstand og URL-kontrakt

Alle ordinære visninger laster docs/assets/state.js før øvrige klientskript.
Lagring, validering og synkronisering av filterparametre går gjennom JapanState.
- base og party: delbar URL og vedvarende nettleservalg, uavhengig av hverandre.
- topic (kun Steder) og type (kun Overnatting): URL og sidefilter, ingen tverrside-lagring.
- Kartlag, aktuelle/lagte-bort objekter og drone-sjekkliste: separate lokale nøkler, uten privat serverlagring. Eksisterende lagringsnøkler og migrering beholdes.
- id og fragment: side-/objektnavigasjon, ikke brukerpreferanse.
- Søk, modal, menyer og valgt kartmarkør: kortvarig state uten lagring.
- Eksplisitt gyldig URL har forrang. Endringer berører kun relevant parameter og bevarer andre.
- Dronepunkter har stabile id-er i drones.json (ikke indeksbaserte avkryssinger).

Test tilstand og URL-semantikk med node scripts/check-state-consistency.mjs i tillegg til de fire ordinære kontrollene.

## Merking og restaurantlenker (v0.30.14)

- `places.json[].topics` eier tematiske interesser; `places.json[].features` eier praktiske egenskaper (innendørs og sakura). Begge vises på kort og filtreres separat via `topic` og `feature`, uten å endre reisebase, prisscenario eller personlige valg.
- `planInterest` er redaksjonell interesse for Dagidéer, ikke et personlig valg. «Aktuell» og «Legg bort» skal virke direkte fra stedskort uten navigasjon gjennom strekte tittellenker.
- Menylenken vises bare når målet inneholder meny/retter. Ved felles menyside og nettsted brukes én samlet lenke. Foretrekk verifisert engelsk side fremfor japansk; generiske forside-lenker er ikke menylenker.

## Kartsymboler og tilgjengelighet (v0.30.16)

- Farge kommer fortsatt utelukkende fra reisebasen i `trip.json`; kategori vises med form og piktogram: stjerne = opplevelse, sekskant med bestikk = mat, hus = overnatting, diamant med tog = knutepunkt. Nummererte sirkler er reiserutens stopp; markør for gjeldende sted på detaljkart er et siktemerke.
- `docs/assets/map-shared.js` er eneste autoritet for kartsymbolene, knappetekstene og lagerte kartlagsvalg. Rutekartet og detaljkartet skal kalle de samme konstruktørene; stasjon med flere tilhørigheter må beholde flerfarget markør. Ikke innfør lokale, lignende ikoner i `app.js`.
- Markørknapper skal ha lesbare navn, omtrent 42 px trykkflate og tydelig valgt/fokusert tilstand; på mobil skal alle fire kategoriknappene være synlige uten horisontal scrolling. Kjør `node scripts/check-map-ux.mjs` ved kartendringer.

## Felles detaljkart og integrerte valghandlinger (v0.30.17)

- Sted, restaurant og hotell skal alle ha kart og samme kategorifiltre. Felles funksjon `renderDetailContextMap` i `docs/assets/map-shared.js` tar kanoniske `places.json`, `food.json`, `hotels.json` og `transport.json`, markerer valgt objekt med siktemerke og bruker samme ikoner, destinasjonsfarger, popup-lenker og lagrede kartlag. Ikke kopier kartlogikk per detaljside.
- Hotell- og restaurantoversikten må inneholde **ett grid-/listekort per objekt**. Kortet skal ha en egen intern `<a>` for navigasjon og `Min vurdering` som søskenelement **inni** samme `<article>`; legg aldri kontrollen som søsken direkte under gridet. Interaktive knapper må ikke plasseres inne i `<a>`. `choices.js` installerer kortets widget, og persisteringsnøkkelen beholdes.
- Tester: `node scripts/check-detail-views.mjs`, `node scripts/check-map-ux.mjs`, øvrige data- og state-tester. Kontroller mobil og desktop ved UI-endringer.

## Kart-hierarki og togstasjoner (v0.30.18)

- trip.json.route eier nummererte reisemål. Disse er mørke, nummererte og synlige ruteetiketter, ikke vanlige attraksjoner. Bybaser og dagsturområder skal ikke få generiske attraksjonsstjerner fra places.json på detaljkart.
- transport.json.stationRoles er eneste klassifisering av navngitte stasjoner: used (planlagt på/av/bytte, full diamant), alternative (mulig alternativt knutepunkt, mindre), intermediate (stasjon underveis, diskret). Ikke utled rolle tilfeldig fra antall forekomster. Klassene brukes også på detaljkart via mapStationRole.
- Rutesidens #journey-stops viser en utvidbar beskrivelse av registrerte stasjoner per etappe fra transport.json. Dette er ikke en komplett eller bekreftet stoppplan; vi vil ikke produsere fullstendige stoppmonstre for et tog for eksakt togavgang er valgt.
- Rutelinjene registreres med en felles klikkhandler som velger kun en etappe i detaljpanelet. Et klikk på en MapLibre-markor skal aldri samtidig velge linjer under markoren, eller lage en ekstra rutepopup.
- node scripts/check-route-hierarchy.mjs verifiserer klassifikasjonen, en linjeseleksjon og at stasjonslisten er tydelig merket som forelopig. Reisefarger og kartlagenes lagring forblir de samme.
