/* Flysiden bygger på kanoniske data fra flights.json og trip.json. */
async function renderFlightsResearch() {
  nav('flights'); footer(); await applyPageCopy('flights');
  const [data, trip, fx] = await Promise.all([json('data/flights.json'), json('data/trip.json'), loadFx()]);
  const round = data.research?.searchRounds?.find(r => r.id === data.research.currentRoundRef);
  const overview = document.getElementById('flight-r-overview');
  if (data.nextFlightFocus?.stage === 'regional-japan-search') {
    renderRegionalJapanFocus(data.nextFlightFocus, data);
    renderRegionalMarketInsights(data.nextFlightFocus, data, fx, trip);
    return;
  }
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
    if(data.nextFlightFocus?.stage === 'regional-japan-search') {
      const focus=data.nextFlightFocus;
      const esc=t=>String(t??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
      const marketRound=data.research?.searchRounds?.find(r=>r.id===focus.archivedRoundId);
      const usdRate=marketRound?.fxReference?.nokPerUsd;
      root.innerHTML='<div class="flight-hub-preview-grid">'+(focus.finalReview?.choices||[]).slice(0,3).map(p=>{
        const nok=Number.isFinite(usdRate)?p.usd*usdRate:null;
        return '<a class="flight-hub-preview" href="flights.html#flight-r-picks"><small>'+esc(p.tag)+'</small><strong>'+esc(p.title)+
          '</strong><span>'+(nok!=null?fmtNok(nok)+' · ca. '+fmtJpy(jpyFromNok(nok,fx)):esc(p.to))+'</span></a>';
      }).join('')+'</div><p class="flight-hub-preview-note">'+esc(focus.finalReview?.basis||focus.statusNote)+'</p>';
      return;
    }
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


/* Offentlig planleggingsstatus uten informasjon om kjøpte billetter. */
function renderRegionalJapanFocus(focus, data) {
  const esc = t => String(t ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const safe = raw => {
    try {
      const u = new URL(raw);
      if (u.protocol !== 'https:' || [...u.searchParams.keys()].some(k => /token|session|booking|checkout|pnr|auth|email|password/i.test(k))) return '';
      return esc(u.href);
    } catch { return ''; }
  };
  const link = (raw, label) => {
    const url = safe(raw);
    return url ? '<a class="button" href="' + url + '" target="_blank" rel="noopener noreferrer">' + esc(label) + ' ↗</a>' : '';
  };
  document.getElementById('flight-r-overview').innerHTML =
    '<div class="flight-r-hero flight-hub-hero"><div><div class="flight-r-hero-kicker">Flyreise · planleggingsstatus</div>'+
    '<h2>'+esc(focus.publicTitle)+'</h2><p>'+esc(focus.publicSummary)+'</p>'+
    '<div class="flight-r-stats"><div><strong>2</strong><span>reiseveier i Japan</span></div>'+
    '<div><strong>PVG</strong><span>knutepunkt i Shanghai</span></div>'+
    '<div><strong>4</strong><span>passasjerer i prissammenligning</span></div></div></div>'+
    '<aside><span class="flight-r-aside-title">Neste beslutning</span>'+
    '<strong>'+esc(focus.statusLabel)+'</strong><p>Tokyo og Osaka vurderes som alternative start- og sluttpunkter.</p>'+
    '<a class="flight-r-aside-link" href="#flight-r-picks">Se rutevalgene ↓</a></aside></div>'+
    '<p class="flight-r-scope">'+esc(focus.statusNote)+'</p>';
  document.getElementById('flight-hub-branches').innerHTML =
    '<div class="flight-hub-branch-grid">'+focus.patterns.map(p=>
      '<article class="flight-hub-branch"><h3>'+esc(p.name)+'</h3><p>'+esc(p.summary)+'</p></article>'
    ).join('')+'</div>';
  document.getElementById('flight-hub-selected').textContent='Regionalflyene som skal undersøkes';
  document.getElementById('flight-hub-reset').hidden=true;
  document.getElementById('flight-r-pick-list').innerHTML =
    '<div class="flight-r-picks">'+focus.patterns.map(p=>
      '<article class="flight-r-pick"><div class="flight-r-pick-top"><span>Under vurdering</span></div>'+
      '<h3>'+esc(p.name)+'</h3>'+
      '<p class="flight-r-timing"><b>Ut:</b> '+esc(p.outbound)+'</p>'+
      '<p class="flight-r-timing"><b>Hjem:</b> '+esc(p.inbound)+'</p>'+
      '<p class="flight-r-explanation">'+esc(p.summary)+'</p>'+
      '<div class="flight-r-actions">'+link(p.searchUrl,'Søk i Google Flights')+'</div></article>'
    ).join('')+'</div>';
  document.getElementById('flight-r-context').innerHTML =
    '<div class="flight-r-context-grid">'+
    '<article><h3>Sammenlign reisetid og pris</h3><ul>'+focus.evaluation.slice(0,3).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul></article>'+
    '<article><h3>Vurder risiko</h3><ul>'+focus.evaluation.slice(3).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul></article></div>';
  document.getElementById('flight-r-direct').innerHTML =
    '<p>Dette er planleggingsalternativer, ikke opplysninger om kjøpte flybilletter. Historiske priser må søkes på nytt.</p>'+
    focus.sources.map((u,i)=>link(u,i===0?'Google Flights':'Trip.com')).join(' ');
  const records=(data.research?.searchRounds||[]).flatMap(r=>(r.searchRuns||[]).map(s=>({
    service:s.service,from:s.from,to:s.to,legs:s.requestedLegs,checkedAt:s.checkedAt,publicUrl:s.publicUrl
  })));
  const query=document.getElementById('flight-r-query');
  const draw=()=>{
    const q=(query.value||'').trim().toLocaleLowerCase('nb-NO');
    const rows=records.filter(r=>!q||JSON.stringify(r).toLocaleLowerCase('nb-NO').includes(q));
    document.getElementById('flight-r-count').textContent=rows.length+' av '+records.length+' arkiverte søk';
    document.getElementById('flight-r-search-results').innerHTML=
      '<div class="flight-matrix-scroll" role="region" tabindex="0" aria-label="Historiske flysøk"><table class="flight-r-table">'+
      '<thead><tr><th>Kilde</th><th>Rute</th><th>Dato kontrollert</th><th>Søk</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+esc(r.service||'Research')+'</td><td>'+
        esc(r.legs?.map(l=>[l.from,l.to].filter(Boolean).join('–')).join(' / ') || [r.from,r.to].filter(Boolean).join('–') || 'Flyresearch')+
        '</td><td>'+esc(r.checkedAt?.slice(0,10)||'')+'</td><td>'+link(r.publicUrl,'Åpne')+'</td></tr>').join('')+
      '</tbody></table></div>';
  };
  query.addEventListener('input',draw);
  draw();
}


/* Flysøk: konkrete ubestilte markedsobservasjoner, ikke reisebookinger. */
function renderRegionalMarketInsights(focus,data,fx,trip){
 const review=focus.finalReview;
 if(!review)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const historical=data.research?.searchRounds?.find(x=>x.id===focus.archivedRoundId);
 const usdNok=historical?.fxReference?.nokPerUsd;
 const money=usd=>{
   const nok=Number.isFinite(usdNok)?usd*usdNok:null;
   return '<span class="flight-regional-price"><strong>'+esc(usd.toLocaleString('nb-NO'))+' USD</strong>'+
     (nok==null?'':'<small>ca. '+esc(fmtNok(nok))+' · '+esc(fmtJpy(jpyFromNok(nok,fx)))+'</small>')+'</span>';
 };
 const dateLabel=iso=>{
   const [year,month,day]=iso.split('-');
   return Number(day)+'. '+['jan.','feb.','mars','apr.','mai','juni','juli','aug.','sep.','okt.','nov.','des.'][Number(month)-1]+' '+year;
 };
 const airportLabel=p=>esc(p.city)+' · '+esc(p.name)+' ('+esc(p.code)+')';
 const flightLeg=(leg,heading)=>
   '<div class="flight-leg-detail"><div class="flight-leg-head"><strong>'+esc(heading)+'</strong><span>'+esc(dateLabel(leg.date))+' · '+esc(leg.number)+' · '+esc(leg.duration)+'</span></div>'+
   '<div class="flight-leg-route">'+
   '<div class="flight-leg-end"><strong class="flight-leg-clock">'+esc(leg.depart)+'</strong><span>'+airportLabel(leg.from)+'</span></div>'+
   '<span class="flight-leg-arrow" aria-hidden="true">→</span>'+
   '<div class="flight-leg-end"><strong class="flight-leg-clock">'+esc(leg.arrive)+'</strong><span>'+airportLabel(leg.to)+'</span></div></div></div>';
 const searchUrl=(choice,depart,back)=>{
   const params=new URLSearchParams();
   params.set('multdcity0','sha');params.set('multacity0',choice.toCity);params.set('dairport0','pvg');
   if(!['nrt','hnd'].includes(choice.toAirport))params.set('aairport0',choice.toAirport);
   params.set('multddate0',depart);
   params.set('multdcity1',choice.backCity);params.set('multacity1','sha');
   if(!['nrt','hnd'].includes(choice.backAirport))params.set('dairport1',choice.backAirport);
   params.set('aairport1','pvg');params.set('multddate1',back);
   params.set('triptype','mt');params.set('class','y');params.set('quantity','3');
   params.set('childqty','1');params.set('locale','en-XX');params.set('curr','USD');
   return 'https://www.trip.com/flights/showfarefirst?'+params.toString();
 };
 const choices=review.choices;
 document.getElementById('flight-hub-selected').textContent='Billettpakker kontrollert hos selger · '+review.checked;
 document.getElementById('flight-r-pick-list').innerHTML=
   '<p class="flight-r-scope">'+esc(review.basis)+'</p>'+
   '<div class="flight-r-picks flight-hub-picks">'+choices.map(choice=>
     '<article class="flight-r-pick flight-research-card" id="research-'+esc(choice.id)+'">'+
     '<div class="flight-r-pick-top"><span>'+esc(choice.tag)+'</span><span>'+esc(choice.sourceDate)+'</span></div>'+
     '<h3>'+esc(choice.title)+'</h3><div class="flight-r-price">'+money(choice.usd)+'</div>'+
     '<p class="flight-r-price-note">'+esc(choice.company)+' · 4 reisende · '+esc(choice.bag)+'</p>'+
     flightLeg(choice.legs[0],'Fra Shanghai til Japan')+flightLeg(choice.legs[1],'Fra Japan til Shanghai')+
     '<p class="flight-r-timing">'+esc(choice.jp)+' netter i Japan · '+esc(choice.sh)+' i Shanghai</p>'+
     '<p class="flight-r-explanation">'+esc(choice.good)+'</p>'+
     '<details class="flight-r-details"><summary>Ulemper og priskontroll</summary><p>'+esc(choice.tradeoff)+'</p>'+
     '<p>'+esc(choice.evidence||'Pris observert hos selger')+'. '+esc(review.basis)+'</p></details>'+
     '<div class="flight-r-actions"><a class="button primary" href="'+esc(searchUrl(choice,choice.legs[0].date,choice.legs[1].date))+'" target="_blank" rel="noopener noreferrer">Gjenta dokumentert søk ↗</a>'+
     '<a class="flight-inline-link" href="https://www.google.com/travel/flights" target="_blank" rel="noopener noreferrer">Google Flights (søk manuelt) ↗</a></div>'+
     '</article>'
   ).join('')+'</div>';
 let saved={};try{saved=JSON.parse(localStorage.getItem('japan-regional-search')||'{}')||{};}catch{}
 const dateOK=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v));
 const start=dateOK(saved.depart)?saved.depart:choices[0].legs[0].date;
 const end=dateOK(saved.back)?saved.back:choices[0].legs[1].date;
 const form=document.createElement('div');form.className='flight-date-search';
 form.innerHTML='<details><summary>Test andre datoer</summary><p>De originale søkene over beholder sine observerte datoer. Her kan du gjøre et nytt søk med en annen reiseperiode.</p>'+
 '<div class="flight-date-fields"><label>Fly til Japan<input id="flight-regional-out" type="date" value="'+esc(start)+'"></label>'+
 '<label>Fly til Shanghai<input id="flight-regional-back" type="date" value="'+esc(end)+'"></label></div>'+
 '<p class="flight-r-caution" id="flight-regional-warning" aria-live="polite"></p>'+
 '<div class="flight-date-custom-links">'+choices.map(c=>'<a class="button" data-custom-flight="'+esc(c.id)+'" target="_blank" rel="noopener noreferrer">Søk '+esc(c.title)+' ↗</a>').join('')+'</div></details>';
 document.getElementById('flight-r-pick-list').prepend(form);
 const inDate=document.getElementById('flight-regional-out'),outDate=document.getElementById('flight-regional-back');
 const warning=document.getElementById('flight-regional-warning');
 function updateDates(){
  const a=inDate.value,b=outDate.value,valid=dateOK(a)&&dateOK(b)&&a<b;
  warning.textContent=valid?'':'Velg to gyldige datoer i riktig rekkefølge.';
  form.querySelectorAll('[data-custom-flight]').forEach(el=>{
   const c=choices.find(x=>x.id===el.dataset.customFlight);
   if(!valid||!c){el.removeAttribute('href');el.setAttribute('aria-disabled','true');return;}
   el.href=searchUrl(c,a,b);el.removeAttribute('aria-disabled');
  });
  if(valid)try{localStorage.setItem('japan-regional-search',JSON.stringify({depart:a,back:b}));}catch{}
 }
 inDate.addEventListener('change',updateDates);outDate.addEventListener('change',updateDates);updateDates();
 const bloom=focus.sakuraComparison;
 if(bloom){
   const sakura=document.createElement('section');sakura.id='flight-r-sakura';sakura.className='section flight-sakura-section';
   sakura.innerHTML='<div class="section-head"><div><div class="eyebrow">Tidspunkt og reiseretning</div><h2>'+esc(bloom.title)+'</h2></div></div>'+
    '<p>'+esc(bloom.intro)+'</p>'+
    '<div class="flight-sakura-norms" role="region" aria-label="Normale blomstringsdatoer"><table><thead><tr><th>By</th><th>Vanlig start</th><th>Vanlig full blomstring</th><th>Full blomstring 2026</th></tr></thead><tbody>'+
    bloom.cityNormals.map(c=>'<tr><th>'+esc(c.city)+'</th><td>'+esc(c.first)+'</td><td><strong>'+esc(c.peak)+'</strong></td><td>'+esc(c.peak2026)+'</td></tr>').join('')+'</tbody></table></div>'+
    '<div class="flight-sakura-grid">'+bloom.scenarios.map(s=>'<article class="flight-sakura-card"><h3>'+esc(s.title)+'</h3><strong class="flight-sakura-status">'+esc(s.status)+'</strong>'+
     '<div class="flight-sakura-stops">'+s.visits.map(v=>'<div><strong>'+esc(v.city)+'</strong><span>'+esc(v.window)+'</span><small>'+esc(v.rating)+'</small></div>').join('')+'</div><p>'+esc(s.conclusion)+'</p></article>').join('')+'</div>'+
    '<p class="flight-sakura-verdict">'+esc(bloom.verdict)+'</p><p class="flight-hub-footnote">'+esc(bloom.uncertainty)+' '+esc(bloom.note)+'</p>'+
    '<p class="flight-sakura-sources">Kilder: '+bloom.sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label)+'</a>').join(' · ')+'</p>';
   document.getElementById('flight-hub-overview').insertAdjacentElement('afterend',sakura);
 }
 document.getElementById('flight-r-context').innerHTML='<div class="flight-r-context-grid">'+
  '<article><h3>Reell beslutning</h3><p>Sakura taler noe for Tokyo først, mens samlet pris og utreisemargin taler for Kansai først. Sammenlign opplevelsesverdi og logistikk, ikke pris alene.</p>'+
  '<p>'+esc(review.basis)+'</p></article>'+
  '<article><h3>To måter å søke</h3><p>«Gjenta dokumentert søk» åpner samme rute og dato hos Trip.com. «Google Flights» åpner en annen søketjeneste, der datoene legges inn manuelt. Selskapets offisielle søk kan brukes til sluttkontroll.</p></article></div>';
 const scope=focus.airportExpansion;
 if(scope){
  const safeLink=url=>{try{const u=new URL(url);return u.protocol==='https:'?'<a class="button" href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">Kilde ↗</a>':'';}catch{return '';}};
  document.getElementById('flight-r-airport-results').innerHTML='<p class="flight-r-explanation">'+esc(scope.summary)+'</p>'+
   '<p class="flight-r-caution">'+esc(scope.conclusion)+'</p><div class="flight-airport-grid">'+scope.items.map(a=>
   '<article class="flight-airport-card"><div class="flight-hub-branch-head"><h3>'+esc(a.name)+' ('+esc(a.code)+')</h3><small>'+esc(a.priority)+'</small></div>'+
   '<p>'+esc(a.note)+'</p><small>'+esc(a.routeConfidence)+'</small><div class="flight-r-actions">'+safeLink(a.source)+'</div></article>').join('')+'</div>';
 }
 document.getElementById('flight-r-direct').innerHTML=
 '<p>Trip.com er brukt til å dokumentere totalpris og bagasje i de valgte billettpakkene. Bruk også Google Flights og flyselskapenes egne søk til å sammenligne. Ingen av lenkene reserverer den observerte prisen.</p>'+
 '<a class="button" href="https://www.google.com/travel/flights" target="_blank" rel="noopener noreferrer">Google Flights ↗</a>'+
 '<a class="button" href="https://aswbe.ana.co.jp/webapps/reservation/flight-search?CONNECTION_KIND=CHN&amp;LANG=en" target="_blank" rel="noopener noreferrer">ANA ↗</a>'+
 '<a class="button" href="https://www.jal.co.jp/en/" target="_blank" rel="noopener noreferrer">Japan Airlines ↗</a>';
}
