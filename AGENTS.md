# Instruksjoner for agenter

Les `START_HERE.md` først. Denne filen utfyller rehydreringskontrakten der.

## Autoritet

- Siste `main` er autoritativ state.
- Ikke bruk tidligere chat, minne eller commit-historikk som grunnlag dersom det avviker fra nåværende filer.
- Bruk én kanonisk dataeier per domene. Offentlige sider skal avlede visninger fra datafilene, ikke opprette parallelle kopier.
- `PUBLIC_DATA_POLICY.md` er autoritativ for hva som kan publiseres.

## Produktmål

Siden skal være en familievennlig reiseplan som er lett å forstå uten forkunnskap. Hovedoversikter skal være skannbare; detaljer ligger ett klikk ned.


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

## Språk for hele familien

Japanske fag-/kulturord får én gjenbrukbar forklaring via klikk/tapp på stiplet understreket ord. All **betydning, japansk skrivemåte, synonymer og aktivering** tilhører `docs/data/guide.json` → `placeWords`, ikke frontend eller kopiert innhold i kort. `inline:true` gjør ordet interaktivt, mens `showInGuide:false` skjuler detaljerte ord fra den korte ordlistevisningen under Språk og fraser. `docs/assets/glossary.js` har bare generisk DOM-, posisjonering- og tastatur-/mobilfunksjonalitet. Unngå repeterende parentesforklaringer; forklar kun med vanlig prosa der det tilfører noe ut over definisjonen. Ikke gjør vanlige ord og alle stedsnavn interaktive. Behold japanske uttrykk for gjenkjenning i Japan.

**Fast regel for forklaringskrevende begreper:** På alle nye eller endrede sider med faguttrykk, forkortelser eller kulturelle ord vurderes selektivt interaktiv forklaring med den eksisterende datadrevne ordlistekomponenten – ikke bare japanske ord. Definisjonen skal ha én kanonisk JSON-eier; frontend skal aldri inneholde egne definisjoner. Behold ordet og den opprinnelige meningen i primærteksten når parentesforklaringer fjernes: en forklaring skal ikke føre til at selve begrepet forsvinner. Merk innholdsblokker som ikke bruker p/strong/span (for eksempel `<div class="kicker">`) med `data-glossary-text`; ikke plasser en popup-knapp inne i en lenke, en annen knapp eller et inputfelt. Aktiver bare utvalgte ord, og unngå gjentatt understrek i samme selvstendige kort. Kontroller minst ett faktisk begrep i både liste- og detaljvisning etter endring, inkludert mobil/tastatur/fokus.

### Redaksjonell kvalitetsregel for popover-forklaringer

Dette er et **innholdskrav**, ikke bare en UI-funksjon. Før et ord aktiveres med `inline:true` i `docs/data/guide.json`, svar i vanlig norsk på: **Hva er dette? Hvordan kjenner jeg det igjen, bruker jeg det eller opplever jeg det?** Skriv 1–3 selvstendige setninger, normalt omtrent 90–300 tegn. Forklaringen skal fungere når den åpnes alene i en mobil-popup, uten at leseren kjenner andre japanske termer, trykker videre eller må lese siden rundt. Forklar jargon med vanlige ord; eksempler og stedsnavn er tillegg, aldri erstatning for definisjon. Konkrete ritualer, matretter, togbilletter og arrangementsformer skal forklares presist, og kildehenvisning (`referenceUrl`) kan ligge i data for faglig kontroll.

Før nye oppslagsord opprettes: skann faktisk innhold, identifiser uttrykk som trenger hjelp, unngå ordinære ord, stedsnavn og begreper som får feil betydning i en bestemt sammenheng. Søk også etter begreper som brukes i kortoverskrifter, prisbokser, detaljer og dagidéer. Test at hele uttrykket treffes korrekt, ikke et tilfeldig ordfragment. Eksempel: «nikutama-soba» er en Hiroshima-rett med hvetenudler, og må ikke automatisk forklares som bokhvetenudler. Oppslagsord som ikke forekommer på nettstedet, trenger ikke aktiveres.

Ved ordlisteendringer: gjennomgå **alle** `inline:true`-forklaringene redaksjonelt, ikke bare den konkrete feilen; kontroller JSON-eierskap, norsk klarhet og betydning i sammenheng. Ikke bruk forklaringsfeltet til vag reklame, huskeregler eller henvisninger som forutsetter ny forklaring. Visningen skal fortsette å ha én kort popup uten lenkekjede eller repetert forklaring i hvert kort. 

