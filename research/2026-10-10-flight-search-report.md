# Flyresearch Japan 2027 – avsluttet kontroll 10. oktober 2026

Kanonisk datalager: `docs/data/flights.json`, runde `japan-easter-independent-dates-2026-10-10`. Arbeidsgren: `research/serpapi-japan-probe-20261010`. Ingen endring av publisert nettside, trip.json eller main. Ingen bestilling.

## Gjenoppretting og dekning

Forrige Work-kjøring hadde 35 unike rute/datokombinasjoner på 15 datopar lokalt, med 38 konkrete FINN-observasjoner. Disse var ikke pushet. Data ble kontrollert og sikret på GitHub i commit 93a96cb9038a7d0a3bfd13ed2cdc01c545baffd2 før nytt flysøk. Den eldre runden fra research/japan-flights-2026-10-10 er også bevart.

Dekning: 24 av 24 prioriterte multi-city-kombinasjoner (18.–21. mars × 3.–5. april × begge retninger), seks tur/retur-kontroller og fem utvidede kombinasjoner. Alle fire rutetyper er representert. Dette er 100 % av den prioriterte multi-city-matrisen, ikke et uttømmende søk over alle mulige datoer.

Denne gjenopptakelsen gjennomførte én ny direkte kontroll hos Thai for 18. mars–5. april, uten å gjenta fullført oppdagelsesmatrise. Totalt tre detaljerte selger-/flyselskapspriskontroller (én selger og to flyselskap) og 41 hovedprisobservasjoner, med overlapp. Ny direkte pris ble committet før videre kontroll. Tidligere batch kunne ikke retroaktivt oppfylle push etter hvert søk.

## Skolerute og beregning

