'use client';

import { useEffect, useRef, useState } from 'react';
import { Cady, CadyViva } from '../Cady';
import { Constelacao, Glyph, Icon, WorldMap } from '../ui';
import { Card, Cta, Ghost, Grow, Kicker, Lede, Opts, Pager, Wordmark } from '../shell';
import { LANGS } from '../../../lib/comecar/data';
import { useSpeechRecognition } from '../../../lib/useSpeechRecognition';
import { FRASE_TESTE, compararFala } from '../../../lib/comecar/fala';

export function Splash({ go }) {
  return (
    <div className="scr" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <Grow />
      <Wordmark px={30} />
      <CadyViva size={150} />
      <h1 style={{ marginTop: 18 }}>Oi! Eu sou a Cady!</h1>
      <Lede>Cada frase que você fala vira mais um ponto. Quanto mais falar, mais se
        conectam os pontos! É com essa cadência que o inglês vira fluência.</Lede>
      <Grow />
      <Pager n={0} />
      <Cta onClick={() => go('idioma')}>Começar</Cta>
      <Ghost onClick={() => go('login')}>já tenho conta · entrar</Ghost>
    </div>
  );
}

/* Posições espalhadas, sorteadas uma vez por carga: se recalculassem a cada
   render as bandeiras pulariam de lugar ao tocar numa delas. */
function usePosicoes() {
  const ref = useRef(null);
  if (!ref.current) {
    let x = 20260909;
    const rnd = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    ref.current = LANGS.map((_, i) => {
      const base = (i / LANGS.length) * Math.PI * 2 - Math.PI / 2;
      return { a: base + (rnd() - 0.5) * 0.40, r: 98 + rnd() * 44, sz: 40 + Math.round(rnd() * 15) };
    });
  }
  return ref.current;
}

export function Idioma({ go, a, set }) {
  const pos = usePosicoes();
  const C = 170;
  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <div className="orbit">
        <div className="center"><CadyViva size={118} /></div>
        {LANGS.map(([flag, nome], i) => {
          const { a: ang, r, sz } = pos[i];
          return (
            <button key={nome} className={`lang ${a.idioma === nome ? 'on' : ''}`}
              title={nome} onClick={() => set('idioma', nome)}
              style={{
                left: `${(C + r * Math.cos(ang)).toFixed(1)}px`,
                top: `${(C + r * Math.sin(ang)).toFixed(1)}px`,
                '--ls': `${sz}px`, animationDelay: `${(i * 0.07).toFixed(2)}s`,
              }}>{flag}</button>
          );
        })}
      </div>
      {/* A quebra manual mantém o título em duas linhas, que é a proporção pela
          qual a tela foi desenhada (o anel de bandeiras fica logo acima). */}
      <h1 style={{ marginTop: 14 }}>Aprenda inglês<br />conversando comigo!</h1>
      <Lede>Comece testando em inglês, que daqui a pouco teremos todas as outras línguas!</Lede>
      <Grow />
      <Pager n={1} />
      <Cta onClick={() => go('proposta')}>continuar</Cta>
      <Ghost onClick={() => go('login')}>já tenho conta · entrar</Ghost>
    </div>
  );
}

export function Proposta({ go }) {
  return (
    <div className="scr" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <Grow />
      <Constelacao lit={5} nodes={[
        { x: 40, y: 120, l: 'dia 1' }, { x: 110, y: 78, l: 'dia 7' }, { x: 180, y: 105, l: 'dia 21' },
        { x: 250, y: 52, l: 'dia 40' }, { x: 308, y: 88, l: 'fluência', below: true },
      ]} />
      <h1>Conversa curta,<br />todo dia.</h1>
      <Lede>Sem aula, sem lição de casa. Você fala 5 minutos comigo e a sua cadência vira fluência.</Lede>
      <Grow />
      <Pager n={2} />
      <Cta onClick={() => go('social')}>continuar</Cta>
      <Ghost onClick={() => go('login')}>já tenho conta · entrar</Ghost>
    </div>
  );
}

