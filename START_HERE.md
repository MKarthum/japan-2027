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

- `docs/data/trip.json`: reisevindu, hovedrute, budsjett, oversiktskuratering, destinasjonstemaer/farger og `priceParties`. Standard prisvisning er én familie (2 voksne + 2 barn); to-familiescenarioet er 4 + 4.
- `docs/data/flights.json`: flyresearch, rutetyper, datofleks-regler, prisobservasjoner, flyselskaper/huber, sikkerhetsgrunnlag, pakkereisebenchmarker og manuelle søkeoppgaver. Den skal ikke duplisere de faktiske reisedatoene som eies av `trip.json`.
- `docs/data/places.json`: komplett master for steder: navn, tekst, kartposisjon, bilde/illustrasjon, eksterne lenker og inngangspris. Hvert sted skal ha eksplisitt `price`, også når prisen er «Gratis».
- `docs/data/food.json`: restauranter, priser, kartposisjoner, ratinger, lenker og bestillingsforslag, samt felles matmetadata som prisbånd og planleggingsnotater.
- `docs/data/hotels.json`: overnattingskandidater, overnattingsformer, basevalg, familieoppsett, planpriser, kilder og kartposisjoner.
- `docs/data/transport.json`: intercity-etapper, tider, priser og stasjoner.
- `docs/data/route-geometry.json`: kun fysisk rutegeometri og visuelle spor-offsets for parallelle/overlappende jernbanestrekninger. Farger skal ikke lagres her.
- `docs/data/guide.json`: praktiske råd, bookingradar, ord og mediekoblinger. Bookingradar refererer til `placeId`; den skal ikke kopiere navn, område eller lenker fra stedet.
- `docs/data/prep.json`: forberedelser før turen og deres kobling til steder via `placeIds`. Inneholder familieinnhold, tydelig merket vokseninnhold og en egen historie-læringssti. Medie-/forberedelseskoblinger skal ikke dupliseres i `places.json` eller `guide.json`.
- `docs/data/fx.json`: siste tilgjengelige ECB-kurs via nettendepunkt + lagret fallback. ECB oppdaterer kun virkedager; helgedato fra siste virkedag er forventet. Alle omregninger går gjennom `loadFx()`.
- `docs/data/passes.json`: kandidater for togpass, aktivitets-/transportpass og kombipakker. Synlig side viser bare kort status og når de bør vurderes; detaljert match mot planen ligger i samme datafil for senere re-evaluering.
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
- Steder, Mat og Overnatting skal bruke samme destinasjons-/basefilter basert på `trip.json`, slik at Nara arver Kyoto, Miyajima arver Hiroshima osv. Filteret støtter `?base=<routeId>` for lenking mellom sider.
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
- Alle 24 steder har et `price`-objekt med status, kontroll-dato og kilde. Gratis steder vises eksplisitt som gratis; dynamiske priser vises som intervall/fra-pris eller avventer salgsdato.
- «Før turen» skal ikke være en barneliste eller en Assassin’s Creed-liste. Den har egne voksenforslag og historie, og skal gi flere innganger til Japan: historie, hverdagsliv, litteratur, film/TV, spill, mat og språk.
- Historieløypa dekker minst Sengoku/samlingen av Japan, Meiji/modernisering, andre verdenskrig/Hiroshima og etterkrigstid/popkultur.
- Film og TV i `prep.json` skal ha både IMDb-lenke og en aktuell norsk strømme-/visningstjeneste med kontrolldato. Strømmelenken skal være tjenestens kanoniske, direkte HTTPS-innholdsside og åpnes eksternt slik at Japan-siden blir liggende. Ikke bruk custom-scheme, automatisk fallback, app-/delingsparametre eller konto-/brukerparametre. La operativsystemets universal links avgjøre eventuell appåpning. Matforberedelser skal ha oppskriftslenke. «Små mål» skal ha nok detalj til at oppgaven kan gjennomføres uten forkunnskap.
- Målgruppe i `prep.json` er strukturert som `audience.id`, `audience.label` og valgfri `audience.note`. Bruk de fire nivåene `family`, `older-kids`, `teens` og `adults`. Innholdsadvarsel eller konkret aldersmerking er en separat merknad, ikke en del av selve målgruppen.
- Språkvisningen skal vise romanisering og japanske tegn sammen. Uttaleknappen bruker nettleserens japanske tekst-til-tale-stemme; den utvidede fraselisten ligger på `phrases.html`.

## Flyplanlegging per v0.24

- Fly er første datodrivende beslutning. Før hotell- og dagsdatoer låses, skal fire oppsett prises: Tokyo inn / Osaka hjem, Osaka inn / Tokyo hjem, Tokyo tur/retur og Osaka tur/retur.
- Gjeldende datoer eies bare av `trip.json`. `flights.json` lagrer fleksibilitetsregelen (normalt ±3 dager) og datert markedsresearch; visningen avleder den konkrete datomatrisen fra `trip.json`.
- Sammenlign total reisekostnad og tidsbruk, ikke bare flyprisen. Tur/retur til samme by må vurderes mot ekstra innenlands transport, mulig hotellbehov og tapt reisetid.
- Prisobservasjoner skal alltid angi hva tallet faktisk er: historisk nivå, publisert 2027-fra-pris, datert søkemotorfunn eller pakkereise. Ikke bland pris per person og totalpris for standardfamilien.
- Sikkerhet deles i regulatorisk status, sekundære uavhengige signaler og tidsavhengig luftromsrisiko. Ikke presenter en privat rangering som objektiv fasit.
- Dynamiske søk som siden ikke kan hente stabilt skal ligge som konkrete manuelle søkeoppgaver. Resultatmalen kan kopieres til chat og brukes til å oppdatere `flights.json`.
- Offentlig repo skal aldri lagre booking-sessioner, innloggede delingslenker, PNR, flybilletter eller personlige pris-/konto-URL-er. Bruk offentlige søke-/destinasjonssider som lenkemål.

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
