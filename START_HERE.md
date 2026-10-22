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


**Felles reisebasefilter:** Valg av Tokyo, Kyoto, Hiroshima eller annen reisebase på Steder, Mat, Overnatting eller Dagidéer skal følge brukeren mellom disse fire oversiktene. Én datadrevet state i nettleserens `localStorage` (`japan-2027-selected-base-v1`) eier siste aktive base. `?base=<routeId>` overstyrer lagret state og blir nytt aktivt valg; eksplisitt «Alle» lagres også. Dersom en kategori ikke har noe for valgt base (f.eks. et rent dagsstopp uten overnatting), viser akkurat den oversikten «Alle», uten å overskrive det lagrede valget. Emnefilter, hotelltype, kartlag, prisgruppe og personlig interesse er egne dimensjoner og må **ikke** koples til eller nullstilles av basefilteret.

## Kontrakt for state og navigasjon (v0.30.13)

- assets/state.js er eneste autoritet for lagring/URL-synkronisering og lastes før app.js/map-shared.js/choices.js. Ikke opprett nye ad-hoc-nøkler eller egen URL-filterlogikk per side.
- URL viser delbar kontekst: id for detaljside, base for felles reisebase på Steder/Mat/Overnatting/Dagidéer, party for prisgruppe, topic bare på Steder, type bare på Overnatting. Endring oppdaterer kun sitt parameter, bevarer øvrige parametre og fragmenter. Gyldig URL-valg har forrang over lagret valg; ugyldige URL-verdier ignoreres; Alle fjerner kun sitt parameter.
- Varig lokal state: base og party lagres på tvers av relevante sider. Kartlag, interessevalg og drone-sjekkliste har separate lagringsnøkler. Tema og hotelltype er URL-/side-spesifikke og lagres ikke på tvers. Drone-sjekkliste bruker stabile id-er og migrerer tidligere indeksbasert lagring én gang. Lagret kart-/interessevalg beholdes.
- Meny, søkedialog/-tekst, aktivt kartobjekt, aktive galleri-/mediakontroller og andre flyktige UI-valg er ikke persistente. Å åpne detaljside endrer ikke valgt base. Lokasjon lagres aldri.
- Kjør fire etablerte QA-script, check-state-consistency.mjs og navigasjonstest av kombinasjonene base/party/topic/type, lagret kart/valg og drone-migrering.

## Fast informasjonsarkitektur, kart og lokal tilstand (v0.30.11)

- Meny og navigasjonsgrupper eies av `docs/data/pages.json` under `navigation.sections`. Seks innganger: Oversikt, Rute, Opplevelser, Planlegg reisen, Bli kjent med Japan, På reisen. Bruk klikkbare navigasjonsstier og mobilmeny; ikke gjeninnfør flat sideveis skrollbar meny.
- Innhold: `prep.html` viser film, spill, serier, bøker, historie og mat; `language.html` viser fraser, ordliste og stedsnavn; `transport-guide.html` viser transport/pass; `tickets.html` viser billettvinduer; `practical.html` viser hjelp på reisen. JSON-filene er fortsatt én autoritativ kilde per domene.
- ALLE kartfestede objekter i steder, mat og overnatting skal være tilgjengelige på ALLE kart. Verken avstand, zoom eller `showOnRouteMap` skal fjerne dem fra datasettet. Kartutsnittet avgjør bare hva man ser. Manglende koordinater må ikke gjettetildeles; områdepunkter er orientering, ikke eksakte besøksadresser.
- Opplevelser, Mat, Overnatting og Knutepunkter starter alle som aktive. Samme kategorilag gjelder på rute- og detaljkart, og lagres i nettleseren under `japan-2027-map-layers-v1` via `docs/assets/map-shared.js`. Samme ikoner, markørfarger og kompakte popup skal brukes. Popup for steder/restauranter/hoteller/rutestopp skal ha DIREKTE lenke til respektive side. Reiseetapper/stasjoner skal ha presis lenke til oppdatert detaljfelt under rutekartet.
- Brukerens `Aktuell/Legg bort` lagres utelukkende lokalt under `japan-2027-choices-v2`, med migrering av tidligere dagidévalg. `docs/assets/choices.js` er felles implementasjon for steder, restauranter, hoteller og dagidéer. Ingen brukeridentitet, serverlagring eller synkronisering. `my-choices.html` oppsummerer, uten å låse kalenderdager eller bestillinger.
- `places.json[].topics` eier tematiske emneknagger, som brukes i filtrering og søk. Kart gir geografisk kontekst; `day-ideas.json` gir kuraterte forslag om hva som passer sammen. De skal lenkes, men ikke blandes sammen eller gjøre automatiske bookingvalg.
- Søk på tvers skal bruke åpne, kanoniske JSON-data i nettleseren, uten backend. Nye endringer må valideres med de fire eksisterende QA-testene, samt nettlesertest av mobil, navigasjon, valg og kartlag.

