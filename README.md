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

## Kartskalering og markør for valgt objekt (v0.30.19)

- Det finnes akkurat to kartimplementasjoner: rutekartet i app.js og felles detaljkart i map-shared.js. Detaljkartet brukes av steder, restauranter og hoteller; ikke legg inn tredje eller fjerde MapLibre-konstruktør.
- Den nummererte reiseruten bruker kompakte, halvtransparente markører med beholdt trykkflate. Ved nasjonal kartzoom skjules navnelapper fram til valg / fokus; ved regional zoom vises flere detaljer. På mobil er de synlige rutetallene bare 24 px i oversikten. Dagsturmarkørene er enda mer diskrete. Bevar fargeringen rundt tallet og lesbarheten ved redusert transparens.
- Et valgt konkret objekt på detaljkartet **skal bruke samme kategorisymbol** (attraksjonsstjerne, matikon eller hotellsymbol) som de øvrige. Skill det ut med ring og teksten «Dette stedet». Ikke bruk eget siktemerkeikon. Hele byer og områder har fortsatt ingen vilkårlig sentrumspin.
- Sjekk `node scripts/check-map-ux.mjs`, `node scripts/check-route-hierarchy.mjs` og `node scripts/check-detail-views.mjs`.

## Glassuttrykk i kartet (v0.30.20)

- Kartmarkørene for mat, attraksjoner og hotell beholder hver sin distinkte silhuett og reisebasefarge. Et diskret halvtransparent baklag med lett bakgrunnsuskarphet gir glasspreg, men må ikke gjøre ikonene like. Togsymboler bruker lett transparens selv med flerfargede knutepunktmarkører.
- Den valgte attraksjonen, restauranten eller hotellet beholder sitt kategorisymbol og får en synlig ring. Tekstetiketten under ikonet skal vise **stedsnavnet** (HTML-sikret), aldri generisk «Dette stedet». Et langt navn kan forkortes visuelt på mobil, men fullt navn må fortsatt være tilgjengelig i tittel/tilgjengelighetsetikett.
- Kartets popup-bokser og navnelapper kan være forsiktig halvtransparente, med mørk fullt ugjennomsiktig tekst og tydelige kanter. Ved prefers-reduced-transparency eller prefers-contrast:more skal glasstransparens fjernes. Kontroller dette i scripts/check-map-ux.mjs. Ikke endre kartets tilstand eller lagring som ledd i ren stilendring.

## Glass direkte i kartsymboler (v0.30.21)

- Glassbehandlingen til opplevelser, restauranter og overnatting skal ligge **inne i symbolsilhuetten**, aldri i en ekstra firkant eller ramme bak. SVG-fyllingen skal være gjennomskinnelig, og CSS-clippath for bakgrunnsuskarphet utledes direkte fra samme SVG-bane i `map-shared.js` (én geometri-autoritet).
- Knutepunktenes eksisterende diamant er den eneste glassflaten for tog, og beholder destinasjonsfarger og flerfargede knutepunktmarkører. Reisestopp og tilhørende navnebokser beholder sitt nåværende diskrete glassuttrykk.
- Prioriter lesbarhet: tydelig hvit kontur, hvite piktogramstreker, lesbare bokstaver og fullt opake flater ved økt kontrast eller redusert transparens. Uten støtte for clip-path får man halvtransparent SVG, ikke en rektangulær reservebakgrunn.

## Kontrollerte kartetiketter og popup-dialog (v0.30.22)

- Detaljkart for steder, mat og hoteller bruker fortsatt én felles `renderDetailContextMap` i `map-shared.js`. Markørene er interaktive popup-utløsere, **ikke** direktelenker. Første trykk viser kategori/sted, en kort tekst utledet fra det kanoniske innholdet og en separat «Se detaljer»-lenke. Ingen navigasjon uten eksplisitt lenkeklikk.
- Det valgte objektets navn (`map-current-label`) er alltid synlig med kategorisymbol og ring; det må aldri fjernes av kollisjonslogikken. Øvrige `map-poi-name` tegnes gradvis ved zoom (opplevelser før mat før overnatting), med plasskontroll mot andre markører og etiketter, og maksimalt 5 på små kartflater / 10 på større. Ved åpnet popup er navnet til akkurat dette objektet eneste kandidat til ekstra etikett.
- Ingen stasjonsnavn som permanente kartetiketter på dette nivået. Stasjonene beholder rollehierarkiet og kan åpnes i popup som før. Alle etiketter er passive (`pointer-events:none`), slik at de ikke skjuler egne trykkbare symboler eller navigerer utilsiktet.
- Ny test `node scripts/check-map-labels.mjs` verifiserer prioritet, valgte etiketter, kollisjon, terskler, kortfattet popup-tekst, sikker escaping og skillet mellom karttrykk og navigasjon. En ny kartimplementasjon må ikke innføres.

