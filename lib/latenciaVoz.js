/* QUANTO TEMPO A CADY DEMORA PRA RESPONDER — medido, não estimado.

   "Ela demora" era relato. Este módulo transforma em número, e num número que
   corresponde ao que a pessoa SENTE: o silêncio entre ela parar de falar e a
   Cady começar a falar. Não é o tempo do modelo, não é o tempo da rede — é o
   silêncio, que é a única coisa que o usuário percebe.

   Quatro marcos, todos vindos de eventos que o SDK do ElevenLabs já emite:

     1. a pessoa para de falar        -> onVadScore cai abaixo do limiar
     2. a transcrição dela chega      -> onMessage com source 'user'
     3. a Cady começa a emitir áudio  -> onAudio (1º pedaço)
     4. (a Cady pediu uma ferramenta) -> onAgentToolRequest

   Dois intervalos saem daí, e eles separam culpas diferentes:

     ouvir   = (2) - (1)  -> detecção de fim de turno + ASR. Mora na configuração
                             do agente (turn-taking, timeouts), não no nosso código.
     pensar  = (3) - (2)  -> LLM + TTS. Mora no modelo escolhido, no tamanho do
                             system prompt e na voz/modelo de TTS.
     total   = (3) - (1)  -> o silêncio que a pessoa sente.

   Sem essa separação, "está lento" não diz onde mexer: um prompt de 2.300 tokens
   e um turn-taking mal configurado produzem a mesma queixa.

   Isolado do componente porque é uma máquina de estados com casos de borda
   (fala picada, transcrição que chega antes do VAD cair, turno sem áudio) e
   nenhuma dependência de React nem do SDK. */

/* Acima disto consideramos que tem voz. O VAD do ElevenLabs devolve 0..1; 0.5 é
   o meio, e o que separa fala de ruído de fundo sem ficar sensível demais. */
export const LIMIAR_VAD = 0.5;

/* Uma queda de VAD só vale como "parou de falar" se a fala durou o bastante pra
   ser uma fala. Sem isto, um "hmm" ou um estalo viram um turno medido, e a média
   vai pro brejo com turnos que nunca existiram. */
export const FALA_MINIMA_MS = 300;

/* Teto de sanidade. Um turno acima disto quase sempre é a pessoa tendo ficado
   calada e o agente retomando sozinho (o turn_timeout do painel), não uma
   resposta lenta. Medir isso como latência mentiria pra pior. */
export const TETO_MS = 15000;

export function criarMedidor({ agora = () => Date.now() } = {}) {
  const turnos = [];
  let falando = false;
  let comecouAFalar = 0;
  let parouDeFalar = 0;
  let transcreveuEm = 0;
  let ferramentas = 0;
  let esperando = false;   // a pessoa falou e a resposta ainda não veio

  function vad(score) {
    const t = agora();
    const tem = typeof score === 'number' && score >= LIMIAR_VAD;
    if (tem && !falando) { falando = true; comecouAFalar = t; return; }
    if (!tem && falando) {
      falando = false;
      if (t - comecouAFalar < FALA_MINIMA_MS) return;   // ruído, não fala
      parouDeFalar = t;
      transcreveuEm = 0;
      ferramentas = 0;
      esperando = true;
    }
  }

  // A transcrição da PESSOA chegou (onMessage com source 'user').
  function transcreveu() {
    if (!esperando || transcreveuEm) return;
    transcreveuEm = agora();
  }

  // A Cady pediu uma ferramenta neste turno (o save_to_review automático).
  // Contado porque cada chamada é uma ida a mais ao modelo antes de ela falar.
  function ferramenta() {
    if (esperando) ferramentas += 1;
  }

  /* O primeiro pedaço de áudio dela. É aqui que o silêncio acaba — e é por isso
     que o marco é o ÁUDIO e não o texto: a transcrição da resposta pode chegar
     antes do som, e cravar nela daria um número melhor do que a realidade. */
  function respondeu() {
    if (!esperando) return null;
    esperando = false;
    const t = agora();
    const total = t - parouDeFalar;
    if (total > TETO_MS) return null;   // não foi resposta: foi retomada
    const turno = {
      total,
      ouvir: transcreveuEm ? transcreveuEm - parouDeFalar : null,
      pensar: transcreveuEm ? t - transcreveuEm : null,
      ferramentas,
    };
    turnos.push(turno);
    return turno;
  }

  // A conversa acabou ou a pessoa interrompeu: o turno pendente não conta.
  function descartar() { esperando = false; }

  /* O BURACO DO MUTE AUTOMÁTICO.

     Este app fecha o microfone enquanto a Cady fala e reabre quando ela cala —
     é o preço de não ter barge-in. Entre "ela calou" e "o microfone abriu" existe
     uma janela em que a pessoa PODE já estar falando e não está sendo ouvida. Ela
     não aparece na latência de resposta (o relógio dela só começa quando há voz),
     mas aparece pro usuário do jeito pior: ele fala, repete, e a conversa demora.

     É a única parte do atraso que mora no nosso código e não na configuração do
     agente, então merece número próprio. */
  let calouEm = 0;
  const aberturas = [];
  function agenteParou() { calouEm = agora(); }
  function micAberto() {
    if (!calouEm) return;
    aberturas.push(agora() - calouEm);
    calouEm = 0;
  }

  function resumo() {
    if (!turnos.length) return null;
    const ord = (campo) => turnos.map((x) => x[campo]).filter((v) => typeof v === 'number').sort((a, b) => a - b);
    const q = (lista, p) => (lista.length ? lista[Math.min(lista.length - 1, Math.floor(lista.length * p))] : null);
    const media = (lista) => (lista.length ? Math.round(lista.reduce((s, v) => s + v, 0) / lista.length) : null);
    const t = ord('total');
    return {
      turnos: turnos.length,
      mediaMs: media(t),
      medianaMs: q(t, 0.5),
      p90Ms: q(t, 0.9),
      piorMs: t.length ? t[t.length - 1] : null,
      ouvirMedianaMs: q(ord('ouvir'), 0.5),
      pensarMedianaMs: q(ord('pensar'), 0.5),
      turnosComFerramenta: turnos.filter((x) => x.ferramentas > 0).length,
      microfoneMedianaMs: q([...aberturas].sort((a, b) => a - b), 0.5),
      microfonePiorMs: aberturas.length ? Math.max(...aberturas) : null,
    };
  }

  return { vad, transcreveu, ferramenta, respondeu, descartar, agenteParou, micAberto, resumo, turnos };
}