/* ATENÇÃO: estes depoimentos são inventados. A tela tinha uma linha dizendo
   "dados ilustrativos · protótipo", que era o que os mantinha honestos, e ela
   foi retirada a pedido — então hoje eles aparecem como se fossem de clientes
   reais, num site que cobra, e com nota de 4-5 estrelas por cima. Isso é
   exposição sob o CDC (art. 37).

   Trocar por depoimentos de verdade é mudar só este array.

   CAMPOS: n nome · nota 1..5 · c cor do avatar · w tempo de uso · t a frase.

   REGRAS DE CONTEÚDO:
   • w vai de 1 a 8 SEMANAS. Nunca meses: a promessa da tela é destravar
     rápido, e um "6 meses de uso" aqui contaria a história contrária.
   • quanto menor o tempo, mais modesto o ganho — quem tem 1 semana não faz
     entrevista em inglês, faz uma frase sair sem traduzir antes.
   • t tem teto de ~88 caracteres: o cartão trava a frase em 3 linhas de ~30
     caracteres e o que passa disso é cortado com reticências.

   A ORDEM IMPORTA: os pares vão pra faixa de cima e os ímpares pra de baixo
   (índice % 2), então alternar tempos e cores aqui é o que mantém as duas
   faixas variadas. */
const DEPOIMENTOS = [
  { n: 'Marina L.',   nota: 5, c: '#3E9B5F', w: '8 semanas', t: 'Reunião em inglês era pânico. Hoje eu abro a câmera e falo.' },
  { n: 'Larissa M.',  nota: 5, c: '#2c7347', w: '1 semana',  t: 'Falei uma frase inteira sem traduzir antes. Só uma, mas saiu.' },
  { n: 'Rafael T.',   nota: 5, c: '#a5760a', w: '3 semanas', t: 'O formato de 5 minutos foi o único que eu consegui manter.' },
  { n: 'Gustavo N.',  nota: 4, c: '#D9527A', w: '1 semana',  t: 'Nunca tinha ouvido minha própria voz em inglês. Estranho e bom.' },
  { n: 'Camila V.',   nota: 5, c: '#5FBFB4', w: '8 semanas', t: 'Viajei e pedi tudo sozinha. Sem tradutor, sem gaguejar.' },
  { n: 'Fernanda C.', nota: 5, c: '#8E6DE8', w: '1 semana',  t: 'Comecei dizendo só oi. Cinco dias depois, contei meu fim de semana.' },
  { n: 'Juliana P.',  nota: 4, c: '#3E9B5F', w: '2 semanas', t: 'A correção na hora é o que faltava. Eu errava e ninguém dizia nada.' },
  { n: 'Otávio B.',   nota: 5, c: '#2c7347', w: '2 semanas', t: 'Pedi um café em inglês na padaria do hotel e a moça me entendeu.' },
  { n: 'Diego M.',    nota: 5, c: '#a5760a', w: '3 semanas', t: 'Parei de montar a frase na cabeça antes de falar. Agora ela sai.' },
  { n: 'Priscila D.', nota: 5, c: '#D9527A', w: '2 semanas', t: 'A Cady me corrigiu o mesmo verbo três vezes. Na quarta eu acertei.' },
  { n: 'Thiago A.',   nota: 5, c: '#5FBFB4', w: '8 semanas', t: 'A daily do time deixou de ser o pior momento do meu dia.' },
  { n: 'Henrique Z.', nota: 5, c: '#8E6DE8', w: '3 semanas', t: 'Voltei a estudar depois de doze anos parado. Sem caderno, sem prova.' },
  { n: 'Beatriz S.',  nota: 4, c: '#3E9B5F', w: '3 semanas', t: 'Eu entendia tudo e não respondia nada. Isso acabou.' },
  { n: 'Natália F.',  nota: 5, c: '#2c7347', w: '3 semanas', t: 'Assisti um episódio sem legenda e entendi o bastante pra rir.' },
  { n: 'Amanda R.',   nota: 5, c: '#a5760a', w: '2 semanas', t: 'Cinco minutos antes de dormir. Virou hábito sem eu perceber.' },
  { n: 'Débora K.',   nota: 5, c: '#D9527A', w: '3 semanas', t: 'Sou tímida em português. Falando com uma IA eu não fico com vergonha.' },
  { n: 'Lucas F.',    nota: 5, c: '#5FBFB4', w: '8 semanas', t: 'Tive entrevista em inglês semana passada. Não travei uma vez.' },
  { n: 'Vinícius R.', nota: 5, c: '#8E6DE8', w: '4 semanas', t: 'No jogo online eu só digitava. Agora eu entro na call e falo.' },
  { n: 'Pedro H.',    nota: 4, c: '#3E9B5F', w: '3 semanas', t: 'O sotaque continua. Travar, não — e era isso que me atrapalhava.' },
  { n: 'Carolina T.', nota: 5, c: '#2c7347', w: '4 semanas', t: 'Errar na frente de gente me travava. Na frente da Cady, não trava.' },
  { n: 'Mariana Q.',  nota: 5, c: '#a5760a', w: '5 semanas', t: 'Respondi o cliente em inglês na call sem pedir socorro pra ninguém.' },
  { n: 'Rodrigo V.',  nota: 4, c: '#D9527A', w: '4 semanas', t: 'Não começo mais a frase pedindo desculpa pelo meu inglês ruim.' },
  { n: 'Everton S.',  nota: 5, c: '#5FBFB4', w: '6 semanas', t: 'Minha sogra é americana. Este ano eu conversei com ela de verdade.' },
  { n: 'Igor L.',     nota: 5, c: '#8E6DE8', w: '5 semanas', t: 'O atendente do hotel puxou assunto e eu fui até o fim da conversa.' },
];