## Arbeidsregler

- `docs/day-ideas.html` er en enkel inspirasjonsside. `docs/data/day-ideas.json` eier mulige geografiske dagskombinasjoner, ikke faste reisedager. Et billettanker kan utløse omgruppering senere. Ikke bygg drag-and-drop-kalender, serverdatabase eller bookingstatus.
- Redaksjonell interesse (`planInterest`) i `places.json` er et forslag og noe annet enn brukerens valg. «Aktuell»/«Legg bort» er rene lokale nettleservalg i `localStorage`, ikke offentlige data og ikke synkronisert mellom enheter; det skal stå tydelig på siden.
- Nye steder går i `docs/data/places.json` og vises via `place.html?id=<id>`. Stedet skal eie navn, beskrivelse, kart, bilde/illustrasjon og eksterne lenker i samme objekt.
- Restauranter går i `docs/data/food.json` og vises via `restaurant.html?id=<id>`.
- Overnattingskandidater går i `docs/data/hotels.json` og vises via `hotel.html?id=<id>`. For Hakone finnes også `hotels.json.onsenOptions`: åpne, kildebelagte alternativer til privat familiebad på overnattingssted eller ved separat bad. Opplysningene vises med én delt renderer på Hakones `place.html` og Overnatting. Bruk `hotelId` til å hente navn og lenke til eksisterende hotell, ikke kopier hotelloppføringer. Ikke merk noe som valgt/bestilt eller oppgi ukontrollerte rompriser for 2027. Familiens behov for privat bad, korrekt romkapasitet og eventuelle aldersvilkår må kontrolleres før beslutning. Filen eier også overnattingsformer og alternative sammenligningsspor. Prisene er brede planleggingsintervaller, ikke 2027-tilbud.
- Flysøksiden skal ha fire konkrete, interaktive eksempler og en reproduserbar søkemetode, inkludert fleksible datoer, totalpris, alternative knutepunkter og separate billetter. Eksemplene eies av `docs/data/flights.json`. Alle eksempler skal ha separate rutespesifikke lenker til Google Flights og FINN for de relevante delstrekningene; generiske forsidelinker er ikke nok. Ikke påstå at begge flerbystrekninger er forhåndsutfylt når bare en rute er åpnet. Ikke gjør siden til bare tre statiske tekstkort. Historiske søk og faktiske flybestillinger skal ikke lagres i offentlig repo.
- Reiseetapper inne i Japan, priser og stasjoner går i `docs/data/transport.json`. `standardFamilyYen` er basisprisen for standardfamilien; valgt prisscenario skaleres i visningslaget.
- Rute og dagsturer refererer til steder med ID. Ikke lagre navn eller koordinater i `trip.json` når de allerede finnes i `places.json`. Offentlig rute skal bare vise dagnummer (dag 1–15), ikke bekreftede reisedatoer.
- Destinasjonsfarger og hvilke områder som arver dem eies av `docs/data/trip.json`. Steder, restaurantkort, kartmarkører og rutelinjer skal avlede fargen derfra.
- `docs/data/route-geometry.json` eier bare fysisk linjegeometri og spor-offset. Ikke legg destinasjonsfarger eller annen domenedata i geometrifilen.
- Når to ruter deler samme fysiske spor i motsatt retning, skal de tegnes som parallelle spor. MapLibre `line-offset` er retningsrelativ: motsatt rettede linjer bruker samme fortegn for å havne på hver sin fysiske side.
- Praktiske råd, bookingradar, ordbok og mediekoblinger går i `docs/data/guide.json`. Bookingradar skal referere til `placeId`; ikke kopier stedets navn, område eller URL.
- Sidebudskap og forklarende tekst som ikke tilhører et domene går i `docs/data/pages.json`. HTML skal bare angi hvilke tekstelementer som vises via `data-copy`.
- Pass, pakkeløsninger og kombinasjonsprodukter går i `docs/data/passes.json`. Hold visningen kort; detaljerte treff/overlapp kan ligge i datafilen for senere re-evaluering uten å fylle siden.
- Felles kilder går i `docs/data/sources.json`.
- Offisielle sider foretrekkes for billetter, menyer, regler og reservasjon.
- Opplysninger som kan endres skal ha konkret kontroll-dato i data.
- Strømmelenker skal peke direkte til tittelen via kanonisk HTTPS-format og åpnes som ekstern lenke slik at Japan-siden blir liggende. Stol på operativsystemets universal links for eventuell appåpning. Ikke bruk custom URL-scheme, tidsstyrt fallback, delingsparametre eller konto-/brukerparametre. De tillatte formatene valideres i `check-data-integrity.mjs`, slik at gamle lenkevarianter ikke sniker seg tilbake.
- Bilder skal ha eksplisitt `type`. `licensed` krever lovlig gjenbruk, kilde, kreditering, lisens og lisenslenke. `ai` skal lagres lokalt i repoet, ha alt-tekst og genereringsdato og alltid merkes som AI-generert i UI-et. Ikke bruk bilder fra Google Maps, Booking.com, Tripadvisor, sosiale medier eller kommersielle/offisielle nettsider uten eksplisitt gjenbrukstillatelse. Foretrekk Wikimedia Commons, CC0/public domain eller prosjektets egne bilder. Hvert sted skal normalt ha et eget representativt bilde.
- Bildekreditering vises som en liten overlay nederst til venstre i bildet, ikke som egen rad under bildet. På stedskort ligger områdeetiketten øverst til venstre i selve bildet; type kan ligge øverst til høyre.
- Ikke innfør rammeverk, database eller byggesteg uten et konkret behov.

