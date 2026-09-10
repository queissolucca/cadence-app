'use client';

import { useEffect, useState } from 'react';
import { Cady, CadyViva } from '../Cady';
import { Constelacao, Glyph, Icon } from '../ui';
import { Card, Cta, Field, Ghost, Grow, Kicker, Lede, NavCard, NavRow, Opts, Wordmark } from '../shell';
import { Mic } from './abertura';
import { agrupar, memorias } from '../../../lib/comecar/state';
import { addDias, fmt, metaDias } from '../../../lib/comecar/datas';
import {
  abrirCheckout, criarConta, entrarComGoogle, entrarComGoogleExistente, entrarComSenha,
  limparRetomada, mensagemDe, salvarRespostas, sessaoAtual, temRetomada,
} from '../../../lib/comecar/conta';
import { respostasCompletas } from '../../../lib/comecar/paraApi';

/* ---- primeira lição ----------------------------------------------------- */

export function LicaoBrief({ go }) {
  return (
    <div className="scr">
      <Kicker>Conversa 1 · restaurante</Kicker>
      <CadyViva size={150} />
      <h2 style={{ textAlign: 'center', marginTop: 6 }}>Você acabou de sentar numa mesa em Nova York.</h2>
      <Lede style={{ textAlign: 'center' }}>
        Eu sou o garçom. Responde do seu jeito — errar aqui não custa nada.</Lede>
      <Grow />
      <Cta onClick={() => go('licao-chat')}>começar a conversa</Cta>
    </div>
  );
}

export function LicaoChat({ go, a }) {
  return (
    <div className="scr">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Kicker>Conversa 1 · restaurante</Kicker>
        <span className="mono" style={{ fontSize: 11, color: 'var(--dk-soft)' }}>02:14</span>
      </div>
      <div className="chatline">
        <div className="bubble them">Hi! Welcome. Table for how many?
          <span className="tr">Oi! Bem-vindo. Mesa para quantos?</span></div>
        <div className="bubble you">Table for two, please.</div>
        <div className="bubble them">Perfect. Here&rsquo;s the menu. Anything to drink?
          <span className="tr">Perfeito. Aqui está o cardápio. Algo para beber?</span></div>
      </div>
      <Grow />
      <Card className="card-dark" style={{ background: 'var(--dark-soft)' }}>
        <Kicker>Sua vez</Kicker>
        <p style={{ fontSize: 14, marginTop: 6 }}>Peça uma água com gás.</p>
      </Card>
      <Cta onClick={() => go('licao-fala')}>responder falando</Cta>
    </div>
  );
}

export function LicaoFala({ go }) {
  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <Kicker>Sua vez</Kicker>
      <Card className="card-dark" style={{ background: 'var(--dark-soft)', marginTop: 12 }}>
        <p style={{ fontSize: 14, color: 'var(--dk-soft)' }}>Peça uma água com gás.</p>
        <p style={{ fontFamily: 'var(--f-display)', fontSize: 19, marginTop: 8 }}>
          &ldquo;Sparkling water, please.&rdquo;</p>
      </Card>
      <Grow />
      <Mic onDone={() => go('licao-fim')} hintOuvindo="estou te ouvindo…"
        hintFim="boa! fechando a conversa…" />
      <Grow />
    </div>
  );
}

export function LicaoFim({ go }) {
  return (
    <div className="scr" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <Grow />
      <Kicker>Conversa completa</Kicker>
      <div className="medal" style={{ marginTop: 16 }}><Glyph name="spark" size={40} /></div>
      <h1 style={{ marginTop: 20 }}>Mais 4 pontos acesos.</h1>
      <Lede>Você pediu mesa, bebida e comida em inglês. Isso é uma conversa inteira.</Lede>
      <Constelacao lit={5} nodes={[
        { x: 45, y: 118, l: '' }, { x: 105, y: 80, l: '' }, { x: 165, y: 106, l: '' },
        { x: 228, y: 62, l: '' }, { x: 295, y: 96, l: 'agora', below: true },
      ]} />
      <Grow />
      <Cta onClick={() => go('plano')}>ver meu plano</Cta>
    </div>
  );
}

/* ---- plano -------------------------------------------------------------- */