/* A conta do loop, e ela é uma conta só: PASSO = largura do cartão + margem.
   A trilha anda exatamente N × PASSO e volta pro começo — ver o comentário
   grande do .vztrilha no comecar.css, que explica por que não pode ser gap
   nem -50%. */
const PASSO = 255;      // 244 de cartão + 11 de margem
const CLONES = 2;       // 2 × 255 = 510px, cobre a viewport mais larga (430)
const VEL_A = 40;       // px por segundo, faixa de cima
const VEL_B = 34;       // a de baixo anda mais devagar de propósito

const FAIXA_A = DEPOIMENTOS.filter((_, i) => i % 2 === 0);
const FAIXA_B = DEPOIMENTOS.filter((_, i) => i % 2 === 1);

/* CSS não para uma animação por conta do usuário, mas o modo calmo precisa
   trocar a faixa de "andando" pra "arrastável" — e isso é decisão de JS.
   Lido dentro do efeito porque matchMedia não existe no servidor, e com
   listener de 'change' pra atender quem liga a preferência com a tela aberta. */
function useCalmo() {
  const [calmo, setCalmo] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ler = () => setCalmo(mq.matches);
    ler();
    mq.addEventListener('change', ler);
    return () => mq.removeEventListener('change', ler);
  }, []);
  return calmo;
}

function Cartao({ p, clone }) {
  return (
    <span className={`vzcard ${clone ? 'vzclone' : ''}`} style={{ '--k': p.c }}
      aria-hidden={clone ? 'true' : undefined}>
      <span className="vzwho">
        <span className="vzav"><b>{p.n[0]}</b></span>
        <span className="vzid">
          <b>{p.n}</b>
          <span className="vzmeta">
            <span className="lstars" aria-hidden="true">
              {'★'.repeat(p.nota)}<i>{'★'.repeat(5 - p.nota)}</i>
            </span>
            <small>{p.w} de uso</small>
          </span>
        </span>
      </span>
      <span className="vzq">&ldquo;{p.t}&rdquo;</span>
    </span>
  );
}