## Språklig tilgjengelighet

Skriv slik at både barn og voksne uten Japan-kunnskap forstår innholdet. Forklar japanske faguttrykk gjennom den **felles klikkbare ordlisten** fremfor gjentatte parentesforklaringer. `docs/data/guide.json` → `placeWords` er autoritativ kilde: term, meaning, valgfri japanese, aliases, og `inline:true` for ord som skal ha stiplet understrek. `showInGuide:false` holder avanserte ord utenfor den kuraterte ordlisten under Språk og fraser. `docs/assets/glossary.js` er kun én delt visningskomponent (mobil, tastatur, popup, dynamiske sider). Bruk japanske ord naturlig; ikke aktiver for alle stedsnavn eller ordinære ord.

**Gjeldende UX-regel – gjenbrukbare forklaringer:** Når et ord, faguttrykk eller en forkortelse krever en kort forklaring, legg definisjonen i autoritativ JSON-ordliste og gjenbruk stiplet-understreket klikk/tapp-komponent der det passer. Ikke gjenta definisjonen i hver tekst. Ikke fjern det opprinnelige oppslagsordet fra tittel, undertittel eller beskrivelse når forklaringen flyttes til popup. For dynamiske og særskilte visninger (f.eks. `#simple.kicker` på detaljsider), bruk `data-glossary-text` slik at ordet er interaktivt også der. Bekreft faktisk synlig og klikkbar forekomst på både oversikt og detaljside; syntax-/data-QA alene er ikke nok.

**Faglig kvalitetskontrakt for oppslagsord:** Popovertekst i `docs/data/guide.json.placeWords[].meaning` skal gi en forståelig og **selvstendig** forklaring på ordet, uten kjennskap til andre japanske uttrykk. Første setning forteller konkret hva det er; en ekstra setning forklarer funksjon, særtrekk eller bruk når det trengs. Eksempler kan illustrere, men aldri erstatte definisjonen. Marker relevante, faktisk brukte uttrykk selektivt; hele kultur- og faguttrykk er bedre enn løse ordfragmenter. Ved gjennomgang, kontroller alle oppslag og om nye begreper har dukket opp i tekstdata. Sjekk spesielt at ingen «forklaring av forklaringen» er nødvendig. Test både mobil-popup og reell lesbarhet, ikke bare grønn CI.

## Kanoniske dataeiere

- `docs/data/trip.json`: reiselengde og nummererte reisedager, hovedrute, budsjett, oversiktskuratering, destinasjonstemaer/farger og `priceParties`. Standard prisvisning er én familie (2 voksne + 2 barn); to-familiescenarioet er 4 + 4.
- `docs/data/flights.json`: fire illustrative og konkrete søkeoppsett, trinnvis søkemetode, datofleksibilitet, knutepunktvurderinger, sammenligningskriterier og åpne kilder. Aldri faktiske historiske søk eller private flydata.
- `docs/data/day-ideas.json`: fleksible kombinasjoner per reisebase, med kjerne-/tilleggssteder som kun refererer til ID-er fra `places.json`. Ikke kalender, datoer eller faktisk bookingstatus.
- `docs/data/places.json`: komplett master for steder: navn, tekst, kartposisjon, bilde/illustrasjon, eksterne lenker og inngangspris. Hvert sted skal ha eksplisitt `price`, også når prisen er «Gratis».
- `docs/data/food.json`: restauranter, priser, kartposisjoner, ratinger, lenker og bestillingsforslag, samt felles matmetadata som prisbånd og planleggingsnotater.
- `docs/data/hotels.json`: overnattingskandidater, overnattingsformer, basevalg, familieoppsett, planpriser, kilder og kartposisjoner. `onsenOptions` i samme fil eier åpne onsenalternativer for Hakone, inkludert én separat badedag uten overnatting; eksisterende hotellnavn hentes fra `hotelId`. De samme dataene vises både i Hakones stedsdetalj og under Overnatting, og lenkes fra Dagidéer. Ikke opprett dubletter som egne `places.json`-steder bare for ny visning.
- `docs/data/transport.json`: intercity-etapper, tider, priser og stasjoner.
- `docs/data/route-geometry.json`: kun fysisk rutegeometri og visuelle spor-offsets for parallelle/overlappende jernbanestrekninger. Farger skal ikke lagres her.
- `docs/data/guide.json`: praktiske råd, bookingradar, ord og mediekoblinger. Bookingradar refererer til `placeId`; den skal ikke kopiere navn, område eller lenker fra stedet.
- `docs/data/prep.json`: forberedelser før turen og deres kobling til steder via `placeIds`. Inneholder familieinnhold, tydelig merket vokseninnhold og en egen historie-læringssti. Medie-/forberedelseskoblinger skal ikke dupliseres i `places.json` eller `guide.json`.
- `docs/data/fx.json`: siste tilgjengelige ECB-kurs via nettendepunkt + lagret fallback. ECB oppdaterer kun virkedager; helgedato fra siste virkedag er forventet. Alle omregninger går gjennom `loadFx()`.
- `docs/data/passes.json`: kandidater for togpass, aktivitets-/transportpass og kombipakker. Synlig side viser bare kort status og når de bør vurderes; detaljert match mot planen ligger i samme datafil for senere re-evaluering.
- `docs/data/drones.json`: offisielt kontrollert droneguide for Japan, med modeller, regulering, turistkrav og område-/flysjekk. Registrerings-ID, serienummer og personopplysninger skal ikke publiseres.
- `docs/data/pages.json`: offentlig sidebudskap og forklarende tekst som ikke tilhører et konkret domene. HTML peker på feltene med `data-copy`.
- `docs/data/sources.json`: felles kildeliste.