export function Plano({ go, a }) {
  const dias = metaDias(a.min);
  return (
    <div className="scr">
      <Kicker>Seu plano está pronto</Kicker>
      <h1 style={{ marginTop: 8 }}>{a.min || 5} minutos por dia,<br />a partir de amanhã.</h1>
      <Card style={{ marginTop: 18 }}>
        <div className="ritual">
          <div className="rit"><span className="knot" /><span><b>Aquecer</b>
            <small>solta a língua com frases curtas</small></span><span className="dur">1 min</span></div>
          <div className="rit"><span className="knot" /><span><b>Conversar</b>
            <small>{a.temas.slice(0, 2).join(' · ') || 'temas do seu dia'}</small></span>
            <span className="dur">{Math.max(3, (a.min || 5) - 2)} min</span></div>
          <div className="rit"><span className="knot" /><span><b>Revisar</b>
            <small>o que travou volta pra você</small></span><span className="dur">1 min</span></div>
        </div>
      </Card>
      <Card className="card-green"
        style={{ marginTop: 12, display: 'flex', gap: 13, alignItems: 'center' }}>
        <Glyph name="target" size={24} />
        <span><b style={{ fontSize: 14 }}>Meta: {fmt(addDias(dias))}</b>
          <small style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
            {dias} dias de cadência</small></span>
      </Card>
      <Grow />
      <Cta onClick={() => go('compromisso')}>fechado, é isso</Cta>
    </div>
  );
}

/* Tocar nela é o gesto que fecha o trato — por isso a Cady aqui é a viva, e o
   clique fica no invólucro em vez de num botão separado. */
export function Compromisso({ go, a }) {
  const [feito, setFeito] = useState(false);
  useEffect(() => {
    if (!feito) return undefined;
    const t = setTimeout(() => go('constelacao'), 800);
    return () => clearTimeout(t);
  }, [feito, go]);

  return (
    <div className="scr" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <Grow />
      <h1>Topa falar comigo {a.min || 5} minutos por dia?</h1>
      <Lede>Sem nota, sem cobrança. Só aparecer e conversar.</Lede>
      <div style={{
        margin: '26px 0', cursor: 'pointer',
        transform: feito ? 'scale(1.07)' : 'none', transition: 'transform .35s',
      }} onClick={() => setFeito(true)}>
        <CadyViva size={150} interactive={!feito} />
      </div>
      <Kicker>{feito ? 'trato feito.' : 'toque em mim pra fechar o trato'}</Kicker>
      <Grow />
    </div>
  );
}

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function ConstelacaoTela({ go }) {
  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <Kicker>Dia 1</Kicker>
      <h1 style={{ marginTop: 8 }}>Sua constelação começou.</h1>
      <Lede>Cada dia que você fala comigo, um ponto novo acende e se liga aos anteriores.</Lede>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 9, marginTop: 26 }}>
        {DIAS.map((d, i) => (
          <div className="wkday" key={i}>
            <span className={`sph wk ${i === 0 ? '' : 'off'}`} />
            <span className="mono wklbl">{d}</span>
          </div>
        ))}
      </div>
      <Grow />
      <Cta onClick={() => go('tonalidade')}>continuar</Cta>
    </div>
  );
}

const TONS = [
  { v: 'agressivo', t: 'Agressivo', badge: 'recomendado',
    s: 'correção direta, sem passar pano — você aprende apanhando', ic: 'flame' },
  { v: 'normal', t: 'Normal', s: 'conversa tranquila, com um professor mais paciente', ic: 'leaf' },
];

export function Tonalidade({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Último passo</Kicker>
      <h1 style={{ marginTop: 8 }}>Como você quer que eu te corrija?</h1>
      <Lede>Isso muda o meu jeito de falar com você — não muda o conteúdo do plano.</Lede>
      <Opts value={a.tom} list={TONS} onPick={v => { set('tom', v); go('conta'); }} />
      <Card className="card-green"
        style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Glyph name="bulb" size={20} />
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--dk-soft)' }}>
          Quem escolhe <b style={{ color: '#f2f2ea' }}>agressivo</b> destrava mais rápido — apanhar
          na correção gruda mais do que ser poupado. Mas você troca quando quiser, no seu perfil.
        </p>
      </Card>
      <Grow />
      <Kicker style={{ textAlign: 'center' }}>ajustável a qualquer momento em Você › Tonalidade</Kicker>
    </div>
  );
}

/* Fecha o onboarding. O plano vem antes de criar conta porque no app de verdade
   o acesso é liberado pelo e-mail do pagamento. */