/* Uma faixa. A trilha leva a lista inteira MAIS os dois primeiros cartões
   clonados no fim: quando o transform chega em N × PASSO, o que está na tela
   são justamente esses clones, e o salto de volta pro zero mostra os mesmos
   dois cartões. A costura não existe.

   Clonar só dois (e não a lista toda, que é o marquee de manual) não é
   economia de código, é o que mantém a camada composta abaixo do limite de
   textura da GPU: 24 únicos por faixa dariam 12.240px, que a 3x são 36.720px
   device — acima dos 16.384 do chip, e aí o WebKit desiste de compor e passa
   a repintar na main thread a cada quadro. Com 12 + 2 são 3.570px (10.710
   device), e cabe. */
function Faixa({ lista, sentido, vel, atraso }) {
  const volta = lista.length * PASSO;
  const cartoes = [...lista, ...lista.slice(0, CLONES)];
  return (
    <div className="vzfaixa">
      <div className={`vztrilha ${sentido}`}
        style={{
          '--volta': `${volta}px`,
          '--dur': `${(volta / vel).toFixed(1)}s`,
          animationDelay: atraso,
        }}>
        {cartoes.map((p, k) => (
          <Cartao key={`${p.n}-${k}`} p={p} clone={k >= lista.length} />
        ))}
      </div>
    </div>
  );
}

/* Duas faixas em contracorrente.

   A versão anterior era uma fila só, que exigia arrastar pra descobrir que
   havia mais gente. Aqui as duas faixas andam sozinhas em sentidos opostos —
   é o movimento que conta "tem fila" sem pedir gesto nenhum — e o toque
   TRAVA as duas pra ler com calma.

   Por que travar em vez de diminuir a velocidade: a 40px/s um cartão cruza a
   tela em 6s, o que dá pra ler de passagem mas não dá pra reler. Quem quer
   reler para. */
export function Social({ go }) {
  const [travado, setTravado] = useState(false);
  const calmo = useCalmo();

  const alternar = () => setTravado(v => !v);

  return (
    <div className="scr">
      <div className="vzhead">
        <CadyViva size={52} />
        <div className="vzhd">
          <Kicker>quem já está falando</Kicker>
          <h2>Quem parou de travar</h2>
        </div>
      </div>

      {/* Dois .grow: o título fica colado no topo (ligado à trilha de pontos) e
          as faixas ficam centradas no espaço que sobra, em vez de o vazio todo
          se acumular acima do botão. Num Pro Max isso são ~230px de folga de
          cada lado — ar, não abandono. */}
      <Grow />

      {/* A zona inteira é o alvo de toque: mirar num cartão que está andando é
          pedir pra pessoa acertar um alvo em movimento. */}
      <div className="vzzone" data-travado={travado ? '1' : '0'}
        role="button" tabIndex={0} aria-pressed={travado}
        aria-label={travado ? 'soltar as faixas de depoimentos' : 'travar as faixas de depoimentos para ler'}
        onClick={alternar}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); }
        }}>
        <Faixa lista={FAIXA_A} sentido="dir" vel={VEL_A} atraso="0s" />
        {/* Atraso NEGATIVO: positivo deixaria a faixa parada esperando. */}
        <Faixa lista={FAIXA_B} sentido="esq" vel={VEL_B} atraso="-12s" />
      </div>

      <p className="vzhint">
        {calmo ? 'arraste as faixas pra ler'
          : travado ? 'travado · toque pra soltar'
            : 'toque pra travar e ler'}
      </p>

      <Grow />
      <Cta onClick={() => go('audio')}>continuar</Cta>
    </div>
  );
}

