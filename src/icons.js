// 선형(line) 날씨 아이콘. 흰 외곽선 구름 + 포인트 컬러(해 주황, 비 파랑, 눈 하늘색, 번개 노랑).
(function (root) {
  const COL = { line: '#f4f7fc', sun: '#ffb03a', rain: '#4ea8ff', snow: '#a8dcff', bolt: '#ffd23f' };
  const CLOUD = 'M20 44H46A9 9 0 0 0 47 26.1A13 13 0 0 0 22 23A10.6 10.6 0 0 0 20 44Z';

  const cloud = (t = '') => `<path d="${CLOUD}" transform="${t}" stroke="${COL.line}"/>`;
  const sun = (x, y, r) => `<g stroke="${COL.sun}"><circle cx="${x}" cy="${y}" r="${r}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    return `<line x1="${x + c * (r + 4)}" y1="${y + s * (r + 4)}" x2="${x + c * (r + 8)}" y2="${y + s * (r + 8)}"/>`;
  }).join('')}</g>`;
  const moon = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" stroke="${COL.snow}"
    d="M6 -16A17 17 0 1 0 16 10A13 13 0 0 1 6 -16Z"/>`;
  // 구름 뒤에 가려지는 해/달: 구름 모양(두꺼운 선)으로 마스크
  const behind = (id, art) => `<mask id="${id}"><rect width="64" height="64" fill="#fff"/>
    <path d="${CLOUD}" transform="translate(-5 5)" fill="#000" stroke="#000" stroke-width="9"/></mask>
    <g mask="url(#${id})">${art}</g>${cloud('translate(-5 5)')}`;
  const UP = 'translate(0 -7)'; // 강수 아이콘은 구름을 위로
  const lines = (color, pts) => `<g stroke="${color}">${pts.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 10}"/>`).join('')}</g>`;
  const flake = (x, y) => `<g stroke="${COL.snow}">${[0, 60, 120].map((a) => {
    const c = Math.cos(a * Math.PI / 180) * 4.5, s = Math.sin(a * Math.PI / 180) * 4.5;
    return `<line x1="${x - c}" y1="${y - s}" x2="${x + c}" y2="${y + s}"/>`;
  }).join('')}</g>`;

  const ART = {
    sun: () => sun(32, 32, 11),
    moon: () => moon(30, 32, 1),
    partly: () => behind('m-p', sun(43, 22, 7.5)),
    partlyNight: () => behind('m-n', moon(42, 22, 0.72)),
    cloud: () => cloud(),
    fog: () => `<g stroke="${COL.line}">${[22, 32, 42].map((y) => `<path d="M10 ${y}q5.5 -5 11 0t11 0t11 0t11 0"/>`).join('')}</g>`,
    drizzle: () => cloud(UP) + `<g fill="${COL.rain}" stroke="none">${[[23, 46], [32, 50], [41, 46], [27, 55], [37, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,
    rain: () => cloud(UP) + lines(COL.rain, [[25, 44], [33, 44], [41, 44]]),
    snow: () => cloud(UP) + flake(21, 48) + flake(43, 48) + flake(32, 56),
    storm: () => cloud(UP) + `<path d="M34 41L27 51H34L29 61" stroke="${COL.bolt}"/>` + lines(COL.rain, [[22, 44], [46, 44]]),
  };

  // WMO 코드 → [아이콘, 설명]
  function kind(code, isDay = 1) {
    if (code <= 1) return [isDay ? 'sun' : 'moon', '맑음'];
    if (code === 2) return [isDay ? 'partly' : 'partlyNight', '구름 조금'];
    if (code === 3) return ['cloud', '흐림'];
    if (code <= 48) return ['fog', '안개'];
    if (code <= 57) return ['drizzle', '이슬비'];
    if (code <= 67 || (code >= 80 && code <= 82)) return ['rain', code >= 80 ? '소나기' : '비'];
    if (code <= 86) return ['snow', '눈']; // 71~77, 85~86 (80~82는 위에서 처리)
    return ['storm', '뇌우'];
  }

  const icon = (name) => `<svg class="wi" viewBox="0 0 64 64" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ART[name]()}</svg>`;
  root.WeatherIcon = { kind, icon, names: Object.keys(ART) };
})(this);