## Datagrense mellom data og visning

- Offentlig HTML og JavaScript er visningslag. Det kan inneholde struktur, generiske UI-etiketter, formatering og hvilke felt/komponenter som vises, men ikke sidebudskap, hardkodede navn, beskrivelser, priser, koordinater eller kuraterte ID-lister. Sidebudskap eies av `pages.json`; domenetekst eies av riktig domenefil.
- Budskapet på oversikten eies av `trip.json.overview`. Oversikten skal forklare hvorfor turen og hvordan siden brukes; den skal ikke bli en kopi av alle undersidene.
- `food.json` eier både restaurantpostene og felles matmetadata som prisbånd og planleggingsnotater. `transport.json` eier rutens transportstrategi og etapper. `prep.json` eier forberedelser og koblinger til steder via `placeIds`; ikke lag egne AC-/film-/spillflagg i `places.json`. Målgruppen skal være strukturert (`audience.id` + `label`, eventuelt `note`) og ikke fri tekst. Innholdsadvarsel skal ligge i `note`, separat fra målgruppen.
- Samme visuelle konsept skal bruke samme renderer og samme CSS-primitiv. Steder, Mat og Overnatting skal bruke samme reise-/basefilter fra `trip.json`.
- Rutesiden er et navigasjonspunkt, ikke en blindvei. Hvert hovedstopp skal gi tydelige veier videre til stoppdetalj, filtrerte Steder/Mat og aktuell Overnatting. Filteret skal kunne åpnes direkte med `?base=<routeId>`.
- På mobil skal stedslister være kompakte rader med fast, smal bildekolonne. Ikke la bilde-/fallbackflaten få automatisk full kortbredde eller prosentvis høyde som kan vokse sirkulært i Safari.
- Kort som inneholder bildekreditering må ikke pakkes i én ytre `<a>`; krediteringen inneholder selv lenke og gir ugyldig nested-anchor HTML. Bruk egen primærlenke/overlay slik at hele kortet kan klikkes uten ugyldig DOM.
- På rutekartet skal de mest nyttige lagene komme først: Opplevelser, Mat, Overnatting, deretter Knutepunkter. Kartkontroller skal ha full bredde før prisoppsummeringen slik at de ikke blir unødvendig trangt på iPad.
- På rutekartet skal detaljpanelet under kartet alltid følge den popupen som faktisk åpnes. Bind synkronisering til MapLibre-popupens `open`-hendelse, ikke et separat marker-click. Kart-popupen skal være minimal: kategori + navn + direkte detaljlenke for sted, restaurant, hotell eller rutestopp, og lenke til panelet under kartet for reiseetappe og stasjon. Beskrivelse, pris og kontekst hører hjemme i panelet under kartet. Bare valg av rutelinje/etappe skal vise strekning og pris. `mapSelectionPopupHtml()` er den delte popup-primitiven. `entityMediaHtml()` er felles medieprimitiv for kort med bilde, område/type og kreditering. `relatedEntityCardHtml()` er felles relasjonskort for «andre alternativer» og «mat i området».
- Kartets `error`-hendelse kan fyre for enkeltfliser, glyphs eller andre delressurser selv om kartet fungerer. Ikke vis «kartet kunne ikke lastes» på første error. Fatal fallback vises bare dersom kartets stil ikke blir ferdig lastet etter en kort grace-periode.
- Ikke kopier markup for en eksisterende objekttype for å lage en ny variant. Utvid den delte helperen/klassen når semantikken er den samme. Hvis en delt visning endres visuelt, skal alle brukere av komponenten få endringen samtidig.
- CSS skal ha én kanonisk layoutdefinisjon per delt komponent. Ikke legg nye versjonslag med samme selektor nederst i filen; konsolider eksisterende regel når komponenten endres.