export function Paywall({ a }) {
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState('');

  // A conta já existe quando se chega aqui (a tela de conta vem antes), então
  // este botão pode ir direto pro AbacatePay — sem nenhuma tela no meio.
  const pagar = async () => {
    setIndo(true);
    setErro('');
    try {
      await abrirCheckout();   // não retorna: sai da página
    } catch (e) {
      setErro(mensagemDe(e));
      setIndo(false);
    }
  };

  return (
    <div className="scr">
      <Kicker>Último passo</Kicker>
      <h1 style={{ marginTop: 8 }}>Seu plano está pronto.</h1>
      <Lede>Montei ele todo em cima das suas respostas. Pra ele começar a rodar, é aqui.</Lede>
      <div className="plancard">
        <span className="plantag">3 meses de acesso · lançamento</span>
        <div className="priceline">
          <span className="priceold">R$ 296,90</span>
          <span className="priceoff">-70%</span>
        </div>
        <div className="priceday">
          <span className="pricenew">R$ 89,90</span>
          {/* Calculado, não escrito à mão: se o preço ou a duração mudarem, este
              número muda junto em vez de virar mentira silenciosa. */}
          <span className="perday">R$ {(89.90 / 90).toFixed(2).replace('.', ',')} / dia</span>
        </div>
        <p className="priceunit">pagamento único · 3 primeiros meses de acesso</p>
        <ul className="planlist">
          <li><span className="memdot" />conversa de {a.min || 5} minutos por dia, todo dia</li>
          <li><span className="memdot" />correção direta, com o porquê de cada erro</li>
          <li><span className="memdot" />revisão espaçada: hoje · amanhã · 1 sem · 1 mês</li>
          <li><span className="memdot" />cenários ilimitados de escrita e fala</li>
        </ul>
        <p className="planfoot">O preço de lançamento vale pra quem entra agora. Depois dos 3 meses
          você decide se continua — não renova sozinho.</p>
      </div>
      <Grow />
      <Cta disabled={indo} onClick={pagar}>
        {indo ? 'abrindo o pagamento…' : 'garantir meu acesso'}
      </Cta>
      {erro && <Erro>{erro}</Erro>}
      <Kicker style={{ textAlign: 'center', marginTop: 10 }}>pague via pix · acesso liberado na hora</Kicker>
    </div>
  );
}

const GLogo = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
  </svg>
);

const GoogleBtn = ({ label, onClick }) => (
  <>
    <button type="button" className="gbtn" onClick={onClick}><GLogo />{label}</button>
    <div className="orsep"><span /><i>ou</i><span /></div>
  </>
);

const Erro = ({ children }) => (
  <p style={{
    margin: '10px 0 0', fontSize: 13, color: 'var(--red)', textAlign: 'center',
  }}>{children}</p>
);

/* Fecho do onboarding: a conta nasce aqui, e só depois vem o pagamento.

   A ordem importa. O /api/checkout exige sessão — é ela que amarra o pagamento
   ao usuário. Um checkout aberto antes da conta volta anônimo e o acesso não
   chega em ninguém: foi exatamente esse o bug que abriu este projeto. Por isso
   esta tela grava as respostas das 33 telas e passa a bola pro paywall, em vez
   de mandar direto pro AbacatePay. */
