const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const COLORS = ['#f6df94', '#bfd8f6', '#f5b8c4', '#bfe6c6', '#d6c6f5', '#f8c99b']; // 계획표 파스텔 톤
const form = $('form'), memoForm = $('memoForm');
let data = { plans: [], memos: [], location: null };
const sel = { plans: new Set(), memos: new Set() }; // 다중 선택된 id

for (const [el, pre] of [['swatches', 'c'], ['memoSwatches', 'm']]) {
  $(el).innerHTML = COLORS.map((c, i) =>
    `<input type="radio" name="color" id="${pre}${i}" value="${c}"${i ? '' : ' checked'}><label for="${pre}${i}" style="background:${c}"></label>`).join('');
}

$('tabs').onclick = (e) => {
  const tab = e.target.dataset.tab; if (!tab) return;
  for (const b of $('tabs').children) b.classList.toggle('on', b === e.target);
  for (const t of ['plans', 'memos', 'location']) $(`tab-${t}`).hidden = t !== tab;
};

function render() {
  const plans = [...data.plans].sort((a, b) => a.start.localeCompare(b.start));
  $('list').innerHTML = plans.length ? plans.map((p) => `
    <tr>${chk('plans', p.id)}<td class="dot"><span style="background:${esc(p.color)}"></span></td>
      <td>${esc(p.title)}</td><td class="muted">${p.start} ~ ${p.end}</td>
      <td class="act"><button data-edit="${p.id}">수정</button><button data-del="${p.id}">삭제</button></td></tr>`).join('')
    : '<tr><td class="muted">아직 계획이 없어요.</td></tr>';
  $('memoList').innerHTML = data.memos.length ? data.memos.map((m) => `
    <tr draggable="true" data-id="${m.id}">${chk('memos', m.id)}<td class="grip" title="드래그해서 순서 변경">⠿</td>
      <td class="dot"><span style="background:${esc(m.color)}"></span></td><td class="memo">${esc(m.text)}</td>
      <td class="act"><button data-up="${m.id}" aria-label="위로">▲</button><button data-down="${m.id}" aria-label="아래로">▼</button><button data-edit="${m.id}">수정</button><button data-del="${m.id}">삭제</button></td></tr>`).join('')
    : '<tr><td class="muted">아직 메모가 없어요.</td></tr>';
  $('cur').textContent = data.location ? data.location.name : '자동(IP 기반)';
  syncBulk('plans'); syncBulk('memos');
}

// ---------- 다중 선택 삭제 ----------
const BULK = { plans: ['list', 'allPlans', 'delPlans', '계획'], memos: ['memoList', 'allMemos', 'delMemos', '메모'] };
const chk = (kind, id) => `<td class="chk"><input type="checkbox" data-sel="${id}"${sel[kind].has(id) ? ' checked' : ''} aria-label="선택"></td>`;
function syncBulk(kind) {
  const [, all, del] = BULK[kind], ids = new Set(data[kind].map((x) => x.id));
  for (const id of sel[kind]) if (!ids.has(id)) sel[kind].delete(id); // 지워진 항목은 선택에서 제외
  const n = sel[kind].size;
  $(del).textContent = n ? `선택 삭제 (${n})` : '선택 삭제'; $(del).disabled = !n;
  $(all).checked = n > 0 && n === ids.size; $(all).indeterminate = n > 0 && n < ids.size;
}
for (const [kind, [list, all, del, label]] of Object.entries(BULK)) {
  $(list).addEventListener('change', (e) => {
    const id = e.target.dataset.sel; if (!id) return;
    e.target.checked ? sel[kind].add(id) : sel[kind].delete(id);
    syncBulk(kind);
  });
  $(all).onchange = (e) => { sel[kind] = new Set(e.target.checked ? data[kind].map((x) => x.id) : []); render(); };
  $(del).onclick = () => {
    if (!confirm(`선택한 ${label} ${sel[kind].size}개를 삭제할까요?`)) return;
    save({ [kind]: data[kind].filter((x) => !sel[kind].has(x.id)) });
    sel[kind].clear();
  };
}

const save = (patch) => store.save({ ...data, ...patch });
const resetForm = () => { form.reset(); form.pid.value = ''; $('submit').textContent = '추가'; $('cancel').hidden = true; };