HTML og JavaScript er visninger av disse dataene. Sidebudskap skal også ligge i `pages.json`; HTML skal hovedsakelig beskrive struktur. Ikke kopier domeneinformasjon inn i en ny fil bare fordi en ny visning trenger den. `trip.json` skal referere til steder med ID og ikke duplisere navn eller koordinater som eies av `places.json`.

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
- Et kuratert sted, måltid eller overnattingsvalg skal kort forklare hva det er, hvorfor det er med i denne reisen og hva som skiller det fra nærliggende alternativer. Unngå både Wikipedia-dybde og énlinjers tekst som forutsetter Japan-kunnskap.
- Japanske fagord og reiseuttrykk skal forklares ved første naturlige anledning når en vanlig førstegangsreisende ikke kan forventes å kjenne dem.

## Ny chat eller konteksttap

En ny chat skal ikke rekonstruere prosjektet fra samtalehistorikk. Bruk denne korte startinstruksen:

> Arbeid videre i `MKarthum/japan-2027`. Hent siste `main`, les `START_HERE.md`, `AGENTS.md` og `PUBLIC_DATA_POLICY.md`, og behandle repoet som autoritativ state. Ikke bruk gammel chat som implementasjonsgrunnlag.

Hvis noe i en gammel chat avviker fra repoet, gjelder repoet.

## Visnings- og releasekontrakt

