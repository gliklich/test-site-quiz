// Мини-поиск по window.FAQ_DATA

(function(){
  const data = (window.FAQ_DATA || []).map((x)=>({
    id: x.id,
    q: (x.question||'').trim(),
    a: (x.answer||'').trim(),
    qlc: (x.question||'').toLowerCase(),
    alc: (x.answer||'').toLowerCase(),
  }));

  const $q = document.getElementById('q');
  const $results = document.getElementById('results');
  const $count = document.getElementById('count');
  const $time = document.getElementById('time');

  function escapeHtml(s){
    return s.replace(/[&<>\"]/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
  }

  function makeHiliter(query){
    if (!query) return (s)=>escapeHtml(s);
    const parts = query.split(/\s+/).filter(Boolean).map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    if (!parts.length) return (s)=>escapeHtml(s);
    const re = new RegExp(`(${parts.join('|')})`, 'gi');
    return function(s){
      return escapeHtml(s).replace(re, '<span class="hl">$1</span>');
    };
  }

  function render(list, query, ms){
    const hl = makeHiliter(query);
    const html = list.map(item=>{
      return (
        '<article class="card">\n'
        + `<h3 class="q">${hl(item.q)}</h3>\n`
        + `<p class="a">${hl(item.a)}</p>\n`
        + '</article>'
      );
    }).join('\n');
    $results.innerHTML = html || '<div class="muted">Ничего не найдено</div>';
    $count.textContent = `Найдено: ${list.length}`;
    $time.textContent = ms != null ? `(${ms.toFixed(1)} мс)` : '';
  }

  function search(query){
    const t0 = performance.now();
    const q = (query||'').toLowerCase().trim();
    if (!q){ render(data.slice(0,50), '', performance.now()-t0); return; }

    // быстрый OR-поиск по токенам
    const tokens = q.split(/\s+/).filter(Boolean);
    const firstTok = tokens[0];
    const res = [];
    for (const item of data){
      // Условие: первый токен должен быть префиксом ПЕРВОГО слова вопроса
      if (firstTok){
        const firstWord = item.qlc.split(/[^a-zа-яёіїєґ0-9]+/i).find(Boolean) || '';
        if (!firstWord.startsWith(firstTok)) continue;
      }

      let score = 0;
      for (const tok of tokens){
        if (item.qlc.includes(tok)) score += 3;
        if (item.alc.includes(tok)) score += 1;
      }
      if (score>0) res.push([score, item]);
    }
    res.sort((a,b)=>b[0]-a[0] || a[1].id-b[1].id);
    const list = res.slice(0,200).map(x=>x[1]);
    const t1 = performance.now();
    render(list, query, t1-t0);
  }

  // Инициализация
  render(data.slice(0,50));
  $count.textContent = `Всего: ${data.length}`;
  $time.textContent = '';

  let timer = null;
  $q.addEventListener('input', ()=>{
    if (timer) cancelAnimationFrame(timer);
    const v = $q.value;
    timer = requestAnimationFrame(()=>search(v));
  });

  // Поиск по хэшу ?q=
  const qs = new URLSearchParams(location.search);
  if (qs.has('q')){
    $q.value = qs.get('q');
    search($q.value);
  }
})();


