const test = require('node:test');
const assert = require('node:assert');
const { monthLayout, fromDay } = require('../src/calendar');

test('2025년 12월: 1일(월)이 있는 주부터 31일 주까지 5주', () => {
  const weeks = monthLayout(2025, 12, []);
  assert.strictEqual(weeks.length, 5);
  assert.strictEqual(fromDay(weeks[0].days[0]), '2025-11-30'); // 일요일 시작
  assert.strictEqual(fromDay(weeks[4].days[6]), '2026-01-03');
});

test('주를 넘는 계획은 주마다 잘리고, 겹치면 다른 lane', () => {
  const plans = [
    { id: 'a', start: '2025-12-01', end: '2025-12-06' }, // 스프링 입문
    { id: 'b', start: '2025-12-07', end: '2025-12-13' }, // 자바 중급
    { id: 'c', start: '2025-12-03', end: '2025-12-04' },
  ];
  const [w0, w1] = monthLayout(2025, 12, plans);
  const a = w0.segments.find((s) => s.plan.id === 'a');
  assert.deepStrictEqual([a.col, a.span, a.lane, a.isStart, a.isEnd], [1, 6, 0, true, true]);
  assert.strictEqual(w0.segments.find((s) => s.plan.id === 'c').lane, 1);
  const b = w1.segments.find((s) => s.plan.id === 'b');
  assert.deepStrictEqual([b.col, b.span, b.lane], [0, 7, 0]);
  assert.strictEqual(w0.segments.some((s) => s.plan.id === 'b'), false);
});

test('달 밖에서 시작한 계획은 isStart=false', () => {
  const [w0] = monthLayout(2026, 11, [{ id: 'x', start: '2026-10-20', end: '2026-11-02' }]);
  const x = w0.segments[0];
  assert.deepStrictEqual([x.col, x.span, x.isStart, x.isEnd], [0, 2, false, true]);
});