## Felles kartetiketter på rute- og detaljkart (v0.30.23)

- `createMapLabelController` i `docs/assets/map-shared.js` er **eneste motor** for kartetiketter, kollisjoner, zoomstyring og prioritet. Rutekartet og detaljkartene registrerer semantiske typer i den samme motoren. Ikke lag egne tilsvarende løkker i `app.js`.
- `JAPAN_MAP_LABEL_POLICY` er sentral konfigurasjon for zoomgrenser og typeprioritet. `mapRouteStopElement` beholder nummererte reisestopp og et mer diskret dagstursymbol, mens `.map-object-label` gir alle typer samme glassetikett **under** markøren.
- Valgt objekt viser alltid navnet uavhengig av zoom eller kollisjoner. Andre etiketter fordeles etter type, interesserangering og tilgjengelig plass, med en begrensning på 5 ved smalt kart / 10 ved større kart. Skjulte kartlag skal ikke blokkere etiketter. Alle markørtyper, inkludert togstasjoner, kan vises på rutekartet; detaljkartene beholder den tidligere beslutningen om ingen permanente stasjonsnavn.
- Markøren åpner først popup og, på rutekartet, tilhørende detaljpanel. Navigasjon krever eksplisitt lenkeklikk. Støtte for redusert transparens, høy kontrast og redusert animasjon beholdes. Kjør `node scripts/check-map-labels.mjs`, `node scripts/check-map-ux.mjs`, `node scripts/check-route-hierarchy.mjs`.

## Kart som faktisk er gjennomsiktige (v0.30.25)

- Fargen i opplevelses-, mat- og overnattingssymboler bruker nå SVG `fill-opacity` (standard 0,48, via `--map-symbol-alpha`). Dette viser kartet gjennom selve formen også i nettlesere uten støtte for `color-mix`; hvite konturer og piktogrammer forblir tydelige.
- Det valgte objektet får fortsatt en tydelig ring, men den tidligere hvite sirkelflaten på 53 % er redusert til 8 %. Bakgrunnsuskarphet inne i symboler er maks 1 px, slik at gater og bygg ikke viskes ut. Glassrefleksen er også vesentlig svakere.
- Rutestopp, dagsturer og togstasjoner har tilsvarende gjennomskinnelige flater. Navnelapper beholder opak tekst over en mer gjennomsiktig flate. Bruk aldri `opacity` på hele markøren for å oppnå effekten, da forsvinner også symbolkontur og tekst.
- Ved `prefers-reduced-transparency` eller `prefers-contrast:more` brukes opake flater, ikke glass. Foreldede `.map-place-label`-regler er fjernet. `node scripts/check-map-ux.mjs` og `node scripts/check-route-hierarchy.mjs` verifiserer de sentrale garantiene.

## Karttilpasning for mobil og nasjonal oversikt (v0.30.26)

- Felles `JAPAN_MAP_MARKER_MIN_ZOOM` styrer **når selve symbolene** vises, ikke bare navnelappene. På landsnivå viser rutekartet først og fremst nummererte reisestopp og ruten; regionale og lokale objekter kommer gradvis inn ved zoom. På detaljkartene gjelder tilsvarende kontekstuell reduksjon. Et valgt objekt forblir synlig. Kartlagenes lagrede av/på-valg bevares.
- `createMapRouteStopClusters` grupperer automatisk nummererte stopp som overlapper i skjermkoordinater, blant annet på smale skjermer. Grupper viser stoppnumrene og zoomer inn ved trykk. Grupperingen er basert på avstand i piksler og gjøres om ved zoom og vindusstørrelse; ingen byer får hardkodede unntak, og faktiske koordinater flyttes ikke.
- Kartene har én felles kontroll for større/mindre kart. På mobil er ruteoversikten lavere og mer proporsjonal med bredden, med mulighet til å utvide for utforsking. Kartinnstillinger og lengre forklaringer på rutesiden er tilgjengelige i egne disclosure-seksjoner. Posisjonsdeling startes kun etter at brukeren trykker «Min posisjon».
- Sjekk `scripts/check-map-labels.mjs`, `scripts/check-map-ux.mjs`, `scripts/check-route-hierarchy.mjs` og alle øvrige CI-kontroller. Ikke innfør en separat klynge-, zoom- eller kartimplementasjon for enkeltsteder.

## Integrasjonssjekk for rutekart (v0.30.27)

- Sikrer at `renderRoute` faktisk kaller den felles grupperingen av rutestopp og kontrollen for større kart. Tester skal sjekke at modulen er **koblet til runtime**, ikke bare finnes i kildekoden.
- Mobiltilpasset utsnitt og kartstørrelse aktiveres fra rutekartet, og automatisk posisjonsovervåking starter ikke når kartet åpnes.