export function Audio({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 2</Kicker>
      <h1 style={{ marginTop: 8 }}>Posso falar em voz alta com você?</h1>
      <Lede>Eu aprendo mais rápido ouvindo você — mas você manda no volume.</Lede>
      <Opts value={a.audio} onPick={v => { set('audio', v); go('nivel'); }} list={[
        { v: 'sempre', t: 'Pode falar sempre', s: 'a conversa inteira em voz', ic: 'volHigh' },
        { v: 'exercicios', t: 'Só nos exercícios', s: 'o resto eu leio', ic: 'volLow' },
        { v: 'mudo', t: 'Prefiro no silêncio', s: 'só texto por enquanto', ic: 'volOff' },
      ]} />
      <Grow />
      <Kicker style={{ textAlign: 'center' }}>você muda isso quando quiser</Kicker>
    </div>
  );
}

export function Nivel({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 3</Kicker>
      <h1 style={{ marginTop: 8 }}>Onde você está hoje?</h1>
      <Opts value={a.nivel} onPick={v => { set('nivel', v); go('fala'); }} list={[
        { v: 'zero', t: 'Começando do zero', s: 'quase nenhuma palavra', ic: 'sprout' },
        { v: 'basico', t: 'Entendo, mas não falo', s: 'leio e escuto razoável', ic: 'eye' },
        { v: 'medio', t: 'Falo travando', s: 'me viro, mas penso demais', ic: 'chat' },
        { v: 'avancado', t: 'Falo bem', s: 'quero soltar e ganhar naturalidade', ic: 'wave' },
      ]} />
      <Grow />
    </div>
  );
}

/* Gravação simulada: o protótipo não escuta de verdade, e o site paralelo
   também não — o microfone real entra quando isso encostar na infra do Cadence.
   O que importa aqui é o gesto: tocar, ver a onda reagir, tocar de novo. */
/* O microfone tem dois modos. Com `reconhecer`, ele usa a Web Speech API e
   entrega o que a pessoa realmente falou; sem, é só a animação (a primeira
   lição é roteirizada de propósito — ver o comentário em LicaoFala).

   O fallback importa: Firefox não tem a API, e em qualquer navegador a pessoa
   pode negar o microfone. Nesses casos a tela continua andando e o feedback diz
   que não ouviu, em vez de inventar um resultado. */
export function Mic({ onDone, reconhecer = false, hintInicial = 'toque para falar', hintOuvindo, hintFim }) {
  const [fase, setFase] = useState('parado');
  const ondas = useRef(null);
  const fala = useSpeechRecognition({ lang: 'en-US' });
  const ouvido = useRef('');
  // O transcript chega em pedaços e some quando a sessão encerra; guardo o
  // último não-vazio pra não entregar string vazia a quem só lê no fim.
  if (reconhecer && fala.transcript) ouvido.current = fala.transcript;

  useEffect(() => {
    if (fase !== 'ouvindo' || !ondas.current) return;
    [...ondas.current.children].forEach(i => {
      i.style.animationDelay = `${Math.random() * 0.85}s`;
    });
  }, [fase]);

  useEffect(() => {
    if (fase !== 'fim') return undefined;
    const t = setTimeout(() => onDone(ouvido.current.trim()), 1300);
    return () => clearTimeout(t);
  }, [fase, onDone]);

  const hint = fase === 'parado' ? hintInicial
    : fase === 'ouvindo' ? hintOuvindo : hintFim;

  return (
    <>
      <div className={`wave ${fase === 'ouvindo' ? '' : 'off'}`} ref={ondas}>
        {Array.from({ length: 21 }, (_, i) => <i key={i} />)}
      </div>
      <button className={`mic ${fase === 'ouvindo' ? 'gravando' : ''}`} style={{ marginTop: 14 }}
        disabled={fase === 'fim'}
        onClick={() => {
          if (reconhecer && fala.supported) fala.toggle();
          setFase(fase === 'parado' ? 'ouvindo' : 'fim');
        }}>
        {fase === 'parado' && <Glyph name="mic" size={34} />}
        {fase === 'ouvindo' && <Glyph name="stop" size={26} />}
        {fase === 'fim' && <Glyph name="clock" size={28} />}
      </button>
      <p className="mic-hint">{hint}</p>
    </>
  );
}

