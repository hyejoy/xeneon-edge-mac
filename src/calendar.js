// 달력 막대 배치 로직. 브라우저(<script>)와 node(테스트) 양쪽에서 쓴다.
// 날짜는 'YYYY-MM-DD' 문자열 ↔ 에포크 일수(정수)로만 다뤄서 시간대/DST 영향이 없다.
(function (root) {
  const toDay = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const fromDay = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
  const weekday = (n) => (n + 4) % 7; // 1970-01-01은 목요일(4), 0=일요일

  // month: 1~12. 일요일 시작 주들 → [{ days: [7개 에포크일], segments: [...] }]
  function monthLayout(year, month, plans) {
    const first = toDay(`${year}-${String(month).padStart(2, '0')}-01`);
    const last = Date.UTC(year, month, 1) / 864e5 - 1; // 다음 달 1일 - 1
    const weeks = [];
    for (let start = first - weekday(first); start <= last; start += 7) {
      const end = start + 6;
      const segs = plans
        .map((p) => ({ p, s: toDay(p.start), e: toDay(p.end) }))
        .filter(({ s, e }) => s <= end && e >= start)
        .map(({ p, s, e }) => ({
          plan: p,
          col: Math.max(s, start) - start,
          span: Math.min(e, end) - Math.max(s, start) + 1,
          isStart: s >= start,
          isEnd: e <= end,
        }))
        .sort((a, b) => a.col - b.col || b.span - a.span);
      const laneEnds = []; // 각 lane에서 마지막으로 차지한 col
      for (const seg of segs) {
        let lane = laneEnds.findIndex((endCol) => endCol < seg.col);
        if (lane === -1) lane = laneEnds.length;
        laneEnds[lane] = seg.col + seg.span - 1;
        seg.lane = lane;
      }
      weeks.push({ days: Array.from({ length: 7 }, (_, i) => start + i), segments: segs });
    }
    return weeks;
  }

  const api = { toDay, fromDay, weekday, monthLayout };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Cal = api;
})(this);
