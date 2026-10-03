# Japan 2027

Offentlig planleggingsrepo for en mulig Japan-tur våren 2027. Nettsiden er laget som en enkel, datadrevet GitHub Pages-side som kan utvides uten rammeverk eller byggesteg.

> **Viktig:** Dette repoet er offentlig. Ikke legg inn private eller identifiserende opplysninger. Les `PUBLIC_DATA_POLICY.md` før du legger til eller endrer innhold.

## Publisering

GitHub Pages publiserer direkte fra:

- branch: `main`
- mappe: `/docs`

Nettsiden har ingen egen deploy-workflow og er ikke avhengig av GitHub Actions for å være tilgjengelig. GitHub Actions brukes bare til en enkel personvernkontroll ved endringer.

## Struktur

- `docs/` – selve GitHub Pages-nettsiden
- `docs/data/` – strukturert innhold som driver nettsiden
- `docs/place.html?id=<id>` – generisk detaljside for steder
- `PUBLIC_DATA_POLICY.md` – hva som aldri skal publiseres
- `AGENTS.md` – regler for ChatGPT/Codex/andre agenter som arbeider i repoet
- `scripts/check-public-content.mjs` – enkel automatisk kontroll for å fange vanlige lekkasjer
- `.github/workflows/privacy-check.yml` – valgfritt sikkerhetsnett; ikke en runtime-avhengighet

## Oppdatere reiseplanen

1. Oppdater `docs/data/trip.json` for rute og foreløpige datoer.
2. Legg til eller oppdater steder i `docs/data/places.json`.
3. Oppdater forberedelser i `docs/data/prep.json`.
4. Legg kilder i `docs/data/sources.json`.
5. Kjør `node scripts/check-public-content.mjs` før commit.

Nettsiden er med vilje uten byggeverktøy. Det gjør den enkel å forstå, endre og flytte til en annen statisk host senere om ønskelig.
