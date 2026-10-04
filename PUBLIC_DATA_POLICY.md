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

## Datoer og reiserute

Det er tillatt å vise **foreløpige planleggingsdatoer**, offentlige markedspriser/fra-priser og en foreslått reiserute. Flyresearch skal beskrive offentlig tilgjengelige ruter, priser og søkemønstre – ikke en konkret persons bestilling.  Når konkrete bestillinger er gjort, skal nettsiden fortsatt bare vise avrundede planleggingsdata – ikke flynummer, eksakte avgangstider, hotellnavn, rom, bestillingsnumre eller annen sanntidslogistikk.

## Før publisering

Spør alltid: «Ville jeg vært komfortabel med at en tilfeldig person fant dette via Google?» Hvis svaret ikke er et klart ja, skal innholdet ikke inn i repoet.

Den automatiske kontrollen i `scripts/check-public-content.mjs` er kun et ekstra sikkerhetsnett. Den erstatter ikke manuell vurdering.

## AI og automatisering

De samme reglene gjelder for AI-generert innhold. En agent skal aldri hente private reisedetaljer fra samtaler, minne, e-post eller andre kilder og skrive dem til dette offentlige repoet. Bare informasjon som er nødvendig for den offentlige planleggingsopplevelsen skal publiseres.
