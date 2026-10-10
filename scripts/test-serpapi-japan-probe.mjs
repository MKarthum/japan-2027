import assert from 'node:assert/strict';
import { PROBES, searchParams, summarizeChoice, qualitySignals, runLive } from './serpapi-japan-probe.mjs';

const p = searchParams(PROBES[0]);
assert.equal(p.engine, 'google_flights');
assert.equal(p.type, '3');
assert.equal(p.adults, '3');
assert.equal(p.children, '1');
assert.equal(p.stops, '2');
assert.equal(p.currency, 'NOK');
assert.deepEqual(JSON.parse(p.multi_city_json), [
  { departure_id: 'OSL', arrival_id: 'HND,NRT', date: '2027-03-19' },
  { departure_id: 'KIX', arrival_id: 'OSL', date: '2027-04-04' }
]);
assert.equal(searchParams(PROBES[2]).type, '1');
assert.equal(searchParams(PROBES[2]).return_date, '2027-04-04');

const summary = summarizeChoice({
  price: 56000,
  total_duration: 980,
  flights: [
    { airline: 'Finnair', departure_airport: { id: 'OSL', time: '2027-03-19 10:00' }, arrival_airport: { id: 'HEL' } },
    { airline: 'Finnair', departure_airport: { id: 'HEL' }, arrival_airport: { id: 'HND', time: '2027-03-20 08:00' } }
  ],
  layovers: [{ id: 'HEL', duration: 110 }],
  departure_token: 'secret-token'
});
assert.equal(summary.stops, 1);
assert.equal(summary.durationMin, 980);
assert.equal(summary.hasNextLeg, true);
assert.equal(summary.from, 'OSL');
assert.equal(summary.to, 'HND');
assert.equal(qualitySignals([summary, { ...summary, from: 'KIX', to: 'OSL' }]).acceptableTime, true);
assert.equal(qualitySignals([summary, { ...summary, from: 'KIX', to: 'OSL' }]).airportMatch, true);

const mock = async params => {
  const isSecondLeg = Boolean(params.departure_token);
  if (!isSecondLeg) return { search_metadata: { status: 'Success' }, best_flights: [{
    price: 39000, total_duration: 980,
    flights: [{ airline: 'Example Air', departure_airport: { id: 'OSL' }, arrival_airport: { id: 'HND' } }],
    departure_token: 'fake-secret-token'
  }] };
  return { search_metadata: { status: 'Success' }, best_flights: [{
    price: 62000, total_duration: 1000,
    flights: [{ airline: 'Example Air', departure_airport: { id: 'KIX' }, arrival_airport: { id: 'OSL' } }],
    booking_token: 'fake-booking-token'
  }] };
};
const result = await runLive({ key: 'example-not-real', maxRequests: 8, query: mock });
assert.equal(result.requestsUsed, 8);
assert.equal(result.probes.length, 4);
assert.equal(result.probes[0].observations[0].priceScope, 'NOT_A_VERIFIED_FULL_ITINERARY');
assert.equal(result.probes[0].observations[1].priceScope, 'APPARENT_FULL_ITINERARY_SEARCH_QUOTE');
assert.equal(result.probes[0].status, 'price-observed-not-booking-verified');
assert.equal(JSON.stringify(result).includes('fake-booking-token'), false);
assert.equal(JSON.stringify(result).includes('example-not-real'), false);
assert.equal(JSON.stringify(result).includes('fake-secret-token'), false);

const bounded = await runLive({ key: 'example-not-real', maxRequests: 1, query: mock });
assert.equal(bounded.requestsUsed, 1);
assert.equal(bounded.probes[0].status, 'request-cap-reached-before-second-leg');
assert.equal(bounded.probes[1].status, 'request-cap-reached');

console.log('SerpApi probe tests PASS (no live API calls).');
