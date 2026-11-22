const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fit = () => {
  document.body.style.zoom = Math.min(innerWidth / 2560, innerHeight / 720);
};
addEventListener("resize", fit);
fit();

let data = { plans: [], memos: [], location: null };

// ---------- 날씨 (Open-Meteo, 키 불필요) ----------
const wicon = (code, isDay) =>
  WeatherIcon.icon(WeatherIcon.kind(code, isDay)[0]);
const hm = (iso) => iso.slice(11, 16);
const HOURS = [11, 12, 13, 18, 19]; // 오늘 보여줄 시간대

let ipLoc; // 설정에 위치가 없으면 IP로 한 번만 조회
async function getLocation() {
  if (data.location) return data.location;
  if (!ipLoc) {
    const r = await (await fetch("https://ipapi.co/json/")).json();
    if (!r.latitude) throw new Error("IP 위치 조회 실패");
    ipLoc = { name: r.city, lat: r.latitude, lon: r.longitude };
  }
  return ipLoc;
}

async function renderWeather() {
  try {
    const loc = await getLocation();
    const q = new URLSearchParams({
      latitude: loc.lat,
      longitude: loc.lon,
      timezone: "auto",
      forecast_days: 2,
      wind_speed_unit: "ms",
      current:
        "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
      hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
    if (!res.ok) throw new Error(`날씨 API ${res.status}`);
    const { current: c, daily: d, hourly: h } = await res.json();
    const nowHour = new Date().getHours();
    const desc = WeatherIcon.kind(c.weather_code, c.is_day)[1];
    const r = Math.round;
    $("weather").innerHTML = `
      <div class="glass now">
        <div class="info">
          <div class="label"></div><div class="city">${esc(loc.name)}</div>
          <div class="temp">${r(c.temperature_2m)}°</div>
          <div class="desc">${desc}</div>
          <div class="hl">최저<b>${r(d.temperature_2m_min[0])}°</b>최고<b>${r(d.temperature_2m_max[0])}°</b></div>
        </div>
        <div class="tile pane">${wicon(c.weather_code, c.is_day)}</div>
        <div class="meta">${[
          ["일출", hm(d.sunrise[0])],
          ["일몰", hm(d.sunset[0])],
          ["바람", `${c.wind_speed_10m} m/s`],
          ["습도", `${c.relative_humidity_2m}%`],
        ]
          .map(
            ([k, v]) =>
              `<div class="tile"><span class="label">${k}</span><b>${v}</b></div>`,
          )
          .join("")}</div>
      </div>
      <div class="hours">${HOURS.map((hr) => {
        const i = h.time.indexOf(
          `${d.time[0]}T${String(hr).padStart(2, "0")}:00`,
        ); // hourly는 오늘 00시부터 시작
        return `<div class="glass hour${hr < nowHour ? " past" : ""}">
          <span class="h">${hr < 12 ? "오전" : "오후"} ${hr % 12 || 12}시</span>
          ${wicon(h.weather_code[i], h.is_day[i])}
          <span class="t">${r(h.temperature_2m[i])}°</span>
          <span class="p">강수 ${h.precipitation_probability[i] ?? "-"}%</span></div>`;
      }).join("")}</div>
      <div class="glass day"><span>내일 ${new Date(d.time[1] + "T00:00").toLocaleDateString("ko-KR", { weekday: "long" })}</span>
        ${wicon(d.weather_code[1], 1)}
        <span class="t">${r(d.temperature_2m_min[1])}° / ${r(d.temperature_2m_max[1])}°</span></div>`;
  } catch (e) {
    $("weather").innerHTML =
      `<div class="glass err">날씨를 불러오지 못했어요: ${esc(e.message)}<br>잠시 후 다시 시도합니다.</div>`;
  }
}

// ---------- 달력 ----------
function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear(),
    m = now.getMonth() + 1;
  const today = Cal.toDay(
    `${y}-${String(m).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  );
  const weeks = Cal.monthLayout(y, m, data.plans);
  $("cal").innerHTML = `
    <div class="head"><h1><b>${y}년 </b>${m}월</h1>
      <span>${now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</span></div>
    <div class="dow">${"일월화수목금토"
      .split("")
      .map((d) => `<div>${d}</div>`)
      .join("")}</div>
    <div class="weeks">${weeks
      .map(
        (w, wi) => `
      <div class="week">
        ${w.days
          .map((n, i) => {
            const cls = [
              i === 0 && "sun",
              i === 6 && "sat",
              Number(Cal.fromDay(n).slice(5, 7)) !== m && "out",
              n === today && "today",
            ];
            return `<div class="cell ${cls.filter(Boolean).join(" ")}"><span>${Number(Cal.fromDay(n).slice(8))}</span></div>`;
          })
          .join("")}
        ${w.segments
          .map(
            (
              s,
            ) => `<div class="bar${s.isStart ? " s" : ""}${s.isEnd ? " e" : ""}"
          style="left:calc(${s.col} / 7 * 100% + 4px);width:calc(${s.span} / 7 * 100% - 8px);top:${40 + s.lane * 32}px;--c:${esc(s.plan.color)}">
          ${s.isStart || wi === 0 ? esc(s.plan.title) : ""}</div>`,
          )
          .join("")}
      </div>`,
      )
      .join("")}
    </div>`;
}

// ---------- 메모 ----------
function renderMemo() {
  $("notes").innerHTML =
    data.memos
      .map(
        (m) =>
          `<div class="tile note" style="--c:${esc(m.color)}">${esc(m.text)}</div>`,
      )
      .join("") || '<p class="empty">Admin → 메모관리에서 추가하세요</p>';
}

// ---------- 시계 ----------
const tick = () => {
  const n = new Date(),
    p = (x) => String(x).padStart(2, "0");
  const h = n.getHours();
  $("clock").innerHTML =
    `<span class="hm">${h % 12 || 12}:${p(n.getMinutes())}</span>
    <span class="sx"><span class="ap">${h < 12 ? "AM" : "PM"}</span><span class="sec">${p(n.getSeconds())}</span></span>`;
  setTimeout(tick, 1000 - n.getMilliseconds()); // 초 경계에 맞춰 갱신
};
tick();

let lastDay;
setInterval(() => {
  // 자정이 지나면 오늘 표시/월을 갱신
  const d = new Date().getDate();
  if (d !== lastDay) {
    lastDay = d;
    renderCalendar();
  }
}, 60e3);
setInterval(renderWeather, 15 * 60e3);

store.onChange((d) => {
  const locChanged =
    JSON.stringify(d.location) !== JSON.stringify(data.location);
  data = d;
  renderCalendar();
  renderMemo();
  if (locChanged) renderWeather();
});
store.load().then((d) => {
  data = d;
  lastDay = new Date().getDate();
  renderCalendar();
  renderMemo();
  renderWeather();
});
