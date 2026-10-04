# Instruksjoner for agenter

Les `START_HERE.md` først. Denne filen utfyller rehydreringskontrakten der.

## Autoritet

- Siste `main` er autoritativ state.
- Ikke bruk tidligere chat, minne eller commit-historikk som grunnlag dersom det avviker fra nåværende filer.
- Bruk én kanonisk dataeier per domene. Offentlige sider skal avlede visninger fra datafilene, ikke opprette parallelle kopier.
- `PUBLIC_DATA_POLICY.md` er autoritativ for hva som kan publiseres.

## Produktmål

Siden skal være en familievennlig reiseplan som er lett å forstå uten forkunnskap. Hovedoversikter skal være skannbare; detaljer ligger ett klikk ned.

## Arbeidsregler

- Nye steder går i `docs/data/places.json` og vises via `place.html?id=<id>`. Stedet skal eie navn, beskrivelse, kart, bilde/illustrasjon og eksterne lenker i samme objekt.
- Restauranter går i `docs/data/food.json` og vises via `restaurant.html?id=<id>`.
- Overnattingskandidater går i `docs/data/hotels.json` og vises via `hotel.html?id=<id>`. Filen eier også overnattingsformer og alternative sammenligningsspor. Prisene er brede planleggingsintervaller, ikke 2027-tilbud.
- Flyresearch går i `docs/data/flights.json`. Filen eier rutetyper, fleksibilitetsregler, prisobservasjoner, flyselskap/hub-spor, sikkerhetsgrunnlag, pakkereisebenchmarker og manuelle søkeoppgaver. De faktiske reisedatoene eies fortsatt av `trip.json` og skal avledes derfra i flyvisningen.
- Reiseetapper inne i Japan, priser og stasjoner går i `docs/data/transport.json`. `standardFamilyYen` er basisprisen for standardfamilien; valgt prisscenario skaleres i visningslaget.
- Rute og dagsturer refererer til steder med ID. Ikke lagre navn eller koordinater i `trip.json` når de allerede finnes i `places.json`.
- Destinasjonsfarger og hvilke områder som arver dem eies av `docs/data/trip.json`. Steder, restaurantkort, kartmarkører og rutelinjer skal avlede fargen derfra.
- `docs/data/route-geometry.json` eier bare fysisk linjegeometri og spor-offset. Ikke legg destinasjonsfarger eller annen domenedata i geometrifilen.
- Når to ruter deler samme fysiske spor i motsatt retning, skal de tegnes som parallelle spor. MapLibre `line-offset` er retningsrelativ: motsatt rettede linjer bruker samme fortegn for å havne på hver sin fysiske side.
- Praktiske råd, bookingradar, ordbok og mediekoblinger går i `docs/data/guide.json`. Bookingradar skal referere til `placeId`; ikke kopier stedets navn, område eller URL.
- Sidebudskap og forklarende tekst som ikke tilhører et domene går i `docs/data/pages.json`. HTML skal bare angi hvilke tekstelementer som vises via `data-copy`.
- Pass, pakkeløsninger og kombinasjonsprodukter går i `docs/data/passes.json`. Hold visningen kort; detaljerte treff/overlapp kan ligge i datafilen for senere re-evaluering uten å fylle siden.
- Felles kilder går i `docs/data/sources.json`.
- Offisielle sider foretrekkes for billetter, menyer, regler og reservasjon.
- Opplysninger som kan endres skal ha konkret kontroll-dato i data.
- Flypris er alltid en observasjon, ikke en varig sannhet. Lagre kilde, kontrolldato, om prisen er per person/total, turtype og om den er historisk, publisert fra-pris eller konkret søk. Ikke skaler voksenpris mekanisk til familiepris når barnetakst/billettvilkår er ukjent.
- Flysøk som krever dynamisk søkemotor skal representeres som en manuell søkeoppgave med offentlig URL og instruksjon. Google Flights og FINN Reise er første søketrinn; direkte flyselskapssøk brukes etterpå for å verifisere et lovende alternativ. Ikke bruk «åpen kjeve» i offentlig tekst; skriv «inn én by / hjem fra en annen» eller verktøyets egen «Flere byer / Multi-city». Ikke lagre booking-session-URL, innlogget delingslenke, token, PNR eller annen bruker-/kontoidentifikator.
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
- På rutekartet skal detaljpanelet under kartet alltid følge den popupen som faktisk åpnes. Bind synkronisering til MapLibre-popupens `open`-hendelse, ikke et separat marker-click. Kart-popupen skal være minimal: kategori + navn + «Detaljer under kartet». Beskrivelse, pris og kontekst hører hjemme i panelet under kartet. Bare valg av rutelinje/etappe skal vise strekning og pris. `mapSelectionPopupHtml()` er den delte popup-primitiven. `entityMediaHtml()` er felles medieprimitiv for kort med bilde, område/type og kreditering. `relatedEntityCardHtml()` er felles relasjonskort for «andre alternativer» og «mat i området».
- Kartets `error`-hendelse kan fyre for enkeltfliser, glyphs eller andre delressurser selv om kartet fungerer. Ikke vis «kartet kunne ikke lastes» på første error. Fatal fallback vises bare dersom kartets stil ikke blir ferdig lastet etter en kort grace-periode.
- Ikke kopier markup for en eksisterende objekttype for å lage en ny variant. Utvid den delte helperen/klassen når semantikken er den samme. Hvis en delt visning endres visuelt, skal alle brukere av komponenten få endringen samtidig.
- CSS skal ha én kanonisk layoutdefinisjon per delt komponent. Ikke legg nye versjonslag med samme selektor nederst i filen; konsolider eksisterende regel når komponenten endres.

## Publiseringsdisiplin

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

Aldri legg inn navn på reisende, kontaktinformasjon, privat adresse, skole/arbeidssted, bookingreferanser, eksakte flydetaljer, hotellreservasjoner, passdata, betalingsdata eller andre opplysninger som identifiserer eller lokaliserer konkrete personer.

## Pass og pakkeløsninger

- Et pass skal ikke styre reiseruten. Vurder pass opp mot den planen vi allerede ønsker, og kjøp bare hvis det gir reell økonomisk eller logistisk gevinst.
- Have Fun/JR-kataloger endres over tid. `passes.json` kan bevare dagens gjennomgang, men synlig tekst skal si at innhold må bekreftes ved kjøp.
- Ikke spre passøkonomi ned på hvert sted. Stedspris viser inngang; passvurdering hører hjemme samlet under Praktisk.

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

Før publisering skal alle tre kontroller passere:

```bash
node scripts/check-public-content.mjs
node scripts/check-data-integrity.mjs
node scripts/check-content-style.mjs
node scripts/check-release-discipline.mjs
```

Ved brukersynlige endringer bumpes `docs/data/site.json`. Når CSS eller JavaScript endres, skal alle `docs/*.html` peke til samme assetversjon.
