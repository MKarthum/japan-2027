#!/usr/bin/env node
/**
 * SerpApi Google Flights probe for Japan 2027.
 *
 * No dependencies and no booking. This is a limited feasibility test, NOT
 * publication-ready fare research. Never commit the probe output.
 *
 * Examples:
 *   node scripts/serpapi-japan-probe.mjs --dry-run
 *   SERPAPI_API_KEY=... node scripts/serpapi-japan-probe.mjs --live
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const PROBES = Object.freeze([
  { id: 'tokyo-in-osaka-out', kind: 'multi-city', depart: '2027-03-19', return: '2027-04-04', legs: [['OSL', 'HND,NRT'], ['KIX', 'OSL']] },
  { id: 'osaka-in-tokyo-out', kind: 'multi-city', depart: '2027-03-20', return: '2027-04-04', legs: [['OSL', 'KIX'], ['HND,NRT', 'OSL']] },
  { id: 'tokyo-return', kind: 'round-trip', depart: '2027-03-20', return: '2027-04-04', legs: [['OSL', 'HND,NRT'], ['HND,NRT', 'OSL']] },
  { id: 'osaka-return', kind: 'round-trip', depart: '2027-03-20', return: '2027-04-04', legs: [['OSL', 'KIX'], ['KIX', 'OSL']] }
]);

export function searchParams(probe, token) {
  const p = {
    engine: 'google_flights',
    type: probe.kind === 'multi-city' ? '3' : '1',
    currency: 'NOK',
    gl: 'no',
    hl: 'en',
    travel_class: '1',
    adults: '3',
    children: '1',
    stops: '2', // Google Flights: one stop OR fewer.
    sort_by: '1'
  };
  if (probe.kind === 'multi-city') {
    p.multi_city_json = JSON.stringify([
      { departure_id: probe.legs[0][0], arrival_id: probe.legs[0][1], date: probe.depart },
      { departure_id: probe.legs[1][0], arrival_id: probe.legs[1][1], date: probe.return }
    ]);
  } else {
    p.departure_id = probe.legs[0][0];
    p.arrival_id = probe.legs[0][1];
    p.outbound_date = probe.depart;
    p.return_date = probe.return;
  }
  if (token) p.departure_token = token;
  return p;
}

export function flightChoices(payload) {
  return [
    ...(Array.isArray(payload?.best_flights) ? payload.best_flights : []),
    ...(Array.isArray(payload?.other_flights) ? payload.other_flights : [])
  ];
}

export function summarizeChoice(entry) {
  const legs = Array.isArray(entry?.flights) ? entry.flights : [];
  const layovers = Array.isArray(entry?.layovers) ? entry.layovers : [];
  const first = legs[0], last = legs.at(-1);
  const durationMin = Number.isFinite(entry?.total_duration) ? entry.total_duration : null;
  const priceNok = Number.isFinite(entry?.price) && entry.price > 0 ? entry.price : null;
  return {
    priceNok,
    durationMin,
    stops: legs.length ? legs.length - 1 : null,
    from: first?.departure_airport?.id ?? null,
    to: last?.arrival_airport?.id ?? null,
    departureLocal: first?.departure_airport?.time ?? null,
    arrivalLocal: last?.arrival_airport?.time ?? null,
    airlines: [...new Set(legs.map(v => v.airline).filter(Boolean))],
    layovers: layovers.map(v => ({
      airport: v?.id ?? null,
      durationMin: Number.isFinite(v?.duration) ? v.duration : null,
      overnight: v?.overnight === true
    })),
    selfTransferWarnings: Array.isArray(entry?.extensions)
      ? entry.extensions.filter(v => /separate tickets|self.transfer|self transfer|own transfer/i.test(String(v)))
      : [],
    hasNextLeg: Boolean(entry?.departure_token),
    hasBookingOptions: Boolean(entry?.booking_token)
  };
}

export function qualitySignals(legs) {
  if (legs.length < 2) return { acceptableTime: null, acceptableStops: null, airportMatch: null };
  const durations = legs.map(v => v.durationMin);
  const stops = legs.map(v => v.stops);
  const airportMatch = legs[0].from === 'OSL' && legs[1].to === 'OSL';
  return {
    acceptableTime: durations.every(x => typeof x === 'number' && x <= 24 * 60),
    acceptableStops: stops.every(x => typeof x === 'number' && x <= 1),
    airportMatch
  };
}

function getFlags(argv) {
  const live = argv.includes('--live');
  const dryRun = argv.includes('--dry-run') || !live;
  if (live && argv.includes('--dry-run')) throw new Error('Choose --live OR --dry-run.');
  const maxRaw = argv.find(x => x.startsWith('--max-requests='));
  const maxRequests = maxRaw ? Number(maxRaw.split('=')[1]) : 12;
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 40) {
    throw new Error('max-requests must be an integer between 1 and 40');
  }
  return { live, dryRun, maxRequests };
}

async function apiCall(params, key) {
  const url = new URL('https://serpapi.com/search.json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('api_key', key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    // Intentionally do not print the API URL or body; those could contain credentials.
    throw new Error('SerpApi HTTP ' + response.status);
  }
  const data = await response.json();
  if (data.error) throw new Error('SerpApi returned an error; see account usage/status (details suppressed)');
  if (data.search_metadata?.status === 'Error') throw new Error('SerpApi search status Error');
  return data;
}

export async function runLive({ key, maxRequests, query = apiCall }) {
  if (!key) throw new Error('Missing SERPAPI_API_KEY. Do not put it in repo or chat.');
  const checkedAt = new Date().toISOString();
  const output = {
    schema: 'serpapi-japan-feasibility-v1',
    checkedAt,
    service: 'SerpApi / Google Flights',
    travelers: { adults: 3, children: 1, childAgeBand: 'Google Flights child category; exact fare rules not confirmed' },
    source: 'https://serpapi.com/google-flights-api',
    publicSearchUrl: 'https://www.google.com/travel/flights',
    limits: {
      description: 'No fare is declared ticketed, protected, luggage-inclusive or bookable without airline/agent confirmation.',
      quoteIsFamilyTotalOnlyWhenFullItinerary: true,
      noBagPricing: true,
      noTicketProtectionVerification: true
    },
    requestsUsed: 0,
    probes: []
  };
  for (const probe of PROBES) {
    const row = { id: probe.id, type: probe.kind, depart: probe.depart, return: probe.return, legs: probe.legs, status: 'not-started', observations: [] };
    output.probes.push(row);
    if (output.requestsUsed >= maxRequests) {
      row.status = 'request-cap-reached';
      continue;
    }
    try {
      output.requestsUsed++;
      const initial = await query(searchParams(probe), key);
      const candidates = flightChoices(initial);
      row.initialOptions = candidates.length;
      row.initialStatus = initial.search_metadata?.status ?? 'unknown';
      const first = candidates[0];
      if (!first) {
        row.status = 'no-results-or-incomplete';
        continue;
      }
      const firstSummary = summarizeChoice(first);
      row.observations.push({ stage: 'first-leg', ...firstSummary, priceScope: 'NOT_A_VERIFIED_FULL_ITINERARY' });
      if (!first.departure_token) {
        // An initial result may look complete. Never assume round-trip/open-jaw total.
        row.status = 'missing-next-leg-token';
        continue;
      }
      if (output.requestsUsed >= maxRequests) {
        row.status = 'request-cap-reached-before-second-leg';
        continue;
      }
      output.requestsUsed++;
      const next = await query(searchParams(probe, first.departure_token), key);
      row.secondOptions = flightChoices(next).length;
      const second = flightChoices(next)[0];
      if (!second) {
        row.status = 'no-second-leg-results';
        continue;
      }
      const secondSummary = summarizeChoice(second);
      row.observations.push({
        stage: 'second-leg',
        ...secondSummary,
        // Booking token after selecting both legs is evidence of a
        // complete itinerary quote, NOT evidence of protected ticketing.
        priceScope: second.booking_token && !second.departure_token
          ? 'APPARENT_FULL_ITINERARY_SEARCH_QUOTE'
          : 'UNVERIFIED_FULL_ITINERARY'
      });
      row.quality = qualitySignals([firstSummary, secondSummary]);
      row.status = second.booking_token && !second.departure_token
        ? 'price-observed-not-booking-verified'
        : 'full-itinerary-unconfirmed';
      // Do NOT call booking_token automatically: spend/conditions require manual review.
    } catch (e) {
      row.status = 'api-error';
      row.error = String(e?.message ?? 'unknown').slice(0, 180);
    }
  }
  return output;
}

async function main() {
  const args = getFlags(process.argv.slice(2));
  if (args.dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run, NO API calls',
      scenarios: PROBES.map(probe => ({ id: probe.id, params: searchParams(probe) })),
      maxRequestsOnLive: args.maxRequests,
      note: 'This is a feasibility probe; not the full school-holiday date matrix.'
    }, null, 2));
    return;
  }
  const result = await runLive({ key: process.env.SERPAPI_API_KEY, maxRequests: args.maxRequests });
  const dirname = path.resolve('.local-flight-search');
  await mkdir(dirname, { recursive: true });
  const dest = path.join(dirname, 'japan-serpapi-probe-' + result.checkedAt.slice(0, 10) + '.json');
  await writeFile(dest, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  console.log('Requests: ' + result.requestsUsed + '/' + args.maxRequests);
  for (const p of result.probes) console.log(p.id + ': ' + p.status + ' (' + (p.initialOptions ?? 0) + ' initial results)');
  console.log('Local report: ' + dest);
  console.log('Review manually; do NOT commit or publish the local report directly.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(String(err?.message ?? err));
    process.exitCode = 1;
  });
}