export function Conta({ go, a }) {
  const [fase, setFase] = useState('form'); // form | enviando | confirme | logado
  const [f, setF] = useState({ nome: '', sobrenome: '', email: '', senha: '', senha2: '', convite: '' });
  const [aceito, setAceito] = useState(false);
  const [vendo, setVendo] = useState(false);
  const [erro, setErro] = useState('');
  const campo = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const seguir = async (estado) => {
    setFase('enviando');
    setErro('');
    try {
      await salvarRespostas(estado);
      go('paywall');
    } catch (e) {
      limparRetomada();
      setErro(mensagemDe(e));
      setFase(e?.etapa === 'sessao' ? 'form' : 'logado');
    }
  };

  // Retomada do Google (saiu do site e voltou) e sessão já aberta: nos dois a
  // conta existe, o que falta é gravar as respostas.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const usuario = await sessaoAtual();
      if (!vivo) return;
      if (usuario && temRetomada()) { seguir(a); return; }
      if (usuario) setFase('logado');
      else limparRetomada();
    })();
    return () => { vivo = false; };
    // roda uma vez: é sobre o estado da sessão na chegada, não sobre `a`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A confirmação tem que bater LETRA POR LETRA — sem trim, sem ignorar caixa.
  // Um espaço no fim é uma senha diferente na hora de entrar.
  const senhaCurta = f.senha.length > 0 && f.senha.length < 8;
  const naoBate = f.senha2.length > 0 && f.senha2 !== f.senha;
  const podeEnviar = f.nome.trim() && f.sobrenome.trim() && f.email.trim()
    && f.senha.length >= 8 && f.senha2 === f.senha && aceito && respostasCompletas(a);

  const porEmail = async (e) => {
    e.preventDefault();
    if (!podeEnviar) return;
    setFase('enviando');
    setErro('');
    try {
      const { session } = await criarConta(f);
      // Projeto com confirmação de e-mail ligada: sem sessão não dá pra gravar
      // nada. As respostas ficam no localStorage e a pessoa volta pelo link.
      if (!session) { setFase('confirme'); return; }
      await seguir(a);
    } catch (err) {
      setErro(err?.message || 'Não consegui criar a conta agora. Tenta de novo.');
      setFase('form');
    }
  };

  const porGoogle = async () => {
    setErro('');
    try { await entrarComGoogle(); } catch { setErro('Não consegui abrir o Google. Tenta de novo.'); }
  };

  if (fase === 'confirme') {
    return (
      <div className="scr" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <Grow />
        <Wordmark px={28} />
        <h1 style={{ marginTop: 22 }}>Confirma seu e-mail.</h1>
        <Lede>Mandei um link pra <b>{f.email}</b>. Clica nele e você volta exatamente aqui — suas
          respostas continuam guardadas.</Lede>
        <Grow />
      </div>
    );
  }

  const enviando = fase === 'enviando';

  return (
    <div className="scr" style={{ justifyContent: 'center' }}>
      <Grow />
      <Wordmark px={26} />
      <h1 style={{ textAlign: 'center', marginTop: 18 }}>Falta só guardar<br />o seu progresso.</h1>
      <Lede style={{ textAlign: 'center' }}>
        Sua constelação fica salva na conta — você troca de aparelho e ela continua de onde parou.</Lede>

      {fase === 'logado' ? (
        <>
          <Grow />
          <Cta disabled={enviando} onClick={() => seguir(a)}>
            {enviando ? 'um momento…' : 'continuar'}
          </Cta>
          {erro && <Erro>{erro}</Erro>}
        </>
      ) : (
        <>
          <form onSubmit={porEmail} style={{ marginTop: 22 }}>
            <GoogleBtn label="Criar conta com o Google" onClick={porGoogle} />

            <div className="fieldrow">
              <Field label="Nome" type="text" placeholder="seu nome" autoComplete="given-name"
                value={f.nome} onChange={campo('nome')} />
              <Field label="Sobrenome" type="text" placeholder="seu sobrenome" autoComplete="family-name"
                value={f.sobrenome} onChange={campo('sobrenome')} />
            </div>
            <Field label="E-mail" type="email" placeholder="voce@email.com" autoComplete="email"
              value={f.email} onChange={campo('email')} />

            <div className="field">
              <label>Senha</label>
              <div className="fieldeye">
                <input type={vendo ? 'text' : 'password'} placeholder="mínimo 8 caracteres"
                  autoComplete="new-password" value={f.senha} onChange={campo('senha')} />
                <button type="button" onClick={() => setVendo(v => !v)}
                  aria-label={vendo ? 'Esconder senha' : 'Mostrar senha'}>
                  <Icon name={vendo ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              {senhaCurta && <p className="fielderr">A senha precisa de pelo menos 8 caracteres.</p>}
            </div>

            <div className="field">
              <label>Confirmar senha</label>
              <input type={vendo ? 'text' : 'password'} placeholder="repita a senha"
                autoComplete="new-password" aria-invalid={naoBate ? 'true' : undefined}
                className={naoBate ? 'ruim' : ''} value={f.senha2} onChange={campo('senha2')} />
              {naoBate && <p className="fielderr">As senhas não são iguais.</p>}
            </div>

            <Field label="Código de convite (opcional)" type="text" placeholder="tem um código? cola aqui"
              autoComplete="off" value={f.convite} onChange={campo('convite')} />

            <label className="termos">
              <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)} />
              <span>Aceito os <a href="/termos" target="_blank" rel="noreferrer">termos de uso</a> e a{' '}
                <a href="/privacy" target="_blank" rel="noreferrer">política de privacidade</a>.</span>
            </label>

            <Cta disabled={enviando || !podeEnviar}>
              {enviando ? 'criando sua conta…' : 'criar conta'}
            </Cta>
          </form>
          {erro && <Erro>{erro}</Erro>}
          <Ghost onClick={() => go('login')}>já tenho conta · entrar</Ghost>
        </>
      )}
      <Grow />
    </div>
  );
}

