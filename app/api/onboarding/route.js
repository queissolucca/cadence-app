import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 20).map((x) => x.slice(0, 200)) : []);
// jarr distingue "não veio" de "veio vazio": o funil antigo não manda `topics`,
// e gravar [] ali apagaria a diferença entre não perguntado e nenhum escolhido.
const jarr = (v) => (Array.isArray(v) ? arr(v) : null);
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);

// Colunas anteriores à migration 0034. Se a 0034 ainda não rodou no banco, o
// upsert com as colunas novas falha inteiro — e aí o funil trava, porque quem
// não tem onboarded_at volta pro /onboarding pra sempre. Por isso o upsert cai
// em degraus: linha completa → só as colunas antigas → sem gender (0029).
const COLUNAS_ANTIGAS = ['user_id', 'age', 'gender', 'level', 'reasons', 'challenges', 'daily_goal', 'updated_at'];
// Sem a 0035, as quatro colunas novas derrubam o upsert inteiro — inclusive as
// da 0034, que já funcionavam. Por isso ela ganhou um degrau próprio: o banco
// sem a migração mais nova continua gravando tudo o que ele sabe guardar.
const COLUNAS_0034 = [...COLUNAS_ANTIGAS, 'audio_pref', 'speaks_today', 'deadline', 'best_time', 'topics', 'tone', 'source'];
const somente = (row, chaves) => Object.fromEntries(Object.entries(row).filter(([k]) => chaves.includes(k)));

// POST → salva as respostas do onboarding do usuário e marca profiles.onboarded_at.
// Também semeia a memória da Cady (nível + motivos) pra ela já personalizar.
//
// Atende os DOIS funis:
//   - v1:      /login → /onboarding (6 perguntas) → /pagamento
//   - comecar: nova interface de 33 telas, que responde tudo antes da conta
//     existir e despeja aqui de uma vez assim que a sessão nasce.
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const source = body.source === 'comecar' ? 'comecar' : 'v1';

  const row = {
    user_id: user.id,
    age: str(body.age, 40),
    gender: str(body.gender, 40),
    level: str(body.level, 200),
    reasons: arr(body.reasons),
    challenges: arr(body.challenges),
    daily_goal: str(body.dailyGoal, 40),
    // Colunas da 0034 — só o funil novo preenche.
    audio_pref: str(body.audioPref, 40),
    speaks_today: str(body.speaksToday, 40),
    deadline: str(body.deadline, 40),
    best_time: str(body.bestTime, 40),
    topics: jarr(body.topics),
    tone: str(body.tone, 40),
    // Colunas da 0035 — o que as telas perguntavam e nunca era gravado.
    language: str(body.language, 40),
    speech_sample: str(body.speechSample, 500),
    invite_code: str(body.inviteCode, 40),
    // Estado bruto: a rede embaixo das colunas tipadas (ver a 0035).
    answers: body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : null,
    source,
    updated_at: new Date().toISOString(),
  };

  // Valida que respondeu tudo ANTES de marcar como onboarded. Sem isso, um POST
  // vazio viraria a chave do funil (profiles.onboarded_at) e pularia as perguntas.
  //
  // A nova interface não pergunta idade nem gênero (não estão entre as 33 telas),
  // então exigir `age` ali reprovaria toda pessoa que vem por /comecar e a jogaria
  // no questionário antigo depois de já ter respondido 28 telas. A régua muda com
  // o funil; a do v1 continua exatamente como era.
  const respondeuONucleo =
    !!row.level && !!row.daily_goal &&
    Array.isArray(row.reasons) && row.reasons.length > 0 &&
    Array.isArray(row.challenges) && row.challenges.length > 0;
  const complete = source === 'comecar' ? respondeuONucleo : (!!row.age && respondeuONucleo);
  if (!complete) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  // 1) Marca onboarded_at (a chave do funil) de forma VERIFICADA. Se falhar,
  // retorna erro e o cliente NÃO avança — evita o loop /onboarding ↔ /pagamento.
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', user.id);
  if (profErr) return NextResponse.json({ error: 'save_failed', details: profErr.message }, { status: 500 });

  /* 2) Detalhes das respostas. Continua sem travar o funil — quem já respondeu
     28 telas não pode ficar preso porque uma migration não rodou — mas para de
     ser SILENCIOSO: antes, se os quatro degraus falhassem, o `onboarded_at`
     era marcado do mesmo jeito e as respostas sumiam sem ninguém ficar sabendo.
     Agora o erro vai pro log do servidor e o `saved` volta na resposta. */
  const DEGRAUS = [
    row,                                                          // 0035
    somente(row, COLUNAS_0034),                                   // sem a 0035
    somente(row, COLUNAS_ANTIGAS),                                // sem a 0034
    somente(row, COLUNAS_ANTIGAS.filter((c) => c !== 'gender')),  // sem a 0029
  ];
  let salvou = false;
  let ultimoErro = null;
  for (const tentativa of DEGRAUS) {
    const up = await supabase.from('onboarding').upsert(tentativa, { onConflict: 'user_id' });
    if (!up.error) { salvou = true; break; }
    ultimoErro = up.error;
  }
  if (!salvou) console.error('[onboarding] respostas não gravadas', { user: user.id, erro: ultimoErro?.message });

  // semeia a memória da Cady (best-effort) pra ela já conhecer o usuário
  try {
    const facts = [];
    if (row.level) facts.push({ user_id: user.id, category: 'goals', fact: `Nível de inglês (autoavaliado): ${row.level.replace(/\.$/, '')}`, importance: 5 });
    if (row.daily_goal) facts.push({ user_id: user.id, category: 'goals', fact: `Meta diária: ${row.daily_goal}`, importance: 4 });
    (row.reasons || []).slice(0, 3).forEach((r) => facts.push({ user_id: user.id, category: 'goals', fact: `Quer aprender inglês para: ${r.replace(/\.$/, '')}`, importance: 4 }));
    (row.challenges || []).slice(0, 2).forEach((c) => facts.push({ user_id: user.id, category: 'other', fact: `Desafio com o inglês: ${c.replace(/\.$/, '')}`, importance: 4 }));
    // Vindas só do funil novo — o tom é o que mais muda a voz da Cady, por isso
    // entra com importância máxima.
    if (row.tone) facts.push({ user_id: user.id, category: 'preferences', fact: `Prefere correção em tom ${row.tone === 'agressivo' ? 'direto — quer ser corrigido na hora, sem suavizar' : 'tranquilo — professor paciente, sem pressão'}`, importance: 5 });
    (row.topics || []).slice(0, 4).forEach((t) => facts.push({ user_id: user.id, category: 'preferences', fact: `Gosta de conversar sobre: ${t}`, importance: 3 }));
    if (row.best_time) facts.push({ user_id: user.id, category: 'preferences', fact: `Melhor horário pra praticar: ${row.best_time}`, importance: 2 });
    // Só vira memória quando NÃO é inglês: "quer aprender inglês" é o padrão de
    // todo mundo aqui, e memória que vale pra todos não personaliza nada.
    if (row.language && row.language !== 'Inglês') facts.push({ user_id: user.id, category: 'goals', fact: `Escolheu aprender ${row.language}`, importance: 4 });
    if (facts.length) await supabase.from('user_memory').insert(facts);
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, saved: salvou });
}