- Domeneinnhold ligger i JSON. HTML/JavaScript bestemmer struktur og hvordan felt vises, ikke konkrete reisedetaljer.
- Oversiktens budskap ligger i `trip.json.overview`. Oversikten skal være en inngang til reisen, ikke en katalog over rute, steder, mat og booking.
- Steder, Mat og Overnatting skal bruke samme destinasjons-/basefilter basert på `trip.json`, slik at Nara arver Kyoto, Miyajima arver Hiroshima osv. På Steder skal hver by/base med aktiviteter og eventuelle dagsturer ligge innenfor én diskret destinasjonsramme med lett farget bakgrunn, subtil border og tydelig mellomrom til neste by. Unngå flere kraftige rammer inni rammen. På Steder skal «Alle» gruppere etter reiserutens faktiske stopp. Vis baseområdets attraksjoner først, alfabetisk, og samle deretter hver dagstur fra `trip.dayTrips` i en egen undergruppe under riktig base. En dagsturs attraksjoner skal stå sammen, også når navnene ellers ville blitt flettet inn i hovedlisten (f.eks. Nara og Tōdai-ji, Miyajima og Itsukushima). Ikke bruk primær-/sekundær-/viktighetsrangering for de kuraterte stedene. Baseoversikten skal være lett å finne: Gjør hele destinasjonsoverskriften (inkludert stedsnavnet) til én stor, tastaturtilgjengelig lenke til `place.html?id=<baseId>`, og vis en tydelig «Les om [sted]»-handling rett under navnet. Ikke plasser en liten, frittstående «Om [sted]»-knapp langt til høyre. Baser uten attraksjoner skal fortsatt ha en synlig oppføring. Filteret støtter `?base=<routeId>` for lenking mellom sider.
- Rutesiden skal lenke videre fra hvert stopp til relevant stoppdetalj, Steder, Mat og Overnatting. Kart-popupene skal være korte; full prisdetalj hører hjemme i panelet under kartet.
- Mobilvisningen av Steder skal følge den kompakte ruten: smalt bilde til venstre, tekst til høyre. Stor tom medieflate over bildet er en regresjon. Ikke pakk hele kortet i en `<a>` når bildekrediteringen også inneholder lenke.
- Rutedetaljpanelet under kartet skal vise det som faktisk ble valgt på kartet. Synkroniseringen følger popupens `open`-hendelse. Popupen på selve kartet holdes bevisst kort (kategori + navn + detaljlenke); beskrivelse, pris og navigasjon ligger i panelet under. Strekning/pris vises bare når en rutelinje eller etappe velges.
- Kartfeil skal behandles som fatal bare når kartstilen faktisk ikke blir lastet. Enkeltfeil på fliser/ressurser skal logges, men ikke utløse synlig fallback dersom kartet ellers er brukbart.
- Felles visuelle objekter gjenbruker delte renderere/CSS-klasser. Endre komponenten én gang fremfor å rette samme mønster side for side. Ikke behold eldre CSS-varianter av samme komponent som overlappende override-lag.
- Nettsiden skal leses som én aktuell utgave, ikke som en logg over tidligere utgaver.
- `site.json` inneholder kun versjon og publiseringsdato. Versjonen bumpes ved hver publisert endring på `main`.
- Releases til `main` skal være atomiske. Bruk arbeidsbranch og squash-merge når en endring berører flere filer.

## Pris- og læringsmodell per v0.20

- Standard prisgruppe: én familie, 2 voksne + 2 barn. Dette er default ved førstegangsvisning.
- Alternativt scenario: to familier, 4 voksne + 4 barn. Velges med prisvelgeren og kan åpnes som `?party=two-families`; nettleseren husker valget lokalt.
- Familie nummer to har foreløpig samme prisprofil som standardfamilien. Dette er et plananslag som skal kunne justeres når billettkategoriene er kjent.
- JR-prising teller ikke alle «barn» som barnebillett: voksenpris gjelder normalt fra 12 år. Standardfamilien har derfor en separat `railFareMix` uten at eksakte aldre publiseres.
- Overnatting skalert til to familier er kun sammenligningsgrunnlag. Egen feriebolig, stor leilighet eller annen felles løsning kan bli billigere enn to identiske familieenheter.
- Alle steder har et `price`-objekt med status, kontroll-dato og kilde. Gratis steder vises eksplisitt som gratis; dynamiske priser vises som intervall/fra-pris eller avventer salgsdato.
- «Bli kjent med Japan» skal ikke være en barneliste eller en Assassin’s Creed-liste. Den har egne voksenforslag og historie, og skal gi flere innganger til Japan: historie, hverdagsliv, litteratur, film/TV, spill, mat og språk.
- Historieløypa dekker minst Sengoku/samlingen av Japan, Meiji/modernisering, andre verdenskrig/Hiroshima og etterkrigstid/popkultur.
- Film og TV i `prep.json` skal ha IMDb-lenke og en aktuell norsk strømme-/visningstjeneste med kontrolldato. For dokumentert norsk arkiv-TV som ikke finnes på IMDb, kan `archive: true` brukes sammen med en separat `reference`-lenke til en stabil katalog-/arkivside. Strømmelenken skal være tjenestens kanoniske, direkte HTTPS-innholdsside og åpnes eksternt slik at Japan-siden blir liggende. Ikke bruk custom-scheme, automatisk fallback, app-/delingsparametre eller konto-/brukerparametre. La operativsystemets universal links avgjøre eventuell appåpning. Matforberedelser skal ha oppskriftslenke. «Små mål» skal ha nok detalj til at oppgaven kan gjennomføres uten forkunnskap.
- Målgruppe i `prep.json` er strukturert som `audience.id`, `audience.label` og valgfri `audience.note`. Bruk de fire nivåene `family`, `older-kids`, `teens` og `adults`. Innholdsadvarsel eller konkret aldersmerking er en separat merknad, ikke en del av selve målgruppen.
- Språkvisningen skal vise romanisering og japanske tegn sammen. Uttaleknappen bruker nettleserens japanske tekst-til-tale-stemme; den utvidede fraselisten ligger på `phrases.html`.

