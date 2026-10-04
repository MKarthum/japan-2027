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
- Reiseetapper, priser og stasjoner går i `docs/data/transport.json`.
- Rute og dagsturer refererer til steder med ID. Ikke lagre navn eller koordinater i `trip.json` når de allerede finnes i `places.json`.
- Destinasjonsfarger og hvilke områder som arver dem eies av `docs/data/trip.json`. Steder, restaurantkort, kartmarkører og rutelinjer skal avlede fargen derfra.
- `docs/data/route-geometry.json` eier bare fysisk linjegeometri og spor-offset. Ikke legg destinasjonsfarger eller annen domenedata i geometrifilen.
- Når to ruter deler samme fysiske spor i motsatt retning, skal de tegnes som parallelle spor. MapLibre `line-offset` er retningsrelativ: motsatt rettede linjer bruker samme fortegn for å havne på hver sin fysiske side.
- Praktiske råd, bookingradar, ordbok og mediekoblinger går i `docs/data/guide.json`. Bookingradar skal referere til `placeId`; ikke kopier stedets navn, område eller URL.
- Felles kilder går i `docs/data/sources.json`.
- Offisielle sider foretrekkes for billetter, menyer, regler og reservasjon.
- Opplysninger som kan endres skal ha konkret kontroll-dato i data.
- Bilder skal ha eksplisitt `type`. `licensed` krever lovlig gjenbruk, kilde, kreditering, lisens og lisenslenke. `ai` skal lagres lokalt i repoet, ha alt-tekst og genereringsdato og alltid merkes som AI-generert i UI-et. Ikke bruk bilder fra Google Maps, Booking.com, Tripadvisor, sosiale medier eller kommersielle/offisielle nettsider uten eksplisitt gjenbrukstillatelse. Foretrekk Wikimedia Commons, CC0/public domain eller prosjektets egne bilder. Hvert sted skal normalt ha et eget representativt bilde.
- Bildekreditering vises som en liten overlay nederst til venstre i bildet, ikke som egen rad under bildet. På stedskort ligger områdeetiketten øverst til venstre i selve bildet; type kan ligge øverst til høyre.
- Ikke innfør rammeverk, database eller byggesteg uten et konkret behov.

## Datagrense mellom data og visning

- Offentlig HTML og JavaScript er visningslag. Det kan inneholde struktur, generiske UI-tekster, formatering og hvilke felt/komponenter som vises, men ikke hardkodede navn, beskrivelser, priser, koordinater eller kuraterte ID-lister for konkrete steder, restauranter, hoteller eller reiseetapper.
- Budskapet på oversikten eies av `trip.json.overview`. Oversikten skal forklare hvorfor turen og hvordan siden brukes; den skal ikke bli en kopi av alle undersidene.
- `food.json` eier både restaurantpostene og felles matmetadata som prisbånd og planleggingsnotater. `transport.json` eier rutens transportstrategi og etapper. `prep.json` eier forberedelser og koblinger til steder via `placeIds`; ikke lag egne AC-/film-/spillflagg i `places.json`.
- Samme visuelle konsept skal bruke samme renderer og samme CSS-primitiv. Steder, Mat og Overnatting skal bruke samme reise-/basefilter fra `trip.json`. `entityMediaHtml()` er felles medieprimitiv for kort med bilde, område/type og kreditering. `relatedEntityCardHtml()` er felles relasjonskort for «andre alternativer» og «mat i området».
- Ikke kopier markup for en eksisterende objekttype for å lage en ny variant. Utvid den delte helperen/klassen når semantikken er den samme. Hvis en delt visning endres visuelt, skal alle brukere av komponenten få endringen samtidig.

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

## Priser og valuta

- `docs/data/fx.json` eier live-endepunkt og lagret fallback. Nettstedet skal hente siste ECB-referansekurs ved sidelasting og bruke fallback bare ved nettverks-/API-feil.
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