[Oslo kommunes skolerute](https://www.oslo.kommune.no/skole-og-utdanning/ferie-og-fridager-i-skolen/) ble kontrollert på nytt: påskeferie 22.–30. mars 2027, første skoledag 31. mars.

Datoene i tabellen er avgang fra Oslo og avgang fra Japan. Hjemkomst er oppgitt separat. Hele Japan-dager utelater ankomst- og avreisedag. Netter er faktisk kalenderopphold mellom lokale ankomst-/avgangsdatoer. Ordinære interne reiseetapper og jetlag er ikke trukket fra: antall fullt disponible opplevelsesdager avhenger også av dagsplanen. Tur/retur krever ytterligere returtransport. Reisevarighet måles fra OSL-avgang til OSL-ankomst; transport hjemmefra kommer i tillegg.

## Sju relevante kandidater

Alle priser gjelder samlet 3 voksne + 1 barn i Economy. Alle viste flyretninger er under 24 timer med én mellomlanding. Ingen kandidat er endelig kontrollert på alle billettvilkår.

| Rute og selskap | Datoer / hjemkomst | Pris NOK og stadium | Flytid ut / hjem | Japan: hele dager / netter | Tapte skoledager | Reisevarighet OSL–OSL |
| --- | --- | --- | --- | --- | --- | --- |
| Osaka inn / Tokyo hjem, Thai | 21.3–5.4 / 6.4 kl. 07:25 | 65 768 direkte, bagasje inkludert | 18t25 / 21t | 13 / 14 | 4–5 | 377,08 timer |
| Osaka inn / Tokyo hjem, Thai | 18.3–5.4 / 6.4 kl. 07:25 | **66 874 direkte**, bagasje inkludert | 18t25 / 21t | 16 / 17 | 6–7 | 449,08 timer |
| Osaka inn / Tokyo hjem, Thai | 22.3–2.4 / 3.4 kl. 07:25 | 65 573 søketreff, bagasje vist inkludert | 18t25 / 21t | 9 / 10 | 3 | 281,08 timer |
| Osaka inn / Tokyo hjem, JAL/Iberia | 17.3–6.4 / 7.4 kl. 14:20 | 57 486 søketreff, bagasje vist inkludert | 16t20 / 23t10 | 18 / 19 | 9 | 504,83 timer |
| Tokyo inn / Osaka hjem, KLM | 18.3–3.4 / 3.4 kl. 22:35 | 69 824 uten innsjekket bagasje; 75 752 alternativ bagasjefare i søketreff | 20t / 17t40 | 14 / 15 | 5 | 397,83 timer |
| Tokyo inn / Osaka hjem, KLM | 21.3–3.4 / 3.4 kl. 22:35 | 74 722 uten innsjekket bagasje; 80 710 alternativ bagasjefare i søketreff | 17t50 / 17t40 | 11 / 12 | 3 | 323,67 timer |
| Tokyo tur/retur, ANA | 18.3–5.4 / 6.4 kl. 00:05 | 56 752 søketreff + returtransport | 20t30 / 19t45 | 16 / 17 før ekstra transport | 6–7; planlegg med 7 | 448,83 timer |

FINN-treff er ikke bekreftede sluttpriser. KLMs bagasjefare er et alternativt selgertilbud, ikke et dokumentert bagasjetillegg til grunnprisen eller en optimal fare for akkurat to kolli.

Thai 18.3–5.4: direkte total 66 874 = 40 016 i flypris + 26 858 i skatter/avgifter. Begge reiser valgt; eksplisitt total for 3 voksne og 1 barn vist før personopplysninger. Economy FLEXI (Q) ut og STANDARD (S) hjem. Valgte farekort viste 2 × 23 kg ut og 1 × 23 kg hjem per person. Detaljdialog viste også 7 kg håndbagasje. To innsjekkede kolli totalt krever derfor ikke tillegg. Historisk FINN-pris 65 498 er bevart.

Thai 21.3–5.4: selger viste også 64 408 med Trustly-rabatt; ubetinget delsum var 65 696. Bruk direkte flyselskapspris 65 768 i sammenligningen.

## Vurdering

- **Best dokumentert kompromiss:** Thai 21.3–5.4, 65 768 direkte. 13 hele Japan-dager for 4–5 skoledager; ingen nødvendig retur til innreisebyen.
- **Mer tid for liten ekstra flykostnad:** Thai 18.3–5.4 koster 1 106 mer direkte og gir tre ekstra hele dager/netter, men to ekstra skoledager. Ekstra hotell, mat og aktiviteter kommer i tillegg.
- **Mest tid per tapt skoledag blant detaljkandidatene:** KLM 21.3–3.4, 11/3 = 3,67 hele kalenderdager per skoledag, men vesentlig dyrere når bagasje tas med. Thai 21.3–5.4 gir 2,60–3,25. Ratio alene belønner korte turer og er ikke en full nyttevurdering.
- **Laveste multi-city-prisspor:** JAL/Iberia 57 486, men ni skoledager, 23t10 hjem og svakere selger-/billettkontroll.
- **Mulig lavere totaløkonomi:** ANA 56 752 kan fortsatt bli billigere enn Thai, men trenger ekstra transport Osaka–Tokyo. Datert planleggingsgrunnlag er 50 820 JPY for 3 voksne + 1 barn og 4–6 timer dør til dør. Fersk kurs, sesongtillegg, lokal-/flyplasstransport og mulig hotell må legges til. Ikke kåret til billigst totalt.

## Risiko og gjenstående kontroll

Alle beskyttelsesstatuser er uttrykkelig uavklart. Direkte Thai er ett sammenhengende flyselskapsforløp med to segmenter i hver retning; det gir sterkere evidens enn aggregatorsøk, men eksplisitt kontraktsgrunnlag for tapte forbindelser er ikke kontrollert for akkurat produktet. Ingen separate billetter eller selvbetjent transfer anbefales.

Thai har BKK-transfer 1t55 ut og 2t10 hjem. Generelt transfergrunnlag i rundedata oppgir rundt 90 min minimum og 120 min anbefaling: ut er fem minutter under anbefalingen. Bekreft terminal/SAT-1, bagasje til endelig destinasjon og håndtering ved forsinkelse. KLM har AMS 4t20/1t40 eller 2t15/1t40. JAL/Iberia har HEL 2t05 og MAD 3t50; operatør og eventuelt T4/T4S-bytte gjenstår. ANA har FRA 5t30/3t20, lang passiv venting uten dokumentert bybesøk.

KLM direkte har tidligere feilet med feil rutetype og lasting. Google Flights feilet etter én retry. Disse feilene er bevart, ikke brukt som priser. FINN-observasjoner ble ofte tatt mens flere tilbydere fortsatt lastet; de er konkrete observerte priser, ikke påstand om globalt billigste resultat.

Før beslutning: velg ønsket skolefravær/oppholdslengde, pris de aktuelle finalistene på nytt direkte, kontroller gjennomgående beskyttelse og bagasje, og legg til forskjellen i hotell/dagskostnad eller returtransport. Ingen endelig vinner på full totaløkonomi.

## Kontroll og gjenopptakelse

JSON-syntaks, 24/24-matrise, stabile ID-er, 3+1, lokale segmenttider/transfer, skolefravær og historikkbevaring er kontrollert. Repoets public-content, data-integrity og content-style-kontroller passerte på gjenopprettet datasett. Nye pris-/tidsfelt ble kontrollert særskilt; 40 016 + 26 858 = 66 874. Ingen identitetsdata eller sesjonslenker er skrevet til repoet. Publisert versjon er uendret; release-versjonskontrollen gjelder ikke publisering i denne oppgaven.

Data sluttkontroll: fac504d8ac26e7dc33fb73c7b3a73d0b2e33cb30. Rapporten committes etter data. Hent branch og kanonisk JSON ved gjenopptakelse. Gjenta ikke fullførte discovery-søk.

Kilder: eksakte offentlige FINN-søk og kontrolltidspunkter, direkte Thai-farekontroller, offisiell skolerute og offisielle transfer-/toggrunnlag ligger i kanonisk JSON. [Thai Airways](https://www.thaiairways.com/en-no/) er inngang for direkte ny prising.
