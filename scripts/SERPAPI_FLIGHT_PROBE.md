# SerpApi-søk: teknisk prøverunde

Dette er en begrenset teknisk prøverunde. Den oppdaterer **ikke** reiseplanen eller docs/data/flights.json, og den bestiller ingen billetter. Den ligger på en egen arbeidsgren.

## Søkeoppsett

Søker fire kombinasjoner: Tokyo inn / Osaka hjem, Osaka inn / Tokyo hjem, Tokyo tur/retur og Osaka tur/retur. Planleggingsdatoer i prøven er 19.–20. mars og 4. april 2027. adults=3, children=1, economy, NOK, høyst én mellomlanding per reiseetappe. Avreise og hjemreise er uavhengige variabler i den senere fulle matrisen; prøven bruker **ikke** 14 dager som fast begrensning.

Google Flights/SerpApi kan først vise bare utreisen. Skriptet velger ett førstealternativ per scenario og bruker departure_token for å hente neste etappe. Første pris blir **aldri** tolket som total reisepris. Pris etter siste etappe er fortsatt en *søkeobservasjon*, ikke dokumentasjon på gjennomgående billett, innsjekket bagasje eller endelig pris hos selger.

Kilde: https://serpapi.com/google-flights-api

## Første kjøring uten API-nøkkel

Krever Node 20+ og ingen npm-pakker:

    node scripts/test-serpapi-japan-probe.mjs
    node scripts/serpapi-japan-probe.mjs --dry-run

Se at testene passerer og at fire scenarier blir skrevet ut. Dette bruker ingen kreditter.

## Live kjøring – API-nøkkelen skal aldri legges i repo, chat eller kommandologg

På en autorisert maskin åpnes Terminal. Les API-nøkkelen direkte fra https://serpapi.com/manage-api-key, og legg den i en miljøvariabel uten å skrive den i shellhistorikken. For bash:

    read -rsp "SerpApi API key: " SERPAPI_API_KEY
    echo
    export SERPAPI_API_KEY
    node scripts/serpapi-japan-probe.mjs --live --max-requests=8
    unset SERPAPI_API_KEY

For macOS zsh kan kommandoen read -rs "SERPAPI_API_KEY?SerpApi API key: " brukes; deretter export SERPAPI_API_KEY.

Skriptet bruker aldri mer enn angitt max-requests, og sender forespørsler sekvensielt. Hver søkekombinasjon bruker maksimalt to API-forespørsler. Normal grense i denne prøven: 8. For testing med færre kreditter kan max-requests=2 brukes.

Lokale resultater lagres i .local-flight-search/ (ignorert av git, filmodus 0600). **Ikke publiser rått søkesvar, booking-/departure-token, brukersesjoner eller API-nøkkel.**

## Tolkning og neste fase

En vellykket prøverunde viser at API-et faktisk returnerer begge flyetapper og en plausibel samlet pris for *3 voksne og 1 barn* i minst ett multi-city-scenario. Det beviser **ikke** billettbeskyttelse eller inkludert bagasje.

Ved godkjent resultat kan en senere jobb utvide til flere uavhengige datoer og kontrollere de beste funnene hos flyselskapet. Resultatene kan først da transformeres til daterte, tydelig merkede observasjoner i docs/data/flights.json. Arkitekturen skal ikke kopiere søkesystemets midlertidige tokens til offentlig GitHub.

Viktig: Publisering på main krever separat gjennomgang, versjonsbump og repoets vanlige kontroller. Arbeidsgrenen med prøvescript er ikke en publisert endring.