## Reisedager og åpen flysøksguide

- Offentlig rute i `trip.json` bruker heltall for `from` og `to`: dag 1–15 for 14 overnattinger. `nights = to - from`; dagsturer bruker `suggestedDay` innenfor vertsstoppets reisedager.
- Den offentlige reiseplanen skal ikke lagre kjøpte flyselskaper, eksakte fly-/ankomstdatoer, klokkeslett eller bookingopplysninger; heller ikke rekonstruere dem fra samtalehistorikken.
- `docs/flights.html` er en integrert, interaktiv flysøkside i reiseplanleggeren. Vis fire klikkbare søkeoppsett med konkret fremgangsmåte, søkematrise, alternativer og sjekkliste. Hvert oppsett har rutespesifikke, åpne Google Flights- og FINN-lenker for alle relevante delstrekninger. Ikke erstatt disse med generiske startsider. For flerby, forklar at begge delstrekningene må settes sammen hos søketjenesten. Ikke vis faktisk søkehistorikk, private billetter, priser eller personlige søkedatoer. Utformingen kan gjenbrukes på en eventuell åpen nettside senere, uten å flytte eller dele løsningen nå.
- Private arbeidsnotater og konkrete flysøk hører hjemme utenfor det offentlige repositoryet. Historiske commits kan fortsatt inneholde eldre offentlige søkeobservasjoner inntil en separat, kontrollert historikkrevisjon blir gjennomført.

## Passvurdering per v0.21

- Sterk kandidat: JR West Kansai–Hiroshima Area Pass for den vestlige delen av ruten. Fem sammenhengende dager må plasseres etter endelig togplan.
- Have Fun in Japan Pass beholdes som kandidat, ikke beslutning. Dagens katalog treffer blant annet teamLab Borderless, Hakone Freepass og Hiroshima Peace Memorial Museum, men det er også mye overlapp og flere hovedaktiviteter uten bekreftet direkte treff.
- Ikke regn standard Have Fun-pass som USJ-inngang. Nåværende USJ-kuponger i katalogen sier at separat Studio Pass kreves.
- Nasjonalt Japan Rail Pass er lite aktuelt med dagens énveisrute; regionalt JR West-pass ser bedre ut.
- JR West tilbyr også en Kansai–Hiroshima + Have Fun Hiroshima-kombinasjon som skal sammenlignes når kjøpsvinduet åpner.
- Passene skal ikke presse inn ekstra aktiviteter bare for å «tjene dem inn». Sjekk 2027-katalog og priser mot faktisk plan før kjøp.
- Rute-kontroller: Opplevelser, Mat, Overnatting og så Knutepunkter. Prisoppsummeringen ligger på egen rad for å gi plass på iPad.

## Før publisering

Kjør:

```bash
node scripts/check-public-content.mjs
node scripts/check-data-integrity.mjs
node scripts/check-content-style.mjs
node scripts/check-release-discipline.mjs
```

Alle fire skal passere. Hvis miljøet ikke kan kjøre Node, må tilsvarende validering gjøres eksplisitt før commit og begrensningen dokumenteres.

Ved brukersynlige endringer bumpes `docs/data/site.json`, og CSS/JS-assetversjonen i alle `docs/*.html` skal samsvare med den versjonen. Versjon og sist oppdatert skal være synlig i bunnteksten på alle sider.


## Bilder og medier

Dette er en offentlig side. Bruk bare bilder med dokumentert gjenbruksrett:

- foretrekk Wikimedia Commons-bilder med eksplisitt fri lisens, CC0/public domain eller prosjektets egne bilder;
- ikke kopier bilder fra Google Maps, Booking.com, Tripadvisor, Instagram, hotell-/restaurantnettsteder eller andre nettsider bare fordi de er offentlig synlige;
- «offisiell nettside» betyr ikke automatisk at bildet kan gjenbrukes;
- lisensierte bilder bruker `image.type: "licensed"` og skal ha kilde, kreditering, lisens og lisenslenke; AI-illustrasjoner bruker `image.type: "ai"`, lagres lokalt og merkes tydelig som AI-generert i UI-et;
- hvert sted skal som hovedregel ha et eget, representativt bilde. Ikke gjenbruk et områdebilde på et konkret museum/slott/helligdom bare som fallback.

Dersom gjenbruksretten er uklar, skal bildet ikke brukes.