## Publiseringsdisiplin

- Steder-siden skal samle hver by/base og alle tilhørende aktiviteter i én diskret, avrundet destinasjonsramme (lys toning i eksisterende områdefarge) og god luft mellom rammene. Unngå doble kraftige rammer; dagsturen beholdes som en enkel underseksjon. Steder-sidens destinasjonsoverskrift skal ha hele overskriftsområdet som stor, tydelig og fokusmarkerbar lenke til basebeskrivelsen. Selve stedsnavnet skal være klikkbart, og «Les om [sted]» vises direkte under det – ikke som en liten høyrestilt knapp. Steder-siden grupperer steder i reiserutens rekkefølge og samler alle relevante attraksjoner under riktig base. Innen hver base vises lokale attraksjoner alfabetisk uten «primærvalg»/«sekundærvalg». Dagsturer (Nara/Miyajima) arver sin reisebase, men har egne undergrupper slik at attraksjoner på samme dagstur ikke spres mellom lokale byattraksjoner. Bevar filtreringen og stedsdetaljene.
- Den offentlige siden beskriver alltid **nåværende plan**, aldri endringshistorikken. En førstegangsleser skal ikke møte språk om hva som ble pushet, rettet, flyttet, beholdt, fjernet eller endret siden forrige versjon.
- `docs/data/site.json` skal bare inneholde publisert `version` og `released`. Ikke legg release notes eller endringslogg i offentlig site-data.
- Versjonen bumpes ved **hver repository-endring som publiseres til `main`**, og alle `docs/*.html` skal peke til samme CSS-/JS-versjon.
- En release til `main` skal være atomisk: data, visning, assetversjoner og `site.json` skal lande i samme commit. Arbeidsbrancher kan ha mellomcommits; de squash-merges før publisering.
- `node scripts/check-release-discipline.mjs` håndhever versjonsbump mot publisert baseline.

## Offentlig språk

- Skriv for en ny leser, ikke for utvikleren som gjorde forrige endring.
- Ikke bruk endringsloggspråk som «ny kandidat», «nedgradert», «beholdes», «fjernet» eller «nå har vi».
- Ikke legg tekniske implementasjonsforklaringer i UI.
- Ikke vis «ikke kontrollert» eller andre research-placeholdere. Skjul uverifiserte felt.
- Bruk datert metadata for volatile fakta; unngå «dagens regel».
- Restaurantprioriteringer er planprioritet for reisen, ikke objektive restaurantkarakterer.

## Personvern

Aldri legg inn navn på reisende, kontaktinformasjon, privat adresse, bookingreferanser, faktiske flysøk eller flybilletter, bekreftede reisedatoer, hotellreservasjoner, passdata eller betalingsdata. Det offentlige repoet er en generell reiseguide med nummererte reisedager og illustrative flysøksmetoder. Se `PUBLIC_DATA_POLICY.md`.

## Pass og pakkeløsninger

- Et pass skal ikke styre reiseruten. Vurder pass opp mot den planen vi allerede ønsker, og kjøp bare hvis det gir reell økonomisk eller logistisk gevinst.
- Have Fun/JR-kataloger endres over tid. `passes.json` kan bevare dagens gjennomgang, men synlig tekst skal si at innhold må bekreftes ved kjøp.
- Ikke spre passøkonomi ned på hvert sted. Stedspris viser inngang; passvurdering hører hjemme samlet under Språk og fraser.

