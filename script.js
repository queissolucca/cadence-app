(() => {
  'use strict';

  const SCHEDULE = [1, 7, 30]; // days: amanhã, 1 semana, 1 mês

  const WRITE_SCENARIOS = [
    {
      label: 'EMAIL DE TRABALHO',
      context: 'Seu gerente perguntou se o relatório fica pronto hoje.',
      askPt: 'Responda dizendo que você envia amanhã de manhã.',
      natural: "I'll send you the report by tomorrow morning.",
      genericWhy: '"By" marca o prazo final — "até, no mais tardar".',
      tip: '',
      mistakes: [{ re: /\buntil\b/i, why: 'Use "by" para marcar o prazo final, não "until" (que indica uma ação contínua até aquele momento).' }],
    },
    {
      label: 'MENSAGEM A UM COLEGA',
      context: 'Você vai se atrasar para a reunião.',
      askPt: 'Avise que chega 10 minutos atrasado e peça para começarem sem você.',
      natural: "I'm running about 10 minutes late — please start without me.",
      genericWhy: '"I\'m running late" é a forma natural de dizer que você está atrasado chegando a algum lugar.',
      tip: '',
      mistakes: [],
    },
    {
      label: 'EMAIL PARA O HOTEL',
      context: 'Você chega antes do horário de check-in.',
      askPt: 'Pergunte educadamente se dá para fazer o check-in mais cedo.',
      natural: 'Would it be possible to check in a little earlier than usual?',
      genericWhy: '"Would it be possible to…?" é o pedido educado padrão em um email formal.',
      tip: 'Evite "Can I do check-in earlier" — soa mais direto do que o esperado em um email para um hotel.',
      mistakes: [{ re: /\bcan i\b/i, why: '"Can I…?" soa mais informal para um email. Prefira "Would it be possible to…?".' }],
    },
    {
      label: 'RESPOSTA NO SLACK',
      context: 'Te convidaram para uma call em cima da hora.',
      askPt: 'Recuse com educação e sugira outro horário amanhã.',
      natural: "I can't join right now — could we do it tomorrow morning instead?",
      genericWhy: 'Ao recusar, ofereça sempre uma alternativa concreta para soar colaborativo.',
      tip: '',
      mistakes: [],
    },
    {
      label: 'EMAIL PARA CLIENTE',
      context: 'A entrega atrasou e o cliente está esperando.',
      askPt: 'Peça desculpas pelo atraso e dê um novo prazo realista.',
      natural: "I'm sorry for the delay — I'll have this ready for you by Friday.",
      genericWhy: 'Peça desculpas primeiro e feche com um prazo específico, não vago.',
      tip: '',
      mistakes: [],
    },
    {
      label: 'CONVITE',
      context: 'Você quer ver um amigo no fim de semana.',
      askPt: 'Convide-o para almoçar no sábado e sugira um lugar.',
      natural: 'Want to grab lunch on Saturday? I was thinking that new place downtown.',
      genericWhy: 'Convites soam mais naturais quando já vêm com uma sugestão concreta de lugar.',
      tip: '',
      mistakes: [],
    },
  ];

  const SPEAK_SCENARIOS = [
    {
      label: 'RESTAURANTE',
      context: 'Você terminou de comer e quer ir embora.',
      askPt: 'Peça a conta com educação.',
      natural: 'Could we get the bill, please?',
      genericWhy: '"Could we get…?" é o pedido educado e padrão em restaurantes.',
      tip: '',
      mistakes: [{ re: /\bi want\b/i, why: '"I want the bill" soa rude; "Could we get…?" é o pedido educado.' }],
    },
    {
      label: 'AEROPORTO',
      context: 'Você está perdido no terminal.',
      askPt: 'Pergunte a alguém onde fica o portão 22.',
      natural: 'Excuse me, do you know where gate 22 is?',
      genericWhy: 'Comece com "Excuse me" para chamar a atenção de alguém educadamente.',
      tip: '',
      mistakes: [],
    },
    {
      label: 'REUNIÃO',
      context: 'Você discorda de uma ideia que acabaram de propor.',
      askPt: 'Discorde de forma educada e diga o porquê.',
      natural: "I see your point, but I'm not sure that would work, because...",
      genericWhy: 'Reconheça o outro lado antes de discordar — soa mais colaborativo que discordar direto.',
      tip: '',
      mistakes: [],
    },
    {
      label: 'CAFETERIA',
      context: 'É a sua vez no balcão.',
      askPt: 'Peça um cappuccino médio para viagem.',
      natural: 'Could I get a medium cappuccino to go, please?',
      genericWhy: '"To go" é a forma natural de dizer "para viagem" nos EUA.',
      tip: '',
      mistakes: [],
    },
    {
      label: 'APRESENTAÇÃO',
      context: 'Você vai começar uma reunião com pessoas novas.',
      askPt: 'Apresente-se em duas frases (nome e o que você faz).',
      natural: "Hi, I'm Rafa — I work on the design team here.",
      genericWhy: 'Duas frases bastam: nome primeiro, depois o que você faz.',
      tip: '',
      mistakes: [],
    },
    {
      label: 'AO TELEFONE',
      context: 'Você não entendeu o que a pessoa disse.',
      askPt: 'Peça educadamente para ela repetir mais devagar.',
      natural: 'Sorry, could you say that again a bit more slowly?',
      genericWhy: '"A bit more slowly" é mais natural do que "more slow".',
      tip: '',
      mistakes: [],
    },
  ];

  function seedItems() {
    const past = Date.now() - 3600000;
    const mk = (mode, label, context, askPt, natural, why) => ({
      id: 'seed-' + Math.random().toString(36).slice(2, 8),
      mode, label, context, askPt, natural, why, tip: '',
      stage: 0, mastered: false, due: past, created: Date.now(), lastResult: 'new',
    });
    return [
      mk('write', 'EMAIL DE TRABALHO', 'Seu gerente pediu o relatório para hoje.', 'Diga que você envia amanhã de manhã.', "I'll send you the report by tomorrow morning.", 'Use "by" para marcar o prazo final, não "until".'),
      mk('speak', 'RESTAURANTE', 'Você terminou de comer e quer ir embora.', 'Peça a conta com educação.', 'Could we get the bill, please?', '"I want the bill" soa rude; "Could we get…?" é o pedido educado.'),
      mk('write', 'RESPOSTA NO SLACK', 'Te convidaram para uma call em cima da hora.', 'Recuse com educação e sugira outro horário.', "I can't join right now — could we do it tomorrow morning instead?", 'Ao recusar, ofereça uma alternativa para soar colaborativo.'),
    ];
  }

  function similarity(a, b) {
    const norm = (s) => s.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/).filter(Boolean);
    const wa = new Set(norm(a)), wb = new Set(norm(b));
    if (!wa.size || !wb.size) return 0;
    let inter = 0;
    wa.forEach((w) => { if (wb.has(w)) inter++; });
    return inter / Math.max(wa.size, wb.size);
  }

  function correct(sc, text) {
    return new Promise((resolve) => {
      setTimeout(() => {
        for (const m of sc.mistakes || []) {
          if (m.re.test(text)) {
            resolve({ verdict: 'minor', natural: sc.natural, why: m.why, tip: sc.tip || '' });
            return;
          }
        }
        const sim = similarity(text, sc.natural);
        if (sim >= 0.5) {
          resolve({ verdict: 'good', natural: sc.natural, why: 'Sua frase já soa natural — bem parecida com o que um nativo diria.', tip: '' });
        } else if (sim >= 0.2) {
          resolve({ verdict: 'minor', natural: sc.natural, why: sc.genericWhy, tip: sc.tip || '' });
        } else {
          resolve({ verdict: 'rework', natural: sc.natural, why: sc.genericWhy, tip: sc.tip || '' });
        }
      }, 650 + Math.random() * 450);
    });
  }

  const state = {
    screen: 'home',
    writeIdx: 0,
    speakIdx: 0,
    transcript: '',
    speakTyped: '',
    writeLen: 0,
    recording: false,
    loading: false,
    error: '',
    result: null,
    streak: 1,
    saved: [],
    reviewing: false,
    reviewList: [],
    reviewPos: 0,
  };

  let recognition = null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSupported = !!SR;

  const el = (id) => document.getElementById(id);
  const screens = {
    home: el('screen-home'),
    write: el('screen-write'),
    speak: el('screen-speak'),
    result: el('screen-result'),
  };

  function humanDays(d) {
    return d === 1 ? 'amanhã' : d === 7 ? '1 semana' : d === 30 ? '1 mês' : ('em ' + d + ' dias');
  }

  function dueLabel(it, now) {
    if (!it) return '';
    if (it.mastered) return 'dominado';
    if (typeof it.due !== 'number') return 'salva';
    if (it.due <= now) return 'revisar';
    const d = Math.ceil((it.due - now) / 86400000);
    return d <= 1 ? 'amanhã' : d < 7 ? ('em ' + d + 'd') : d < 30 ? '1 sem' : '1 mês';
  }

  function schedule(item, pass) {
    let stage = pass ? (item.stage || 0) + 1 : 0;
    let mastered = false, due;
    if (stage >= SCHEDULE.length) { mastered = true; stage = SCHEDULE.length; due = Date.now() + 365 * 86400000; }
    else { due = Date.now() + SCHEDULE[stage] * 86400000; }
    return { ...item, stage, mastered, due, lastResult: pass ? 'ok' : 'fail' };
  }

  function speak(txt) {
    if (!txt || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'en-US'; u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function loadPersisted() {
    try {
      const today = new Date().toDateString();
      const ls = JSON.parse(localStorage.getItem('cadence_streak') || '{}');
      let streak = ls.streak || 1;
      if (ls.last && ls.last !== today) {
        const diff = (new Date(today) - new Date(ls.last)) / 86400000;
        streak = diff === 1 ? streak + 1 : 1;
      } else if (!ls.last) { streak = 1; }
      localStorage.setItem('cadence_streak', JSON.stringify({ streak, last: today }));

      let saved = JSON.parse(localStorage.getItem('cadence_items') || '[]');
      if (!localStorage.getItem('cadence_seeded')) {
        saved = [...seedItems(), ...saved];
        localStorage.setItem('cadence_items', JSON.stringify(saved));
        localStorage.setItem('cadence_seeded', '1');
      }
      state.streak = streak;
      state.saved = saved;
    } catch (e) {}
  }

  function saveItem(res, mode, sc) {
    try {
      const item = {
        id: 'i' + Date.now() + Math.random().toString(36).slice(2, 5),
        mode, label: sc.label, context: sc.context, askPt: sc.askPt,
        natural: res.natural, why: res.why, tip: res.tip,
        stage: 0, mastered: false, due: Date.now() + 86400000, created: Date.now(), lastResult: 'new',
      };
      const saved = [item, ...(JSON.parse(localStorage.getItem('cadence_items') || '[]'))].slice(0, 60);
      localStorage.setItem('cadence_items', JSON.stringify(saved));
      state.saved = saved;
    } catch (e) {}
  }

  function updateItem(upd) {
    try {
      const saved = (state.saved || []).map((it) => (it.id === upd.id ? upd : it));
      localStorage.setItem('cadence_items', JSON.stringify(saved));
      state.saved = saved;
    } catch (e) {}
  }

  // ---------- navigation ----------
  function stopRec() { try { recognition && recognition.stop(); } catch (e) {} }

  function goHome() {
    stopRec();
    Object.assign(state, { screen: 'home', error: '', transcript: '', speakTyped: '', recording: false, reviewing: false });
    render();
  }

  function startWrite() {
    Object.assign(state, { screen: 'write', error: '', writeLen: 0, reviewing: false });
    render();
    el('write-textarea').value = '';
  }

  function startSpeak() {
    Object.assign(state, { screen: 'speak', error: '', transcript: '', speakTyped: '', recording: false, reviewing: false });
    render();
  }

  function startReview() {
    const now = Date.now();
    const list = (state.saved || [])
      .filter((it) => it.askPt && !it.mastered && typeof it.due === 'number' && it.due <= now)
      .sort((a, b) => a.due - b.due);
    if (!list.length) return;
    const first = list[0];
    Object.assign(state, { reviewing: true, reviewList: list, reviewPos: 0, screen: first.mode, transcript: '', speakTyped: '', error: '', recording: false });
    render();
    if (first.mode === 'write') el('write-textarea').value = '';
  }

  function loadReviewItem(pos) {
    const item = state.reviewList[pos];
    Object.assign(state, { screen: item.mode, reviewPos: pos, transcript: '', speakTyped: '', error: '', recording: false });
    render();
    if (item.mode === 'write') el('write-textarea').value = '';
  }

  function nextSame() {
    if (state.reviewing) {
      const pos = state.reviewPos + 1;
      if (pos < state.reviewList.length) loadReviewItem(pos);
      else goHome();
      return;
    }
    const r = state.result;
    if (r && r.mode === 'speak') {
      Object.assign(state, { screen: 'speak', speakIdx: (state.speakIdx + 1) % SPEAK_SCENARIOS.length, transcript: '', speakTyped: '', error: '', recording: false });
      render();
    } else {
      Object.assign(state, { screen: 'write', writeIdx: (state.writeIdx + 1) % WRITE_SCENARIOS.length, writeLen: 0, error: '' });
      render();
      el('write-textarea').value = '';
    }
  }

  // ---------- speech ----------
  function toggleRec() { state.recording ? stopRec() : startRec(); }

  function startRec() {
    if (!SR) return;
    try {
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      let finalTxt = '';
      rec.onresult = (ev) => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finalTxt += t; else interim += t;
        }
        state.transcript = (finalTxt + interim).trim();
        renderSpeak();
      };
      rec.onerror = (e) => {
        state.recording = false;
        state.error = e.error === 'not-allowed' ? 'Permita o acesso ao microfone para falar.' : 'O microfone falhou. Tente de novo.';
        renderSpeak();
      };
      rec.onend = () => { state.recording = false; renderSpeak(); };
      recognition = rec;
      rec.start();
      state.recording = true; state.error = ''; state.transcript = '';
      renderSpeak();
    } catch (e) {
      state.recording = false;
      state.error = 'Não consegui abrir o microfone.';
      renderSpeak();
    }
  }

  // ---------- submit ----------
  async function submitWrite() {
    if (state.reviewing) return gradeReview('write');
    const text = (el('write-textarea').value || '').trim();
    if (!text) { state.error = 'Escreva sua resposta primeiro.'; renderWrite(); return; }
    state.loading = true; state.error = '';
    renderLoading();
    const sc = WRITE_SCENARIOS[state.writeIdx];
    const res = await correct(sc, text);
    saveItem(res, 'write', sc);
    state.loading = false;
    state.screen = 'result';
    state.result = { ...res, original: text, mode: 'write', isReview: false, stage: 0, mastered: false, nextLabel: 'amanhã' };
    render();
  }

  async function submitSpeak() {
    if (state.reviewing) return gradeReview('speak');
    const text = (speechSupported ? state.transcript : state.speakTyped).trim();
    if (!text) { state.error = 'Fale (ou digite) sua resposta primeiro.'; renderSpeak(); return; }
    stopRec();
    state.loading = true; state.error = '';
    renderLoading();
    const sc = SPEAK_SCENARIOS[state.speakIdx];
    const res = await correct(sc, text);
    saveItem(res, 'speak', sc);
    state.loading = false;
    state.screen = 'result';
    state.result = { ...res, original: text, mode: 'speak', isReview: false, stage: 0, mastered: false, nextLabel: 'amanhã' };
    render();
  }

  async function gradeReview(mode) {
    const item = state.reviewList[state.reviewPos];
    const text = (mode === 'speak' ? (speechSupported ? state.transcript : state.speakTyped) : (el('write-textarea').value || '')).trim();
    if (!text) {
      state.error = mode === 'speak' ? 'Fale (ou digite) sua resposta primeiro.' : 'Escreva sua resposta primeiro.';
      mode === 'speak' ? renderSpeak() : renderWrite();
      return;
    }
    stopRec();
    state.loading = true; state.error = '';
    renderLoading();
    const res = await correct(item, text);
    const pass = res.verdict !== 'rework';
    const upd = schedule(item, pass);
    updateItem(upd);
    const nextLabel = upd.mastered ? 'dominado' : humanDays(SCHEDULE[Math.min(upd.stage, SCHEDULE.length - 1)]);
    state.loading = false;
    state.screen = 'result';
    state.result = { ...res, original: text, mode, isReview: true, pass, stage: upd.stage, mastered: upd.mastered, nextLabel };
    render();
  }

  // ---------- rendering ----------
  function showScreen(name) {
    Object.keys(screens).forEach((k) => { screens[k].hidden = k !== name; });
    el('loading-overlay').hidden = !state.loading;
  }

  function renderLoading() {
    el('loading-label').textContent = state.reviewing ? 'avaliando…' : 'corrigindo…';
    el('loading-overlay').hidden = !state.loading;
  }

  function renderHome() {
    el('streak-num').textContent = state.streak;
    const now = Date.now();
    const dueItems = (state.saved || []).filter((it) => it.askPt && !it.mastered && typeof it.due === 'number' && it.due <= now);
    const banner = el('review-banner');
    if (dueItems.length > 0) {
      banner.hidden = false;
      el('review-count').textContent = dueItems.length;
      el('review-sub').textContent = dueItems.length === 1 ? '1 frase no ponto de revisão' : (dueItems.length + ' frases no ponto de revisão');
    } else {
      banner.hidden = true;
    }

    el('saved-count').textContent = (state.saved || []).length + ' na memória espaçada';
    const list = el('saved-list');
    const empty = el('saved-empty');
    list.innerHTML = '';
    const items = (state.saved || []).slice(0, 5);
    if (items.length === 0) {
      empty.hidden = false;
    } else {
      empty.hidden = true;
      items.forEach((it) => {
        const due = it.due <= now && !it.mastered;
        const btn = document.createElement('button');
        btn.className = 'saved-item';
        const chipBg = due ? 'color-mix(in srgb, var(--accent) 16%, #fff)' : '#f1f0ea';
        const chipColor = due ? 'color-mix(in srgb, var(--accent) 72%, #000)' : '#86887b';
        btn.innerHTML = `
          <span class="saved-item-copy">
            <span class="saved-item-natural"></span>
            <span class="saved-item-why"></span>
          </span>
          <span class="saved-item-chip" style="background:${chipBg};color:${chipColor}"></span>
          <span class="saved-item-play">▷</span>
        `;
        btn.querySelector('.saved-item-natural').textContent = it.natural;
        btn.querySelector('.saved-item-why').textContent = it.why || '';
        btn.querySelector('.saved-item-chip').textContent = dueLabel(it, now);
        btn.addEventListener('click', () => speak(it.natural));
        list.appendChild(btn);
      });
    }
  }

  function currentWriteScenario() {
    if (state.reviewing) return state.reviewList[state.reviewPos];
    return WRITE_SCENARIOS[state.writeIdx];
  }
  function currentSpeakScenario() {
    if (state.reviewing) return state.reviewList[state.reviewPos];
    return SPEAK_SCENARIOS[state.speakIdx];
  }

  function renderWrite() {
    const sc = currentWriteScenario();
    const reviewItem = state.reviewing ? state.reviewList[state.reviewPos] : null;
    el('write-header').textContent = reviewItem
      ? ('REVISÃO · ' + (state.reviewPos + 1) + '/' + state.reviewList.length + ' · ' + reviewItem.label)
      : ('ESCRITA · ' + sc.label);
    el('write-context').textContent = sc.context;
    el('write-ask').textContent = sc.askPt;

    const errBox = el('write-error');
    errBox.hidden = !state.error;
    errBox.textContent = state.error || '';

    const btn = el('write-submit');
    btn.textContent = state.loading ? (state.reviewing ? 'Avaliando…' : 'Corrigindo…') : 'Verificar';
    btn.classList.toggle('is-ready', state.writeLen > 0);
    btn.disabled = state.loading;
  }

  function renderSpeak() {
    const sc = currentSpeakScenario();
    const reviewItem = state.reviewing ? state.reviewList[state.reviewPos] : null;
    el('speak-header').textContent = reviewItem
      ? ('REVISÃO · ' + (state.reviewPos + 1) + '/' + state.reviewList.length + ' · ' + reviewItem.label)
      : ('FALA · ' + sc.label);
    el('speak-context').textContent = sc.context;
    el('speak-ask').textContent = sc.askPt;

    el('transcript-box').hidden = !speechSupported;
    el('speak-fallback').hidden = speechSupported;

    if (speechSupported) {
      el('speak-hint').textContent = state.recording ? 'OUVINDO…' : (state.transcript ? 'VOCÊ DISSE' : 'TOQUE NO MICROFONE E FALE');
      el('transcript-text').textContent = state.transcript;
      el('rec-dot').hidden = !state.recording;
    }

    const errBox = el('speak-error');
    errBox.hidden = !state.error;
    errBox.textContent = state.error || '';

    el('mic-btn').hidden = !speechSupported;
    el('mic-caption').hidden = !speechSupported;
    el('mic-pulse').hidden = !state.recording;
    el('mic-circle').classList.toggle('is-recording', state.recording);
    el('mic-caption').textContent = state.recording ? 'toque para parar' : 'toque para falar';

    const speakText = (speechSupported ? state.transcript : state.speakTyped) || '';
    const canCheck = !state.recording && speakText.trim().length > 0;
    const submitBtn = el('speak-submit');
    submitBtn.hidden = !canCheck;
    submitBtn.textContent = state.loading ? (state.reviewing ? 'Avaliando…' : 'Corrigindo…') : 'Verificar';

    if (!speechSupported) el('speak-textarea').value = state.speakTyped;
  }

  function buildLadder(filled) {
    const wrap = document.createElement('div');
    wrap.className = 'ladder';
    wrap.id = 'ladder';
    for (let i = 0; i < 4; i++) {
      const st = i < filled ? 'fill' : (i === filled ? 'cur' : 'empty');
      const dot = document.createElement('span');
      dot.className = 'ladder-dot ' + st;
      wrap.appendChild(dot);
      if (i < 3) {
        const seg = document.createElement('span');
        seg.className = 'ladder-seg' + (i < filled - 1 ? ' fill' : '');
        wrap.appendChild(seg);
      }
    }
    return wrap;
  }

  function renderResult() {
    const R = state.result;
    if (!R) return;
    let badge;
    if (R.isReview) {
      badge = R.pass
        ? { text: 'Acertou!', icon: '✓', bg: 'color-mix(in srgb, var(--accent) 15%, #fff)', color: 'color-mix(in srgb, var(--accent) 72%, #000)' }
        : { text: 'Ainda não — volta amanhã', icon: '↺', bg: '#fbe8de', color: '#c0473a' };
    } else {
      const map = {
        good: { text: 'Perfeito, soa natural', icon: '✓' },
        minor: { text: 'Quase lá — pequeno ajuste', icon: '✓' },
        rework: { text: 'Dá pra deixar mais natural', icon: '!' },
      };
      const m = map[R.verdict] || map.minor;
      const ok = R.verdict !== 'rework';
      badge = { text: m.text, icon: m.icon, bg: ok ? 'color-mix(in srgb, var(--accent) 15%, #fff)' : '#fbe8de', color: ok ? 'color-mix(in srgb, var(--accent) 72%, #000)' : '#c0473a' };
    }

    el('result-mode-label').textContent = R.isReview ? ('REVISÃO · ' + (R.mode === 'speak' ? 'FALA' : 'ESCRITA')) : (R.mode === 'speak' ? 'FALA · CORREÇÃO' : 'ESCRITA · CORREÇÃO');

    const badgeIcon = el('badge-icon');
    badgeIcon.textContent = badge.icon;
    badgeIcon.style.background = badge.bg;
    badgeIcon.style.color = badge.color;
    el('badge-text').textContent = badge.text;

    el('result-original-label').textContent = R.mode === 'speak' ? 'VOCÊ FALOU' : 'VOCÊ ESCREVEU';
    el('result-original-text').textContent = R.original;
    el('result-natural-text').textContent = R.natural;
    el('result-why-text').textContent = R.why || '—';

    const tipBlock = el('result-tip-block');
    if (R.tip) { tipBlock.hidden = false; el('result-tip-text').textContent = R.tip; }
    else { tipBlock.hidden = true; }

    el('sr-label').textContent = R.isReview ? (R.mastered ? 'DOMINADO' : 'PRÓXIMA REVISÃO') : 'SALVO · VOLTA PRA REVISÃO';
    el('sr-next').textContent = R.mastered ? 'dominado' : R.nextLabel;

    const filled = R.mastered ? 4 : (R.stage || 0) + 1;
    el('ladder').replaceWith(buildLadder(filled));

    const nextBtnLabel = (state.result && state.result.isReview)
      ? ((state.reviewPos + 1 < (state.reviewList || []).length) ? 'Próxima frase' : 'Concluir revisão')
      : 'Próximo cenário';
    el('result-next').textContent = nextBtnLabel;
  }

  function render() {
    showScreen(state.screen);
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'write') renderWrite();
    else if (state.screen === 'speak') renderSpeak();
    else if (state.screen === 'result') renderResult();
  }

  // ---------- wiring ----------
  function init() {
    loadPersisted();

    document.querySelectorAll('[data-action="go-home"]').forEach((b) => b.addEventListener('click', goHome));
    el('btn-start-write').addEventListener('click', startWrite);
    el('btn-start-speak').addEventListener('click', startSpeak);
    el('review-banner').addEventListener('click', startReview);

    el('write-textarea').addEventListener('input', (e) => {
      state.writeLen = e.target.value.trim().length;
      renderWrite();
    });
    el('write-submit').addEventListener('click', submitWrite);

    el('speak-textarea').addEventListener('input', (e) => {
      state.speakTyped = e.target.value.trim();
      renderSpeak();
    });
    el('mic-btn').addEventListener('click', toggleRec);
    el('speak-submit').addEventListener('click', submitSpeak);

    el('replay-btn').addEventListener('click', () => speak(state.result && state.result.natural));
    el('result-next').addEventListener('click', nextSame);

    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
