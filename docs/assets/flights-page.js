/* Flysiden bygger på kanoniske data fra flights.json og trip.json. */
async function renderFlightsResearch() {
  nav('flights'); footer(); await applyPageCopy('flights');
  const [data, trip, fx] = await Promise.all([json('data/flights.json'), json('data/trip.json'), loadFx()]);
  const round = data.research?.searchRounds?.find(r => r.id === data.research.currentRoundRef);
  const overview = document.getElementById('flight-r-overview');
  if (!round?.completeOptions?.length) {
    overview.textContent = 'Det finnes ennå ingen sammenstilte flyalternativer.';
    return;
  }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = value => { try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || [...url.searchParams.keys()].some(k => /(?:token|session|checkout|booking|pnr|auth|email|password|api.key)/i.test(k))) return '';
    return esc(url.href);
  } catch { return ''; }};
  const link = (url, label, primary = false) => {
    const href = safe(url);
    return href ? '<a class="button' + (primary ? ' primary' : '') + '" href="' + href + '" rel="noopener noreferrer" target="_blank">' + esc(label) + ' ↗</a>' : '';
  };
  const currency = n => Number.isFinite(n) ? dualMoneyHtml(fmtNok(n), fmtJpy(jpyFromNok(n,fx))) : 'Pris ikke verifisert';
  const simpleMoney = n => Number.isFinite(n) ? fmtNok(n) : '—';
  const date = iso => iso ? new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(iso.slice(0,10)+'T12:00:00Z')) : '—';
  const usdNok = usd => Math.round(usd * round.fxReference.nokPerUsd);
  const sourceMap = new Map(round.searchRuns.map(item => [item.id,item]));
  const source = id => sourceMap.get(id);
  const sourcePrice = part => part ? (part.nok != null ? part.nok : usdNok(part.usd)) : null;
  const detailsLink = id => link(source(id)?.publicUrl, 'Åpne flysøket');
  const total = opt => opt.flightTotalNok;
  const baseline = round.completeOptions.find(x => x.hub === 'japan');
  const checked = round.consolidatedAt || round.asOf.slice(0,10);
  const checkedLabel = date(checked) + ' 2026';
  const quote = '<span class="flight-hub-footnote">Prisene er observasjoner for fire personer (3 voksne i flypriskategori og 1 barn), ikke reserverte billetter. Ingen resultatpris er verifisert ved betaling.</span>';

  overview.innerHTML = '<div class="flight-r-hero flight-hub-hero"><div>' +
    '<span class="flight-r-hero-kicker">Flyresearch · ' + esc(checkedLabel) + '</span>' +
    '<h2>Billigere via Asia – men ikke alltid en bedre reise</h2>' +
    '<p>Shanghai via Helsinki eller Beijing kan gi lavere flypris. Se også direktefly til Beijing og den vanlige Japan-billetten som sammenligningsgrunnlag.</p>' +
    '<div class="flight-r-stats"><div><strong>' + round.searchRuns.length + '</strong><span>dokumenterte undersøkelser</span></div>' +
    '<div><strong>' + round.completeOptions.length + '</strong><span>prisede flykombinasjoner</span></div>' +
    '<div><strong>' + round.hypotheses.length + '</strong><span>hovedspor</span></div></div></div>' +
    '<aside><span class="flight-r-aside-title">Viktig om direktefly</span><strong>Oslo–Beijing, ikke Oslo–Shanghai</strong>' +
    '<p>' + esc(round.directRouteCheck.finding) + '</p>' +
    link(round.directRouteCheck.sources[0],'Avinors ruteopplysninger') + '</aside></div>' +
    '<p class="flight-r-scope">Før hotell og transport er laveste undersøkte flykombinasjon ' +
    '<strong>' + simpleMoney(Math.min(...round.completeOptions.filter(o=>o.hub==='shanghai').map(total))) +
    '</strong>. En billigere billett kan gi færre netter i Japan. Hotell og lokaltransport er kun illustrative tilleggsanslag. ' +
    link(round.schoolCalendar?.source,'Skolerute') + '</p>';

  const hubRoot = document.getElementById('flight-hub-branches');
  hubRoot.innerHTML = '<div class="flight-hub-branch-grid">' + round.hypotheses.map(h =>
    '<article class="flight-hub-branch" data-hub-card="' + esc(h.id) + '">' +
    '<div class="flight-hub-branch-head"><h3>' + esc(h.name) + '</h3><small>' + esc(h.status) + '</small></div>' +
    '<p>' + esc(h.summary) + '</p><button type="button" data-hub="' + esc(h.id) + '">Se alternativene →</button></article>'
  ).join('') + '</div>';

  const choicesRoot = document.getElementById('flight-r-pick-list');
  const hubInfo = document.getElementById('flight-hub-selected');
  let active = 'all';
  const fmtDetails = part => {
    if (!part) return 'Ingen separat regionalbillett';
    const query = source(part.id);
    return (part.nok != null ? fmtNok(part.nok) : esc(part.usd) + ' USD (ca. ' + fmtNok(usdNok(part.usd)) + ')') +
      ' · ' + esc(query?.service || 'Søk') + ' · ' + esc(query?.checkedAt?.slice(0,10) || '');
  };
  const drawOptions = () => {
    const shown = round.completeOptions.filter(c => active === 'all' || c.hub === active);
    choicesRoot.innerHTML = shown.length ? '<div class="flight-r-picks flight-hub-picks">' + shown.map((o,index) => {
      const extra = o.hotelTransportEstimateNok;
      const diff = baseline && o.id !== baseline.id ? baseline.flightTotalNok - o.flightTotalNok : null;
      return '<article class="flight-r-pick"><div class="flight-r-pick-top"><span>' + esc(o.tag) + '</span><span>Fire reisende</span></div>' +
        '<h3>' + esc(o.name) + '</h3>' +
        '<div class="flight-r-price">' + currency(o.flightTotalNok) + '</div>' +
        '<p class="flight-r-price-note">Flypriser før hotell og lokaltransport' +
        (diff != null ? ' · ' + esc(simpleMoney(diff)) + ' lavere enn Japan-referansen' : ' · Sammenligningsgrunnlag') + '</p>' +
        '<div class="flight-r-metrics"><div><b>' + esc(o.japanNights) + '</b><span>netter i Japan</span></div>' +
        '<div><b>' + esc(o.extraNightsShanghai) + '</b><span>netter i Shanghai</span></div>' +
        '<div><b>' + esc(o.schoolAbsence) + '</b><span>skolefravær</span></div></div>' +
        '<p class="flight-r-explanation">' + esc(o.summary) + '</p>' +
        (extra[1] > 0 ? '<p class="flight-hub-planning"><strong>Med foreløpig hotell- og transportanslag:</strong> ' +
          simpleMoney(o.flightTotalNok + extra[0]) + '–' + simpleMoney(o.flightTotalNok + extra[1]) +
          '<small>Ikke et innhentet overnattingstilbud. Mat, sightseeing og eventuell sen innsjekking kommer i tillegg.</small></p>' : '') +
        '<p class="flight-r-timing">' + esc(o.legs.join(' · ')) + '</p>' +
        '<div class="flight-r-actions">' + detailsLink(o.longhaul.id) + (o.regional ? detailsLink(o.regional.id) : '') + '</div>' +
        '<details class="flight-r-details"><summary>Datoer, flypriser og risiko</summary>' +
        '<p><b>Utreise fra Oslo:</b> ' + date(o.flightDates[0]) + ' 2027 · <b>Ankomst Japan:</b> ' + date(o.flightDates[1]) + '</p>' +
        '<p><b>Avreise Japan:</b> ' + date(o.flightDates[2]) + ' · <b>Tilbake i Oslo:</b> ' + date(o.flightDates[3]) + '</p>' +
        '<p><b>Langdistanse:</b> ' + fmtDetails(o.longhaul) + '</p>' +
        '<p><b>Regionalfly:</b> ' + fmtDetails(o.regional) + '</p>' +
        '<p><b>Risiko:</b> ' + esc(o.risk) + '</p>' +
        (o.extraHotelJapan ? '<p>' + esc(o.extraHotelJapan) + '</p>' : '') +
        '<p><b>Kostnadsanslag:</b> ' + esc(round.comparisonAssumptions.note) + '</p>' +
        '<small>Kontrollert ' + esc(o.checked) + ' · Faktisk billettype, bagasje, tilkoblingsbeskyttelse og kapasitet må sjekkes før kjøp.</small></details></article>';
    }).join('') + '</div>' :
    '<p class="flight-r-empty">Ingen fullstendig prissatt reise i dette sporet. Se vurderingen over og de dokumenterte søkene nedenfor.</p>';
    hubInfo.textContent = active === 'all' ? 'Alle dokumenterte flykombinasjoner' :
      (round.hypotheses.find(h=>h.id===active)?.name || 'Hovedspor') + ' · ' + shown.length + ' fullstendig prissatte alternativer';
    hubRoot.querySelectorAll('[data-hub]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hub===active)));
  };
  hubRoot.querySelectorAll('[data-hub]').forEach(button => button.addEventListener('click',()=>{
    active=button.dataset.hub;
    drawOptions();
    document.getElementById('flight-r-picks').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  document.getElementById('flight-hub-reset').addEventListener('click',()=>{active='all';drawOptions();});
  drawOptions();

  const context = document.getElementById('flight-r-context');
  context.innerHTML = '<div class="flight-r-context-grid">' +
    '<article><h3>Hva er priset?</h3><p>Alle fire hovedkombinasjonene er satt sammen av faktisk observerte familiepriser. De er ikke bestilt. ' +
    'Prisene kan endres når samme søk åpnes på nytt.</p><p>USD er omregnet med Norges Banks referansekurs fra ' +
    esc(round.fxReference.date) + ', ikke en garantert betalingskurs.</p>' + link(round.fxReference.source,'Valutakilde') + '</article>' +
    '<article><h3>Hotell og ekstrautgifter</h3><p>For å synliggjøre størrelsesorden bruker vi ' +
    simpleMoney(round.comparisonAssumptions.hotelPerShanghaiNightNok[0]) + '–' + simpleMoney(round.comparisonAssumptions.hotelPerShanghaiNightNok[1]) +
    ' per Shanghai-natt, og ' + simpleMoney(round.comparisonAssumptions.groundTotalNok[0]) + '–' + simpleMoney(round.comparisonAssumptions.groundTotalNok[1]) +
    ' til lokaltransport totalt. Dette er <strong>ikke innhentede priser</strong>.</p></article>' +
    '<article><h3>Separate billetter</h3><p>Det er ingen automatisk overgangsbeskyttelse mellom Shanghai–Japan og Oslo–Shanghai. ' +
    'En tapt regionalbillett er normalt en mindre økonomisk risiko enn en tapt langdistanseretur, men begge kan bli dyre. ' +
    'Overnattingsmarginene er derfor en viktig del av sammenligningen.</p></article>' +
    '<article><h3>Innreise i Kina</h3><p>Det generelle 30-dagers visumfritaket er bare bekreftet ut 2026. ' +
    'Norske pass er omfattet av en betinget 240-timers transittordning, men rutene og dokumentasjonen må vurderes ' +
    'for hver innreise. Dette skal avklares før bestilling.</p>' +
    link(round.entryRules?.transit240Hours?.source,'Offisielle transittregler') + '</article></div>';

  const archive = document.getElementById('flight-r-search-results');
  const historical = data.research.searchRounds.find(x=>x.id==='japan-easter-independent-dates-2026-10-10');
  const row = (run, archived=false) => {
    const legs = run.requestedLegs?.length ? run.requestedLegs.map(l=>[l.from,l.to,l.date].filter(Boolean).join(' → ')).join(' / ') :
      [run.from,run.to,run.departDate,run.returnDate].filter(Boolean).join(' · ');
    const selected = run.results?.find(x=>x.price?.amount && /(selected|carrier-review|seller-fare)/.test(x.price?.stage||'')) || run.results?.[0];
    const amount = selected?.price || run.price || run.observedOffers?.[0]?.price;
    const amountText = amount?.amount != null ? (amount.currency === 'USD' ? esc(amount.amount)+' USD' : fmtNok(amount.amount)) :
      run.observedOffers?.[0]?.priceNok != null ? fmtNok(run.observedOffers[0].priceNok) : '—';
    const status = archived ? 'Historisk søk' : (run.status === 'completed' || run.status === 'result-observed' ? 'Gjennomført' : 'Avbrutt / begrenset');
    return '<tr><td><b>' + esc(run.service) + '</b><small>' + esc(run.checkedAt?.slice(0,10) || '') + '</small></td>' +
      '<td>' + esc(legs || run.id) + '</td><td>' + esc(amountText) +
      '<small>' + (amountText === '—' ? 'Ingen verifisert pris' : 'Se søket for prisgrunnlag') + '</small></td>' +
      '<td>' + esc(status) + '</td><td>' + link(run.publicUrl,'Åpne') + '</td></tr>';
  };
  const table = (runs,archived=false) =>
    '<div class="flight-matrix-scroll" role="region" tabindex="0" aria-label="Dokumenterte flysøk">' +
    '<table class="flight-r-table"><thead><tr><th>Kilde</th><th>Rute og dato</th><th>Observert pris</th><th>Status</th><th>Søk</th></tr></thead>' +
    '<tbody>' + runs.map(x=>row(x,archived)).join('') + '</tbody></table></div>';
  const drawArchive = () => {
    const input = document.getElementById('flight-r-query');
    const q = input.value.trim().toLocaleLowerCase('nb-NO');
    const filtered = round.searchRuns.filter(x => !q || JSON.stringify([x.id,x.service,x.requestedLegs,x.from,x.to,x.finding]).toLocaleLowerCase('nb-NO').includes(q));
    document.getElementById('flight-r-count').textContent = filtered.length + ' av ' + round.searchRuns.length + ' søkeoperasjoner fra 11. oktober.';
    archive.innerHTML = table(filtered) +
      '<details class="flight-hub-archive"><summary>Eldre flyresearch · 10. oktober (' + (historical?.searchRuns?.length||0) + ' observasjoner)</summary>' +
      (historical ? table(historical.searchRuns,true) : '<p>Ingen eldre research.</p>') + '</details>';
  };
  document.getElementById('flight-r-query').addEventListener('input',drawArchive);
  drawArchive();

  document.getElementById('flight-r-direct').innerHTML =
    '<p>' + esc(round.directRouteCheck.finding) + '</p>' +
    round.directRouteCheck.sources.map((s,i)=>link(s,i===0?'Avinor – direktefly til Beijing':'Ruteoversikt Oslo–Shanghai')).join(' ') +
    '<p>Beijing direkte og Bangkok er dokumenterte hypoteser, ikke komplett prisede forslag på disse datoene. ' +
    'Se hovedsporene og søkearkivet for hva som faktisk er undersøkt.</p>' + quote;
}

/* Kompakt inngang på forsiden, avledet av de samme flydataene. */
async function renderHomeFlightTeaser() {
  const root=document.getElementById('home-flight-options');
  if(!root)return;
  try {
    const [data,fx]=await Promise.all([json('data/flights.json'),loadFx()]);
    const round=data.research?.searchRounds?.find(r=>r.id===data.research.currentRoundRef);
    if(!round?.completeOptions?.length)return;
    const picks=round.completeOptions.filter(o=>o.hub==='shanghai').slice(0,3);
    const esc=t=>String(t??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
    root.innerHTML='<div class="flight-hub-preview-grid">'+picks.map(o=>
      '<a class="flight-hub-preview" href="flights.html#flight-r-picks"><small>'+esc(o.tag)+'</small><strong>'+esc(o.name)+
      '</strong><span>'+esc(fmtNok(o.flightTotalNok))+' · '+esc(o.japanNights)+' Japan-netter</span></a>'
    ).join('')+'</div><p class="flight-hub-preview-note">Observerte flypriser for fire, før hotell og transport. '+
      'Alternativene har separate billetter; se prisforutsetninger og risiko på flysiden.</p>';
  }catch(error){console.error('Flyoversikt på forsiden kunne ikke lastes:',error);}
}
