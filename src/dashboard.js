const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fit = () => { document.body.style.zoom = Math.min(innerWidth / 2560, innerHeight / 720); };
addEventListener('resize', fit); fit();

let data = { plans: [], memos: [], location: null };

// ---------- 날씨 (Open-Meteo, 키 불필요) ----------
const WMO = [[0, '☀️', '맑음'], [2, '🌤️', '구름 조금'], [3, '☁️', '흐림'], [48, '🌫️', '안개'], [57, '🌦️', '이슬비'],
  [67, '🌧️', '비'], [77, '❄️', '눈'], [82, '🌦️', '소나기'], [86, '🌨️', '눈 소나기'], [99, '⛈️', '뇌우']];
const wmo = (c) => WMO.find(([max]) => c <= max) || WMO[WMO.length - 1];
const hm = (iso) => iso.slice(11, 16);
const HOURS = [11, 12, 13, 18, 19]; // 오늘 보여줄 시간대

let ipLoc; // 설정에 위치가 없으면 IP로 한 번만 조회
async function getLocation() {
  if (data.location) return data.location;
  if (!ipLoc) {
    const r = await (await fetch('https://ipapi.co/json/')).json();
    if (!r.latitude) throw new Error('IP 위치 조회 실패');
    ipLoc = { name: r.city, lat: r.latitude, lon: r.longitude };
  }
  return ipLoc;
}

async function renderWeather() {
  try {
    const loc = await getLocation();
    const q = new URLSearchParams({ latitude: loc.lat, longitude: loc.lon, timezone: 'auto', forecast_days: 2, wind_speed_unit: 'ms',
      current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m',
      hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset' });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
    if (!res.ok) throw new Error(`날씨 API ${res.status}`);
    const { current: c, daily: d, hourly: h } = await res.json();
    const nowHour = new Date().getHours();
    const [, icon, desc] = wmo(c.weather_code);
    const r = Math.round;
    $('weather').innerHTML = `
      <div class="card now">
        <div class="city">📍 ${esc(loc.name)}</div>
        <div class="temp">${r(c.temperature_2m)}°</div><div class="icon">${icon}</div>
        <div class="desc">${desc}</div><div class="hl">${r(d.temperature_2m_max[0])}° | ${r(d.temperature_2m_min[0])}°</div>
        <div class="meta"><span>일출<b>${hm(d.sunrise[0])}</b></span><span>일몰<b>${hm(d.sunset[0])}</b></span>
          <span>바람<b>${c.wind_speed_10m} m/s</b></span><span>습도<b>${c.relative_humidity_2m}%</b></span></div>
      </div>
      <div class="hours">${HOURS.map((hr) => {
        const i = h.time.indexOf(`${d.time[0]}T${String(hr).padStart(2, '0')}:00`); // hourly는 오늘 00시부터 시작
        return `<div class="card hour${hr < nowHour ? ' past' : ''}">
          <span class="h">${hr < 12 ? '오전' : '오후'} ${hr % 12 || 12}시</span>
          <span class="i">${!h.is_day[i] && h.weather_code[i] <= 2 ? '🌙' : wmo(h.weather_code[i])[1]}</span>
          <span class="t">${r(h.temperature_2m[i])}°</span>
          <span class="p">💧 ${h.precipitation_probability[i] ?? '-'}%</span></div>`;
      }).join('')}</div>
      <div class="card day"><span>내일 ${new Date(d.time[1] + 'T00:00').toLocaleDateString('ko-KR', { weekday: 'long' })}</span>
        <span class="i">${wmo(d.weather_code[1])[1]}</span>
        <span class="t">${r(d.temperature_2m_max[1])}° | ${r(d.temperature_2m_min[1])}°</span></div>`;
  } catch (e) {
    $('weather').innerHTML = `<div class="card err">날씨를 불러오지 못했어요: ${esc(e.message)}<br>잠시 후 다시 시도합니다.</div>`;
  }
}

// ---------- 달력 ----------
function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const today = Cal.toDay(`${y}-${String(m).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  const weeks = Cal.monthLayout(y, m, data.plans);
  $('cal').innerHTML = `
    <div class="head"><h1>${y}년 ${m}월</h1>
      <span>${now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</span></div>
    <div class="dow">${'일월화수목금토'.split('').map((d) => `<div>${d}</div>`).join('')}</div>
    <div class="weeks">${weeks.map((w, wi) => `
      <div class="week">
        ${w.days.map((n, i) => {
          const cls = [i === 0 && 'sun', i === 6 && 'sat', Number(Cal.fromDay(n).slice(5, 7)) !== m && 'out', n === today && 'today'];
          return `<div class="cell ${cls.filter(Boolean).join(' ')}"><span>${Number(Cal.fromDay(n).slice(8))}</span></div>`;
        }).join('')}
        ${w.segments.map((s) => `<div class="bar${s.isStart ? ' s' : ''}${s.isEnd ? ' e' : ''}"
          style="left:calc(${s.col} / 7 * 100% + 4px);width:calc(${s.span} / 7 * 100% - 8px);top:${40 + s.lane * 32}px;background:${esc(s.plan.color)}">
          ${s.isStart || wi === 0 ? esc(s.plan.title) : ''}</div>`).join('')}
      </div>`).join('')}
    </div>`;
}

// ---------- 메모 ----------
function renderMemo() {
  $('memo').innerHTML = `<h2>📝 메모</h2>${data.memos.map((m) =>
    `<div class="note" style="background:${esc(m.color)}">${esc(m.text)}</div>`).join('') || '<p style="color:#6b7690;font-size:20px">Admin → 메모관리에서 추가하세요</p>'}`;
}

// ---------- 시계 ----------
const tick = () => {
  const n = new Date(), p = (x) => String(x).padStart(2, '0');
  const h = n.getHours();
  $('clock').innerHTML = `${h % 12 || 12}:${p(n.getMinutes())}:${p(n.getSeconds())}<small>${h < 12 ? 'AM' : 'PM'}</small>`;
  setTimeout(tick, 1000 - n.getMilliseconds()); // 초 경계에 맞춰 갱신
};
tick();

let lastDay;
setInterval(() => { // 자정이 지나면 오늘 표시/월을 갱신
  const d = new Date().getDate();
  if (d !== lastDay) { lastDay = d; renderCalendar(); }
}, 60e3);
setInterval(renderWeather, 15 * 60e3);

store.onChange((d) => {
  const locChanged = JSON.stringify(d.location) !== JSON.stringify(data.location);
  data = d; renderCalendar(); renderMemo(); if (locChanged) renderWeather();
});
store.load().then((d) => { data = d; lastDay = new Date().getDate(); renderCalendar(); renderMemo(); renderWeather(); });
