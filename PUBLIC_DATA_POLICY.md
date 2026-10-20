# Regler for offentlig innhold

Dette repoet og GitHub Pages-siden er **offentlige**. Alt innhold skal kunne leses av hvem som helst uten at det skaper personvern- eller sikkerhetsproblemer.

## Skal aldri legges inn

- navn på reisende eller andre privatpersoner
- e-postadresser eller telefonnumre
- hjemmeadresse, skole, arbeidssted eller andre presise private lokasjoner
- passnummer, fødselsdato eller annen identitetsinformasjon
- bookingreferanser, PNR, billettnumre, QR-koder eller strekkoder
- betalingsinformasjon, kvitteringer eller forsikringsnumre
- hotellrom, reservasjonsposter eller andre detaljer som gjør det mulig å finne reisende i sanntid
- bilder eller dokumenter som inneholder private opplysninger i metadata eller synlig tekst
- personlige notater som ikke er nødvendige for selve reiseplanleggingen
- innloggede flysøks-/delingslenker, booking-session-URL-er, handlekurver, kundekonto-parametre eller andre lenker som kan være knyttet til en personlig sesjon

## Datoer, reisedager og fly

Den offentlige ruten viser destinasjoner, rekkefølge og antall netter med nummererte reisedager. Ingen eksakte datoer for familiens bestilte reiser eller hotellopphold publiseres.

`docs/flights.html` er en generell guide med **illustrative flysøk**, ikke historiske søkeobservasjoner. Ikke publiser datoer, flynumre, klokkeslett, pristilbud, søkematriser, faktisk gjennomførte søk eller lenker til brukerens søkesesjoner som del av guiden.

**Kjøpte billetter, bekreftede reisedatoer, bookingreferanser, flynumre og klokkeslett skal aldri publiseres**, heller ikke indirekte. Offentlige datoer for arrangementer (som en sumoturnering) kan omtales når de er hentet fra arrangøren, uten å koble dem til bekreftede personlige reisedatoer.

Historiske commits kan inneholde eldre offentlige markedsobservasjoner. Fjern dem ikke ved å omskrive historikken uten sikkerhetskopi, vurdering av andre grener og plan for GitHub Pages samt kloner og GitHub-cacher.

## Før publisering

Spør alltid: «Ville jeg vært komfortabel med at en tilfeldig person fant dette via Google?» Hvis svaret ikke er et klart ja, skal innholdet ikke inn i repoet.

Den automatiske kontrollen i `scripts/check-public-content.mjs` er kun et ekstra sikkerhetsnett. Den erstatter ikke manuell vurdering.

## AI og automatisering

De samme reglene gjelder for AI-generert innhold. En agent skal aldri hente private reisedetaljer fra samtaler, minne, e-post eller andre kilder og skrive dem til dette offentlige repoet. Bare informasjon som er nødvendig for den offentlige planleggingsopplevelsen skal publiseres.
