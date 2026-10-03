const fmtDate = (iso) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
const fmtNok = (n) => new Intl.NumberFormat('nb-NO', { style:'currency', currency:'NOK', maximumFractionDigits:0 }).format(n);

async function json(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Kunne ikke hente ${path}`);
  return r.json();
}

function nav(active='') {
  const items = [
    ['index.html','Oversikt','home'],
    ['route.html','Rute','route'],
    ['places.html','Steder','places'],
    ['prep.html','Oppladning','prep'],
    ['budget.html','Budsjett','budget'],
    ['sources.html','Kilder','sources'],
    ['privacy.html','Personvern','privacy']
  ];
  document.querySelector('header').innerHTML = `<div class="nav"><a class="brand" href="index.html">Japan 2027</a><nav>${items.map(([href,label,key])=>`<a href="${href}" ${active===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav></div>`;
}

function footer() {
  document.querySelector('footer').innerHTML = `<div class="inner">Offentlig planleggingsside. Ingen private booking- eller personopplysninger skal publiseres her. <a href="privacy.html">Se reglene.</a></div>`;
}

async function renderHome() {
  nav('home'); footer();
  const trip = await json('data/trip.json');
  document.getElementById('status').textContent = trip.status;
  document.getElementById('window').textContent = trip.window;
  document.getElementById('budget').textContent = fmtNok(trip.budget.targetNok);
  const route = document.getElementById('route-cards');
  route.innerHTML = trip.route.filter(x=>x.nights>0).map(x=>`<article class="card"><a class="stretched" href="place.html?id=${x.id}"><div class="meta">${x.label}</div><h3>${x.name}</h3><p>${x.summary}</p><strong>${x.nights} ${x.nights===1?'natt':'netter'}</strong></a></article>`).join('');
}

async function renderRoute() {
  nav('route'); footer();
  const trip = await json('data/trip.json');
  document.getElementById('window').textContent = trip.window;
  document.getElementById('route-list').innerHTML = trip.route.map(x=>`<div class="route-item"><div class="date">${fmtDate(x.from)}${x.to!==x.from?` – ${fmtDate(x.to)}`:''}</div><div><strong>${x.name}</strong><div class="small">${x.label} · ${x.summary}</div></div><div class="nights">${x.nights===0?'Stopp':`${x.nights} ${x.nights===1?'natt':'netter'}`}</div></div>`).join('');
  const map = L.map('map', {scrollWheelZoom:false}).setView([35.15, 137.1], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; OpenStreetMap'}).addTo(map);
  const coords = [];
  trip.route.forEach((x,i)=>{
    coords.push([x.lat,x.lng]);
    L.marker([x.lat,x.lng]).addTo(map).bindPopup(`<strong>${i+1}. ${x.name}</strong><br>${x.label}<br>${fmtDate(x.from)}`);
  });
  trip.dayTrips.forEach(x=>L.circleMarker([x.lat,x.lng], {radius:7}).addTo(map).bindPopup(`<strong>${x.name}</strong><br>Dagstur fra ${x.base}`));
  L.polyline(coords, {weight:4, opacity:.65}).addTo(map);
  map.fitBounds(coords, {padding:[25,25]});
}

async function renderPlaces() {
  nav('places'); footer();
  const places = await json('data/places.json');
  const areas = ['Alle', ...new Set(places.map(p=>p.area))];
  const filters = document.getElementById('filters');
  filters.innerHTML = areas.map((a,i)=>`<button class="${i===0?'active':''}" data-area="${a}">${a}</button>`).join('');
  const grid = document.getElementById('places-grid');
  const draw = (area='Alle') => {
    grid.innerHTML = places.filter(p=>area==='Alle'||p.area===area).map(p=>`<article class="card"><a class="stretched" href="place.html?id=${p.id}"><div class="meta">${p.area} · ${p.type}</div><h3>${p.name}</h3><div class="kicker">${p.simple}</div><p>${p.description}</p>${p.acShadows?'<span class="badge">AC Shadows</span>':''}</a></article>`).join('');
  };
  filters.addEventListener('click',e=>{ if(e.target.tagName!=='BUTTON') return; [...filters.children].forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); draw(e.target.dataset.area); });
  draw();
}

async function renderPlace() {
  nav('places'); footer();
  const places = await json('data/places.json');
  const id = new URLSearchParams(location.search).get('id');
  const p = places.find(x=>x.id===id) || places[0];
  document.title = `${p.name} · Japan 2027`;
  document.getElementById('area').textContent = `${p.area} · ${p.type}`;
  document.getElementById('name').textContent = p.name;
  document.getElementById('simple').textContent = p.simple;
  document.getElementById('description').textContent = p.description;
  document.getElementById('why').textContent = p.why;
  document.getElementById('highlights').innerHTML = p.highlights.map(x=>`<li>${x}</li>`).join('');
  document.getElementById('prep').innerHTML = p.prep.length ? p.prep.map(x=>`<li>${x}</li>`).join('') : '<li>Ingen spesifikk oppladning lagt inn ennå.</li>';
  document.getElementById('ac').innerHTML = p.acShadows ? '<span class="badge">Finnes / er relevant i Assassin’s Creed Shadows</span>' : '';
}

async function renderPrep() {
  nav('prep'); footer();
  const prep = await json('data/prep.json');
  document.getElementById('prep-grid').innerHTML = prep.map(group=>`<section class="section"><h2>${group.category}</h2><div class="grid">${group.items.map(x=>`<article class="card"><div class="meta">${x.for}</div><h3>${x.title}</h3><p>${x.why}</p><strong>${x.action}</strong></article>`).join('')}</div></section>`).join('');
}

async function renderBudget() {
  nav('budget'); footer();
  const trip = await json('data/trip.json');
  document.getElementById('target').textContent = fmtNok(trip.budget.targetNok);
  document.getElementById('range').textContent = `${fmtNok(trip.budget.rangeNok[0])}–${fmtNok(trip.budget.rangeNok[1])}`;
  document.getElementById('note').textContent = trip.budget.note;
}

async function renderSources() {
  nav('sources'); footer();
  const sources = await json('data/sources.json');
  document.getElementById('sources-grid').innerHTML = sources.map(s=>`<article class="card"><h3><a href="${s.url}" rel="noopener">${s.title}</a></h3><p>${s.use}</p></article>`).join('');
}

function initPrivacy(){ nav('privacy'); footer(); }