/* Quem já tem conta não passa por aqui de novo: entra e vai pro /v2, e o
   middleware decide o passo certo (questionário, pagamento ou app). Reaproveitar
   as respostas destas 33 telas pra uma conta antiga sobrescreveria o que a
   pessoa já tinha respondido — e duplicaria a memória semeada. */
export function Login({ go }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await entrarComSenha({ email, senha });
      window.location.href = '/v2';
    } catch {
      setErro('E-mail ou senha não conferem.');
      setEnviando(false);
    }
  };

  const porGoogle = async () => {
    setErro('');
    try { await entrarComGoogleExistente(); } catch { setErro('Não consegui abrir o Google. Tenta de novo.'); }
  };

  return (
    <div className="scr" style={{ justifyContent: 'center' }}>
      <Grow />
      <Wordmark px={28} />
      <h1 style={{ textAlign: 'center', marginTop: 22 }}>Bom te ver de volta.</h1>
      <Lede style={{ textAlign: 'center' }}>Sua constelação está do jeito que você deixou.</Lede>
      <form onSubmit={entrar} style={{ marginTop: 24 }}>
        <GoogleBtn label="Continuar com Google" onClick={porGoogle} />
        <Field label="E-mail" type="email" placeholder="voce@email.com" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Senha" type="password" placeholder="••••••••" autoComplete="current-password"
          value={senha} onChange={e => setSenha(e.target.value)} />
        <Cta disabled={enviando}>{enviando ? 'entrando…' : 'entrar'}</Cta>
      </form>
      {erro && <Erro>{erro}</Erro>}
      <Ghost onClick={() => go('conta')}>ainda não tenho conta · criar</Ghost>
      <Grow />
    </div>
  );
}

/* ---- app ---------------------------------------------------------------- */

const REVISAR = [
  ['Sparkling water, please.', 'pedir bebida'],
  ['Could you repeat that?', 'ganhar tempo'],
  ['I’d like the chicken.', 'pedir prato'],
];

export function Home({ go, a }) {
  return (
    <div className="scr">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Bom dia</h2>
          <Lede style={{ marginTop: 2, fontSize: 13 }}>dia 1 de cadência</Lede>
        </div>
        <span className="chip sel"
          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Glyph name="spark" size={13} /> 1
        </span>
      </div>
      <Card className="card-dark" style={{ marginTop: 16 }}>
        <Kicker style={{ color: 'var(--dk-soft)' }}>Hoje</Kicker>
        <h2 style={{ marginTop: 5, fontSize: 19 }}>{a.temas[0] || 'Conversa livre'}</h2>
        <p style={{ fontSize: 13, color: '#b8baa8', marginTop: 3 }}>{a.min || 5} min · 3 etapas</p>
        <div className="track" style={{ background: 'rgba(255,255,255,.14)' }}>
          <div className="fill" style={{ width: '0%' }} />
        </div>
        <Cta className="green" style={{ marginTop: 15 }} onClick={() => go('licao-brief')}>começar</Cta>
      </Card>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20,
      }}>
        <h2 style={{ fontSize: 14 }}>Para revisar</h2>
        <Kicker>3 frases</Kicker>
      </div>
      {REVISAR.map(([f, c]) => (
        <Card key={f} style={{
          marginTop: 8, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 10, padding: '13px 15px',
        }}>
          <span style={{ minWidth: 0 }}>
            <b style={{ fontSize: 13.5, display: 'block' }}>{f}</b>
            <small style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{c}</small>
          </span>
          <span className="chip sel" style={{ fontSize: 10.5, padding: '5px 10px', flexShrink: 0 }}>
            amanhã
          </span>
        </Card>
      ))}
      <Grow />
    </div>
  );
}
