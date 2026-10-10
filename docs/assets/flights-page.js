/* Flight research decision page. Authoritative values come from data/flights.json. */
async function renderFlightsResearch() {
  nav('flights');
  footer();
  await applyPageCopy('flights');
  const [data, trip, fx] = await Promise.all([json('data/flights.json'), json('data/trip.json'), loadFx()]);
  const current = data.research?.currentRoundRef;
  const round = data.research?.searchRounds?.find(item => item.id === current);
  const root = document.getElementById('flight-r-overview');
  if (!round) {
    root.textContent = 'Flyresearch er ikke tilgjengelig. Prøv å laste siden på nytt.';
    return;
  }
  const routeLabels = {
    A: 'Tokyo inn · Osaka hjem',
    B: 'Osaka inn · Tokyo hjem',
    C: 'Tokyo tur/retur',
    D: 'Osaka tur/retur'
  };
  const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
  const safeUrl = raw => {
    try {
      const u = new URL(raw);
      if (u.protocol !== 'https:' || /(?:token|session|checkout|booking_ref|pnr|api_key|email|password|auth)/i.test(u.search)) return '';
      return html(u.toString());
    } catch { return ''; }
  };
  const link = (url, label, primary) => {
    const destination = safeUrl(url);
    return destination ? '<a class="button' + (primary ? ' primary' : '') + '" href="' + destination + '" target="_blank" rel="noopener noreferrer">' + html(label) + ' ↗</a>' : '';
  };
  const date = value => value ? new Intl.DateTimeFormat('nb-NO', { day:'numeric',month:'short',timeZone:'UTC' }).format(new Date(value.slice(0,10) + 'T12:00:00Z')) : '—';
  const dayAndTime = value => value ? date(value) + ' kl. ' + html(value.slice(11,16)) : '—';
  const min = value => Number.isFinite(value) ? Math.floor(value/60) + ' t ' + String(value%60).padStart(2,'0') : '—';
  const money = value => Number.isFinite(value) ? dualMoneyHtml(fmtNok(value), fmtJpy(jpyFromNok(value,fx))) : 'Pris ikke oppgitt';
  const absence = item => {
    const range = item?.schoolAbsence?.lostDaysRange;
    return Array.isArray(range) ? (range[0] === range[1] ? String(range[0]) : range[0] + '–' + range[1]) : '—';
  };
  const legs = leg => leg ? [leg.from, ...(leg.transferAirports || []), leg.to].filter(Boolean).map(html).join(' → ') : '—';
  const airline = item => html((item.airlines || []).join(' / ') || 'Flyselskap ikke oppgitt');
  const checked = value => value ? 'Kontrollert ' + html(fmtLongDate(value.slice(0,10))) : '';
  const checksByCandidate = new Map();
  for (const check of round.directChecks || []) {
    if (!check.candidateId || check.status !== 'priced') continue;
    if (!checksByCandidate.has(check.candidateId)) checksByCandidate.set(check.candidateId, []);
    checksByCandidate.get(check.candidateId).push(check);
  }
  const carrierCheck = candidate =>
    candidate.selectedCarrierOffer ||
    (checksByCandidate.get(candidate.id) || []).find(c => c.service === 'Thai Airways') ||
    null;
  const directPrice = candidate => {
    const carrier = carrierCheck(candidate);
    return carrier?.price?.amount && Number.isFinite(carrier.price.amount) ? carrier.price.amount : candidate.price?.amount;
  };
  const directSource = candidate => Boolean(carrierCheck(candidate)?.price?.amount);
  const candidateIds = new Map((round.candidates || []).map((item, i) => [item.id, i]));

  const focusId = round.candidates?.[0]?.id;
  const focus = round.candidates?.[0];
  root.innerHTML = '<div class="flight-r-hero">' +
    '<div><div class="flight-r-hero-kicker">Flyresearch · ' + html(date(round.asOf)) + ' ' + round.asOf.slice(0,4) + '</div>' +
    '<h2>Reelle datoalternativer – uten låst reiselengde</h2>' +
    '<p>Vi sammenligner faktisk tid i Japan, skolefravær, pris og forbindelser. Reisens datoer er fortsatt tentative.</p>' +
    '<div class="flight-r-stats">' +
    '<div><strong>' + round.counts.uniqueRouteDateCombinations + '</strong><span>rute- og datokombinasjoner</span></div>' +
    '<div><strong>' + round.counts.recordedFinnPriceObservations + '</strong><span>observerte familiepriser</span></div>' +
    '<div><strong>' + round.candidates.length + '</strong><span>utvalgte alternativer</span></div>' +
    '</div></div>' +
    '<aside><span class="flight-r-aside-title">Interessant startpunkt</span>' +
    (focus ? '<strong>' + html(routeLabels[focus.routeType]) + '</strong>' +
      '<p>' + date(focus.departDate) + ' – ' + date(focus.returnDate) + '</p>' +
      '<div class="flight-r-aside-price">' + money(directPrice(focus)) + '</div>' +
      '<p>' + html(String(focus.japanStay.fullCalendarDays)) + ' hele Japan-dager · ' + absence(focus) + ' skoledager</p>' +
      '<a class="flight-r-aside-link" href="#flight-r-picks">Se alternativene ↓</a>' : '') +
    '</aside></div>' +
    '<p class="flight-r-scope"><strong>Prisgrunnlag:</strong> Economy, 3 voksne + 1 barn, totalt fire personer. ' +
    'Oslo skolerute: fri 22.–30. mars 2027. Antall hele Japan-dager utelater ankomst- og avreisedagen og tar ikke høyde for reisedager inne i Japan. ' +
    link(round.schoolCalendar.oslo.source, 'Offisiell skolerute') + '</p>';

  const pickRoot = document.getElementById('flight-r-pick-list');
  const pickLabels = [
    'Balanse mellom pris og tid',
    'Få tapte skoledager',
    'Lengre opphold',
    'Lavere søkepris – større skolefravær',
    'Tokyo først',
    'Kortere tur med Tokyo først',
    'Tur/retur – krever ekstra tog'
  ];
  pickRoot.innerHTML = '<div class="flight-r-picks">' + (round.candidates || []).map((c, i) => {
    const carrier = carrierCheck(c);
    const isCarrier = directSource(c);
    const bag = carrier?.baggage;
    const allowance = bag
      ? 'Direkte kontroll: ' + html(bag.inboundCheckedPiecesPerPerson ?? c.baggage.checkedPiecesPerPerson) + ' × ' + html(bag.checkedKgPerPiece || 23) + ' kg per person hjem; to kolli totalt er inkludert.'
      : c.baggage?.checkedPiecesPerPerson === 0
        ? 'Grunnprisen viser ingen innsjekket bagasje. Bagasjepris kommer i tillegg.'
        : c.baggage?.checkedPiecesPerPerson > 0
          ? 'Søketreffet viser innsjekket bagasje, men billettvilkårene er ikke bekreftet.'
          : 'Bagasje må kontrolleres hos selger.';
    const extraTrain = c.routeType === 'C' || c.routeType === 'D';
    const checkDate = carrier?.checkedAt || c.checkedAt;
    const idsafe = 'flight-pick-' + i;
    return '<article class="flight-r-pick" id="' + idsafe + '">' +
      '<div class="flight-r-pick-top"><span>' + html(pickLabels[i] || 'Aktuelt alternativ') + '</span><span>' + (isCarrier ? 'Pris fra flyselskap' : 'Søkepris') + '</span></div>' +
      '<h3>' + html(routeLabels[c.routeType]) + '</h3>' +
      '<p class="flight-r-dates">' + date(c.departDate) + ' – ' + date(c.returnDate) + ' 2027' +
      '<small>Fly hjem fra Japan ' + date(c.returnDate) + ' · i Oslo ' + dayAndTime(c.totalTravel?.toOslArrivalLocal) + '</small></p>' +
      '<div class="flight-r-price">' + money(directPrice(c)) + '</div>' +
      '<p class="flight-r-price-note">' + (isCarrier ? 'Begge flyretninger valgt hos ' + html(carrier.service) + '; ingen billett kjøpt.' :
        'Familietotal i søketreff hos ' + html(c.provider || c.service) + '. Pris hos selger må bekreftes.') + '</p>' +
      '<div class="flight-r-metrics">' +
      '<div><b>' + html(c.japanStay?.fullCalendarDays) + '</b><span>hele dager i Japan</span></div>' +
      '<div><b>' + html(c.japanStay?.calendarNights) + '</b><span>netter i Japan</span></div>' +
      '<div><b>' + absence(c) + '</b><span>tapte skoledager</span></div></div>' +
      '<p class="flight-r-timing">' + airline(c) + ' · ' + min(c.outbound?.durationMin) + ' ut / ' + min(c.inbound?.durationMin) + ' hjem</p>' +
      '<p class="flight-r-explanation">' + html(c.why) + '</p>' +
      (extraTrain ? '<p class="flight-r-caution">Tur/retur til samme by: ekstra reise gjennom Japan må med i totalen.</p>' : '') +
      '<div class="flight-r-actions">' + link(c.publicUrl,'Gjenta samme datosøk',true) +
      (carrier ? link(carrier.publicUrl,'Søk hos ' + carrier.service) : '') + '</div>' +
      '<details class="flight-r-details"><summary>Flytider, bagasje og risiko</summary>' +
      '<div><strong>Ut:</strong> ' + legs(c.outbound) + ' · ' + min(c.outbound?.durationMin) +
      '<br><strong>Hjem:</strong> ' + legs(c.inbound) + ' · ' + min(c.inbound?.durationMin) +
      '<br><strong>Mellomlandinger:</strong> ' + (c.outbound?.transferMinutes || []).map(min).join(', ') +
      ' ut / ' + (c.inbound?.transferMinutes || []).map(min).join(', ') + ' hjem</div>' +
      '<p>' + allowance + '</p>' +
      '<p><strong>Billettbeskyttelse:</strong> Må bekreftes for valgt billett. Et samlet søketreff garanterer ikke beskyttet forbindelse.</p>' +
      (c.connection?.familyMarginAssessment?.note ? '<p>' + html(c.connection.familyMarginAssessment.note) + '</p>' : '') +
      '<small>' + checked(checkDate) + ' · Pris er en observasjon, ikke en reservasjon.</small>' +
      '</details></article>';
  }).join('') + '</div>';

  const controls = document.getElementById('flight-r-search-controls');
  const groupedRuns = new Map();
  for (const run of round.searchRuns || []) {
    const key = [run.routeType, run.departDate, run.returnDate].join('|');
    if (!groupedRuns.has(key)) groupedRuns.set(key, {...run, observedOffers: []});
    const grouped = groupedRuns.get(key);
    for (const offer of run.observedOffers || []) {
      if (!grouped.observedOffers.some(item =>
        item.priceNok === offer.priceNok && item.provider === offer.provider &&
        (item.airlines || []).join(',') === (offer.airlines || []).join(','))) {
        grouped.observedOffers.push(offer);
      }
    }
    if (run.checkedAt > grouped.checkedAt) {
      grouped.checkedAt = run.checkedAt;
      grouped.publicUrl = run.publicUrl;
    }
  }
  const runs = [...groupedRuns.values()];
  const counts = Object.fromEntries(Object.keys(routeLabels).map(k => [k, runs.filter(run => run.routeType === k).length]));
  controls.innerHTML = '<div class="flight-r-filter-buttons" role="group" aria-label="Velg flyrute">' +
    '<button type="button" data-flight-route="ALL" aria-pressed="true">Alle ' + runs.length + '</button>' +
    Object.entries(routeLabels).map(([k,v]) => '<button type="button" data-flight-route="' + k + '" aria-pressed="false">' + html(v) + ' (' + counts[k] + ')</button>').join('') +
    '</div><div class="flight-r-filter-secondary">' +
    '<label for="flight-r-sort">Sorter etter <select id="flight-r-sort"><option value="date">Avreisedato</option><option value="price">Laveste observerte pris</option><option value="long">Lengst reiseperiode</option></select></label>' +
    '<label for="flight-r-query">Finn flyselskap eller dato <input type="search" id="flight-r-query" placeholder="F.eks. Thai, 21.03 eller 05.04"></label>' +
    '</div><p class="flight-r-count" id="flight-r-count"></p>';
  const results = document.getElementById('flight-r-search-results');
  let routeFilter = 'ALL';
  const rowPrice = run => Math.min(...(run.observedOffers || []).map(x => x.priceNok).filter(Number.isFinite));
  const drawRuns = () => {
    const query = document.getElementById('flight-r-query').value.toLocaleLowerCase('nb-NO').trim();
    const sort = document.getElementById('flight-r-sort').value;
    const visible = runs.filter(run => {
      if (routeFilter !== 'ALL' && routeFilter !== run.routeType) return false;
      const text = [routeLabels[run.routeType],run.departDate,run.returnDate,
        date(run.departDate),date(run.returnDate),...(run.observedOffers || []).flatMap(x => [x.provider, ...(x.airlines || [])])].join(' ').toLocaleLowerCase('nb-NO');
      return !query || text.includes(query);
    });
    visible.sort((a,b) => sort === 'price' ? rowPrice(a)-rowPrice(b) :
      sort === 'long' ? (Date.parse(b.returnDate)-Date.parse(b.departDate))-(Date.parse(a.returnDate)-Date.parse(a.departDate)) :
      a.departDate.localeCompare(b.departDate) || a.returnDate.localeCompare(b.returnDate) || a.routeType.localeCompare(b.routeType));
    document.getElementById('flight-r-count').textContent = visible.length + ' av ' + runs.length +
      ' dokumenterte søk · Datopar kan ha flere pristilbud. Alle beløp er observerte familietotaler, ikke garanterte sluttpriser.';
    if (!visible.length) {
      results.innerHTML = '<p class="flight-r-empty">Ingen søk passer dette filteret.</p>';
      return;
    }
    results.innerHTML = '<div class="flight-matrix-scroll" role="region" aria-label="Dokumenterte flysøk" tabindex="0">' +
      '<table class="flight-r-table"><thead><tr><th scope="col">Rute</th><th scope="col">Utreise fra Oslo</th>' +
      '<th scope="col">Retur fra Japan</th><th scope="col">Observert familiepris</th><th scope="col">Fly / selger</th><th scope="col">Åpne søket</th></tr></thead><tbody>' +
      visible.map(run => {
        const list = (run.observedOffers || []).filter(x => Number.isFinite(x.priceNok)).sort((a,b)=>a.priceNok-b.priceNok);
        const offer = list[0];
        const other = list.length > 1 ? '<details><summary>' + (list.length-1) + ' ekstra tilbud</summary>' +
          list.slice(1).map(x => '<p>' + html(fmtNok(x.priceNok)) + ' · ' + html((x.airlines || []).join(' / ')) + ' · ' + html(x.provider) + '</p>').join('') +
          '</details>' : '';
        return '<tr><th scope="row">' + html(routeLabels[run.routeType]) + '</th>' +
          '<td>' + date(run.departDate) + '</td><td>' + date(run.returnDate) + '</td>' +
          '<td><strong>' + (offer ? money(offer.priceNok) : 'Ingen pris') + '</strong>' + other + '</td>' +
          '<td>' + (offer ? html((offer.airlines||[]).join(' / ')) + '<small>' + html(offer.provider) + ' · ' +
          (offer.baggage?.checkedPiecesPerPerson ? 'bagasje vist' : 'bagasje må sjekkes') + '</small>' : '—') + '</td>' +
          '<td>' + link(run.publicUrl,'Gjenta søk') + '<small>' + checked(run.checkedAt) + '</small></td></tr>';
      }).join('') + '</tbody></table></div>';
  };
  controls.querySelectorAll('[data-flight-route]').forEach(button => button.addEventListener('click', () => {
    routeFilter = button.dataset.flightRoute;
    controls.querySelectorAll('[data-flight-route]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    drawRuns();
  }));
  controls.querySelector('#flight-r-sort').addEventListener('change',drawRuns);
  controls.querySelector('#flight-r-query').addEventListener('input',drawRuns);
  drawRuns();

  const train = round.roundTripControls?.extraTransport;
  document.getElementById('flight-r-context').innerHTML =
    '<div class="flight-r-context-grid">' +
    '<article><h3>Hva tallene betyr</h3><p>Prisene er kontrollert ' + html(fmtLongDate(round.asOf)) + ' og gjelder fire personer. ' +
    'Priser fra flyselskap er kontrollert etter at flyvalg og billettype ble valgt, men før personopplysninger og betaling.</p>' +
    '<p>Flyselskapets bagasjetilbud kan være forskjellig fra et reisebyrås grunnpris. ' +
    'Sammenlign derfor pris med bagasje, full reisetid og praktiske forhold – ikke bare laveste beløp.</p></article>' +
    '<article><h3>Skole og tid i Japan</h3><p>Første skoledag etter påske er ' + date(round.schoolCalendar.oslo.resumes) +
    '. Ankomst til Oslo tidlig om morgenen kan gi én ekstra fraværsdag. ' +
    'Dette vises som et intervall i de aktuelle alternativene.</p>' +
    '<p>En hel Japan-dag er en dag mellom ankomst- og avreisedagen. Transport mellom basene og jetlag kommer i tillegg.</p></article>' +
    '<article><h3>Returtransport ved tur/retur</h3>' +
    (train ? '<p>Ved tur/retur til samme by må ruten suppleres med ekstra tog gjennom Japan: ' +
      dualFromJpy(train.familyCostYen,fx) + ' for reisefølget og ca. ' + train.doorToDoorHours.join('–') +
      ' timer dør til dør i planleggingsgrunnlaget.</p><p>Flyplasstransport og mulig ekstra hotellnatt er ikke med.</p>' +
      link(train.source,'Prisgrunnlag for toget') : '') + '</article>' +
    '<article><h3>Før vi bestemmer oss</h3><p>Kontroller totalpris, billettregler, gjennomgående forbindelse, ' +
    'bagasjeregler og terminalbytte direkte hos aktuell selger. Én mellomlanding er ikke automatisk risikofri.</p>' +
    '<p>Flydatoene er søkeeksempler, ikke en bekreftet reiseplan. Ruten og hotellene tilpasses etter flyvalget.</p></article>' +
    '</div>';

  const direct = (round.directChecks || []).filter(item => item.status === 'priced' && item.service === 'Thai Airways');
  document.getElementById('flight-r-direct').innerHTML =
    '<p>De mest dokumenterte prisene gjelder Thai Airways. De kan søkes på nytt via flyselskapets egen side. ' +
    'Søk flere byer: Oslo–Osaka og Tokyo–Oslo med 3 voksne + 1 barn.</p>' +
    '<div class="flight-r-direct-options">' + direct.map(item => '<div><strong>' +
      date(item.departDate || (round.candidates.find(c=>c.id===item.candidateId)?.departDate)) + ' – ' +
      date(item.returnDate || (round.candidates.find(c=>c.id===item.candidateId)?.returnDate)) +
      '</strong><span>' + money(item.price?.amount) + '</span>' +
      link(item.publicUrl || 'https://www.thaiairways.com/en-no/','Søk hos Thai') + '</div>').join('') + '</div>' +
    '<p class="small">Andre kandidater åpnes fra sine egne kort eller via datotabellen ovenfor. ' +
    'Ingen lenker leder til personlige bestillingssesjoner.</p>';
}