export function Fala({ go, set }) {
  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <Kicker>Teste rápido</Kicker>
      <h2 style={{ marginTop: 10 }}>Repete comigo:</h2>
      <Card className="card-dark" style={{ background: 'var(--dark-soft)', marginTop: 18 }}>
        <p style={{ fontFamily: 'var(--f-display)', fontSize: 21, lineHeight: 1.35 }}>
          &ldquo;I&rsquo;d like a table for two, please.&rdquo;</p>
        <Lede style={{ marginTop: 8, fontSize: 13 }}>uma mesa para dois, por favor</Lede>
      </Card>
      <Grow />
      <Mic reconhecer onDone={texto => { set('fala', texto); go('feedback'); }}
        hintOuvindo="toque pra parar quando terminar"
        hintFim="analisando sua fala…" />
      <Grow />
    </div>
  );
}

const chipApagado = {
  fontSize: 11.5, padding: '6px 12px', background: 'transparent',
  borderColor: 'var(--dk-line)', color: 'var(--dk-soft)',
};

export function Feedback({ go, a }) {
  const r = compararFala(a.fala);

  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <Kicker>{r.ouviu ? 'Você disse' : 'A frase era'}</Kicker>
      <Card className="card-dark"
        style={{ background: 'var(--dark-soft)', marginTop: 12, textAlign: 'left' }}>
        <p style={{ fontFamily: 'var(--f-display)', fontSize: 19 }}>
          &ldquo;{r.ouviu ? r.disse : FRASE_TESTE}&rdquo;</p>
        {r.ouviu && (
          <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
            <span className={`chip ${r.completa ? 'sel' : ''}`}
              style={r.completa ? { fontSize: 11.5, padding: '6px 12px' } : chipApagado}>
              {r.acertou} de {r.alvo.length} palavras
            </span>
            {!r.completa && (
              <span className="chip" style={chipApagado}>
                faltou: {r.faltando.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        )}
      </Card>
      <CadyViva size={150} />
      {r.ouviu ? (
        <>
          <h2>{r.completa ? 'Olha só — saiu inteira.' : 'Boa — já dá pra trabalhar em cima disso.'}</h2>
          <Lede>Esse é o ponto de partida. Agora eu preciso saber pra onde você quer ir.</Lede>
        </>
      ) : (
        <>
          <h2>Não consegui te ouvir agora.</h2>
          <Lede>Pode ter sido o microfone ou o navegador — a gente faz esse teste na
            primeira conversa. Segue que o resto não depende disso.</Lede>
        </>
      )}
      <Grow />
      <Cta onClick={() => go('conquista1')}>continuar</Cta>
    </div>
  );
}

export function Conquista1({ go }) {
  return (
    <div className="scr" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <Grow />
      <Kicker>Primeiro ponto aceso</Kicker>
      <div className="medal" style={{ marginTop: 16 }}><Glyph name="spark" size={40} /></div>
      <h1 style={{ marginTop: 20 }}>1ª frase falada</h1>
      <Lede>Você não estudou uma regra. Você falou. É exatamente assim que a gente vai continuar.</Lede>
      <Constelacao lit={1} nodes={[
        { x: 60, y: 95, l: 'você está aqui' }, { x: 150, y: 70, l: '' },
        { x: 240, y: 100, l: '' }, { x: 300, y: 64, l: '' },
      ]} />
      <Grow />
      <Cta onClick={() => go('objetivo')}>bora montar meu plano</Cta>
    </div>
  );
}