## Prisscenarier

- `trip.json.priceParties` eier prisgruppene. Standardvisningen er én familie med 2 voksne + 2 barn. Et andre scenario viser to familier, foreløpig 4 voksne + 4 barn.
- Standardfamilien er én prisbasis på tvers av domener: steder bruker `price.standardFamilyRangeYen`, mat `standardFamilyEstimateYen`, overnatting `standardFamilyNightYen` og transport `fare.standardFamilyYen`.
- Transport må bruke `standardFamily.railFareMix`, ikke bare telle «barn»: JR bruker normalt voksenpris fra 12 år. Ikke publiser eksakte personlige aldre; lagre bare nødvendig billettmiks.
- Valgt scenario styres av `?party=<scenarioId>` og kan huskes lokalt i nettleseren. Standard er alltid én familie.
- To-familiepris for transport, mat og inngang kan skaleres fra standardfamilien. Overnatting er bare et sammenligningsanslag når det skaleres; større leiligheter/hele boliger kan gi annen totalpris.
- Alle steder skal ha et eksplisitt `price`-objekt. Gratis steder merkes `free` og vises som «Gratis»; dynamiske eller ufullstendige priser skal aldri fylles ut ved gjetning. Prisfelt skal ha `checked` og `source`.

## Priser og valuta

- `docs/data/fx.json` eier endepunkt og lagret fallback. Nettstedet skal hente siste tilgjengelige ECB-referansekurs ved sidelasting og bruke fallback bare ved nettverks-/API-feil. ECB publiserer på virkedager; i helger er en kursdato fra foregående virkedag korrekt. UI skal derfor si «Siste ECB-referansekurs (virkedager)», ikke antyde at kalenderdatoen skal være dagens.
- Budsjett og norske rammebeløp har NOK som primærvaluta og JPY beregnes ved siden av.
- Faktiske japanske priser har JPY som kildevaluta og NOK beregnes ved siden av med samme livekurs.
- Ikke hardkod separate valutakurser i visninger eller data.
- Footer skal alltid vise publisert versjon, sist oppdatert og kursen begge veier (NOK→JPY og JPY→NOK).

## Verifisering

Før publisering skal alle fire kontroller passere:

```bash
node scripts/check-public-content.mjs
node scripts/check-data-integrity.mjs
node scripts/check-content-style.mjs
node scripts/check-release-discipline.mjs
```

Ved brukersynlige endringer bumpes `docs/data/site.json`. Når CSS eller JavaScript endres, skal alle `docs/*.html` peke til samme assetversjon.

## Merking og restaurantlenker (v0.30.14)

- `places.json[].topics` eier tematiske interesser; `places.json[].features` eier praktiske egenskaper (innendørs og sakura). Begge vises på kort og filtreres separat via `topic` og `feature`, uten å endre reisebase, prisscenario eller personlige valg.
- `planInterest` er redaksjonell interesse for Dagidéer, ikke et personlig valg. «Aktuell» og «Legg bort» skal virke direkte fra stedskort uten navigasjon gjennom strekte tittellenker.
- Menylenken vises bare når målet inneholder meny/retter. Ved felles menyside og nettsted brukes én samlet lenke. Foretrekk verifisert engelsk side fremfor japansk; generiske forside-lenker er ikke menylenker.

## Kartsymboler og tilgjengelighet (v0.30.16)

- Farge kommer fortsatt utelukkende fra reisebasen i `trip.json`; kategori vises med form og piktogram: stjerne = opplevelse, sekskant med bestikk = mat, hus = overnatting, diamant med tog = knutepunkt. Nummererte sirkler er reiserutens stopp; markør for gjeldende sted på detaljkart er et siktemerke.
- `docs/assets/map-shared.js` er eneste autoritet for kartsymbolene, knappetekstene og lagerte kartlagsvalg. Rutekartet og detaljkartet skal kalle de samme konstruktørene; stasjon med flere tilhørigheter må beholde flerfarget markør. Ikke innfør lokale, lignende ikoner i `app.js`.
- Markørknapper skal ha lesbare navn, omtrent 42 px trykkflate og tydelig valgt/fokusert tilstand; på mobil skal alle fire kategoriknappene være synlige uten horisontal scrolling. Kjør `node scripts/check-map-ux.mjs` ved kartendringer.
