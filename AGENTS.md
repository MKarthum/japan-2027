# Instruksjoner for agenter

Dette er et offentlig reiseplanleggingsrepo og en familievennlig GitHub Pages-side.

## Hovedregel

**Ikke skriv privat eller identifiserende informasjon til repoet.** `PUBLIC_DATA_POLICY.md` er autoritativ for personvern.

## Produktmål

Siden skal gjøre planleggingen lettere og samtidig være interessant nok til at familien faktisk vil utforske den. Hold hovednavigasjonen enkel, og legg detaljer ett nivå ned.

## Arbeidsmåte

- Behandle `docs/data/*.json` som autoritativt innhold for nettsiden.
- Bevar enkel statisk arkitektur. Ikke innfør rammeverk, database eller byggesteg uten konkret behov.
- Nye steder skal normalt inn i `places.json` og bruke `place.html?id=<id>`.
- Mat/restaurantkandidater skal inn i `food.json`.
- Transport, bookingradar, miniordbok, bilder og mediekoblinger skal normalt inn i `guide.json`.
- Legg pålitelige kilder i `sources.json`.
- Bruk offisielle sider for billettbestilling når de finnes.
- Fakta som kan endres (pris, åpningstid, billettregler, transportregler) skal beskrives som dagens informasjon og sjekkes på nytt nærmere reisen.
- Skill tydelig mellom bekreftet fakta og foreløpige forslag.
- Ikke gjør foreløpige datoer eller budsjett til «bekreftede bestillinger».
- Restaurantetikettene «Må prøve», «Sterk kandidat» og «Valgfri» er interne reiseprioriteringer, ikke objektive kvalitetsrangeringer.
- Bilder må kunne gjenbrukes lovlig. Lagre kreditering og lisens i `guide.json`, og vis krediteringen på siden.
- Hold ekstern detaljinformasjon ekstern når det er bedre: lenk til offisiell side, Wikipedia eller billettside fremfor å kopiere store mengder innhold.
- Kjør `node scripts/check-public-content.mjs` før endringer publiseres.

## Forbudt innhold

Aldri legg inn navn på reisende, kontaktinformasjon, hjemmeadresse, skole/arbeidssted, bookingreferanser, eksakte flydetaljer, hotellreservasjoner, passdata, betalingsdata eller andre opplysninger som knytter en offentlig reiseplan til konkrete privatpersoner.
