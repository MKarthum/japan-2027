# Instruksjoner for agenter

Dette er et offentlig reiseplanleggingsrepo.

## Hovedregel

**Ikke skriv privat eller identifiserende informasjon til repoet.** `PUBLIC_DATA_POLICY.md` er autoritativ for personvern.

## Arbeidsmåte

- Behandle `docs/data/*.json` som autoritativt innhold for nettsiden.
- Bevar en enkel statisk arkitektur. Ikke innfør rammeverk eller byggesteg uten et konkret behov.
- Nye steder skal normalt legges inn i `places.json` og bruke den generiske `place.html`-siden.
- Legg kilder til fakta og prisanslag i `sources.json`.
- Skill tydelig mellom bekreftet fakta og foreløpige forslag.
- Ikke gjør foreløpige datoer eller budsjett til «bekreftede bestillinger».
- Kjør `node scripts/check-public-content.mjs` før endringer publiseres.

## Forbudt innhold

Aldri legg inn navn på reisende, kontaktinformasjon, hjemmeadresse, bookingreferanser, eksakte flydetaljer, hotellreservasjoner, passdata, betalingsdata eller andre opplysninger som knytter en offentlig reiseplan til konkrete privatpersoner.