form.onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  if (f.end < f.start) return alert('종료일이 시작일보다 빠를 수 없어요.');
  const plan = { id: f.pid || crypto.randomUUID(), title: f.title.trim(), start: f.start, end: f.end, color: f.color };
  save({ plans: f.pid ? data.plans.map((p) => (p.id === f.pid ? plan : p)) : [...data.plans, plan] });
  resetForm();
};
$('cancel').onclick = resetForm;
// 시작일을 종료일보다 뒤로 바꾸면 종료일도 시작일에 맞춘다
form.start.onchange = () => { if (form.end.value && form.end.value < form.start.value) form.end.value = form.start.value; };

$('list').onclick = (e) => {
  const { edit, del } = e.target.dataset;
  if (del && confirm('이 계획을 삭제할까요?')) save({ plans: data.plans.filter((p) => p.id !== del) });
  if (edit) {
    const p = data.plans.find((x) => x.id === edit);
    form.pid.value = p.id;
    for (const k of ['title', 'start', 'end']) form[k].value = p[k];
    form.querySelector(`input[value="${p.color}"]`)?.click();
    $('submit').textContent = '저장'; $('cancel').hidden = false;
  }
};

// 메모: 새 메모가 위로
const resetMemo = () => { memoForm.reset(); memoForm.pid.value = ''; $('memoSubmit').textContent = '추가'; $('memoCancel').hidden = true; };
memoForm.onsubmit = (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(memoForm));
  const memo = { id: f.pid || crypto.randomUUID(), text: f.text.trim(), color: f.color };
  save({ memos: f.pid ? data.memos.map((m) => (m.id === f.pid ? memo : m)) : [memo, ...data.memos] });
  resetMemo();
};
$('memoCancel').onclick = resetMemo;
const moveMemo = (id, to) => { // to: 옮길 위치(인덱스)
  const memos = [...data.memos], from = memos.findIndex((m) => m.id === id);
  if (from < 0 || to < 0 || to >= memos.length || from === to) return;
  memos.splice(to, 0, ...memos.splice(from, 1));
  save({ memos });
};
let dragId;
$('memoList').ondragstart = (e) => { dragId = e.target.closest('tr')?.dataset.id; e.target.closest('tr')?.classList.add('dragging'); };
$('memoList').ondragend = (e) => e.target.closest('tr')?.classList.remove('dragging');
$('memoList').ondragover = (e) => e.preventDefault(); // drop 허용
$('memoList').ondrop = (e) => {
  e.preventDefault();
  const id = e.target.closest('tr')?.dataset.id;
  if (dragId && id) moveMemo(dragId, data.memos.findIndex((m) => m.id === id));
};

$('memoList').onclick = (e) => {
  const { edit, del, up, down } = e.target.dataset;
  if (up || down) moveMemo(up || down, data.memos.findIndex((m) => m.id === (up || down)) + (up ? -1 : 1));
  if (del && confirm('이 메모를 삭제할까요?')) save({ memos: data.memos.filter((m) => m.id !== del) });
  if (edit) {
    const m = data.memos.find((x) => x.id === edit);
    memoForm.pid.value = m.id; memoForm.text.value = m.text;
    memoForm.querySelector(`input[value="${m.color}"]`)?.click();
    $('memoSubmit').textContent = '저장'; $('memoCancel').hidden = false;
  }
};

// 위치: Open-Meteo 지오코딩(키 불필요)
$('search').onclick = async () => {
  // 지오코딩은 동네 이름까지만 찾는다 → 끝의 번지(303-40 등)는 떼고 검색
  const q = $('q').value.trim().replace(/[\d\s-]+$/, ''); if (!q) return;
  try {
    const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=8&language=ko&name=${encodeURIComponent(q)}`)).json();
    $('results').innerHTML = (r.results || []).map((c, i) =>
      `<button data-i="${i}">${esc(c.name)} · ${esc(c.admin1 || '')} ${esc(c.admin2 || '')} ${esc(c.country || '')}</button>`).join('') || '<span class="muted">결과 없음</span>';
    $('results').onclick = (e) => {
      const c = r.results?.[e.target.dataset.i]; if (!c) return;
      save({ location: { name: /[가-힣]/.test(c.name) ? c.name : q, lat: c.latitude, lon: c.longitude } }); // 영문 이름이면 검색어 사용
      $('results').innerHTML = ''; $('q').value = '';
    };
  } catch (err) { $('results').textContent = `검색 실패: ${err.message}`; }
};
$('q').onkeydown = (e) => { if (e.key === 'Enter') $('search').click(); };
$('auto').onclick = () => save({ location: null });

store.onChange((d) => { data = d; render(); });
store.load().then((d) => { data = d; render(); });
