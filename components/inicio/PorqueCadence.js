'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const ONBOARDING = '/inicio/onboarding';
const LOGIN = '/login';

const TESTIMONIALS = [
  { av: 'R', p: 'Falo todo dia no busão. Em 3 semanas parei de travar nas reuniões em inglês.', n: 'Rafa', c: 'São Paulo' },
  { av: 'J', p: 'A parte de ela lembrar da minha vida é surreal. Parece papo com um amigo que corrige.', n: 'Ju', c: 'Rio de Janeiro' },
  { av: 'M', p: '10 minutinhos por dia e o XP me puxa de volta. Melhor que qualquer app que já testei.', n: 'Marcos', c: 'Recife' },
  { av: 'B', p: 'Sempre travava na hora de falar. Agora solto as frases sem pensar tanto.', n: 'Bia', c: 'Osasco' },
  { av: 'D', p: 'Uso no trajeto pro trabalho. A correção na hora fixou de vez o passado dos verbos.', n: 'Diego', c: 'São Bernardo do Campo' },
  { av: 'S', p: 'Minha filha faz junto comigo. Virou a nossa rotina da família à noite.', n: 'Sandra', c: 'Jundiaí' },
  { av: 'T', p: 'As missões da semana me viciaram. Nunca fui tão constante estudando qualquer coisa.', n: 'Thiago', c: 'Campinas' },
  { av: 'C', p: 'Consegui a promoção que dependia do inglês. As simulações de reunião ajudaram demais.', n: 'Carol', c: 'Aracaju' },
  { av: 'F', p: 'Melhor que professor particular pra mim: cabe no meu horário e no meu bolso.', n: 'Felipe', c: 'Niterói' },
  { av: 'A', p: 'A voz é natural mesmo, não parece robô. Dá vontade de continuar a conversa.', n: 'Amanda', c: 'Sorocaba' },
  { av: 'R', p: 'Eu tinha vergonha de falar. Com a Cady eu erro à vontade e aprendo rindo.', n: 'Renato', c: 'Caruaru' },
  { av: 'P', p: 'Os flashcards do que eu erro são certeiros. Reviso só o que preciso, sem enrolação.', n: 'Paula', c: 'São José dos Campos' },
  { av: 'G', p: 'Voltei a estudar depois de anos. O jeito leve de 10 min me segurou de vez.', n: 'Gustavo', c: 'Uberlândia' },
  { av: 'L', p: 'Viajei pros EUA e me virei sozinho. Tinha treinado esses diálogos aqui antes.', n: 'Letícia', c: 'Blumenau' },
];

function Cta({ small = 'Teste sem cadastro. Depois crie sua conta.' }) {
  return (
    <Link className="cta" href={ONBOARDING}>
      <b>Destravar meu inglês agora</b>
      {small && <small>{small}</small>}
    </Link>
  );
}

export default function PorqueCadence() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // rise-in
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    );
    root.querySelectorAll('.rise').forEach((el) => io.observe(el));

    // zoom on scroll: cada visual cresce quando está no centro da tela e encolhe
    // ao se afastar (efeito de zoom in / zoom out conforme rola a página).
    const visuals = Array.from(root.querySelectorAll('.visual'));
    let cleanupScroll = () => {};
    if (reduce) {
      visuals.forEach((v) => {
        v.style.transform = 'none';
        v.style.opacity = '1';
      });
    } else {
      const frame = () => {
        const vh = window.innerHeight;
        const center = vh / 2;
        for (const v of visuals) {
          const r = v.getBoundingClientRect();
          const vc = r.top + r.height / 2;
          const t = Math.min(Math.abs(vc - center) / (vh * 0.72), 1);
          const scale = 1 - t * 0.16;
          const op = 1 - t * 0.5;
          v.style.transform = `scale(${scale.toFixed(3)})`;
          v.style.opacity = op.toFixed(3);
        }
      };
      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            frame();
            ticking = false;
          });
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      frame();
      cleanupScroll = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }

    return () => {
      io.disconnect();
      cleanupScroll();
    };
  }, []);

  return (
    <div className="porque" ref={rootRef}>
      {/* top bar */}
      <header className="topbar">
        <span className="tb-logo">cadence</span>
        <div className="tb-actions">
          <Link href={LOGIN} className="tb-login">já tenho conta criada</Link>
          <Link href={ONBOARDING} className="tb-cta">criar conta nova</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="hero wrap">
        <div className="brand rise">cadence<span className="dot">.</span></div>
        <h1 className="rise">Se você já tentou outros apps de inglês. Por que o Cadence seria diferente?</h1>
        <p className="lead rise">Anos ou meses de app de inglês e você ainda trava numa conversa real. Por quê?</p>
        <div className="rise"><Cta /></div>
        <div className="scrollhint">role pra baixo
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </section>

      {/* INTRO STATEMENT */}
      <section className="intro wrap">
        <p className="rise">
          Você provavelmente já baixou um. Fez uma sequência de 15 ou até 30 dias, ganhou umas medalhas, aprendeu a clicar nas caixinhas certas… e continua travando na hora de <span className="hl">falar</span>.
          <span className="small">O problema não é você. É que a maioria dos apps te ensina a passar de fase, não a conversar. O Cadence foi feito ao contrário: você fala desde o primeiro minuto.</span>
        </p>
      </section>

      <div className="wrap">
        {/* 1 · Voz */}
        <section className="stage">
          <div className="txt rise">
            <span className="k"><span className="num">01</span> · Conversa de verdade</span>
            <h2>Conversa de verdade, falando.</h2>
            <p>Outros apps te fazem repetir frase pronta e tocar em palavrinhas na tela. No Cadence você fala com a Cady por voz, e ela responde na hora, como um professor real. Sem roteiro, sem travar esperando a próxima tela.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="orbwrap"><div className="orb"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg></div><span className="st">Cady falando…</span></div>
            <div className="bub c">Hi Lucca! How was your day today?</div>
            <div className="bub y">It was good! I went to the gym.</div>
            <div className="bub c">Nice! You&apos;ve got this. 💚</div>
          </div></div></div>
        </section>

        {/* 2 · Memória */}
        <section className="stage rev">
          <div className="txt rise">
            <span className="k"><span className="num">02</span> · Memória personalizada</span>
            <h2>Ela lembra de você.</h2>
            <p>A maioria dos apps trata todo mundo igual. A Cady lembra da sua cidade, do seu trabalho, do seu objetivo, do que você errou ontem, e usa isso pra puxar assunto e personalizar cada conversa. É a diferença entre um curso genérico e um professor que te conhece.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="tagrow">🧠 Lembra: São Paulo · dev · meta: trabalhar fora</div>
            <div className="bub c">So, still grinding on the app, Lucca? How&apos;s the job search for a role abroad going?</div>
            <div className="bub y">Yeah! I have an interview next week.</div>
            <div className="bub c">Amazing, let&apos;s practice some interview English then!</div>
          </div></div></div>
        </section>

        {/* 3 · Correção */}
        <section className="stage">
          <div className="txt rise">
            <span className="k"><span className="num">03</span> · Correção assertiva</span>
            <h2>Correção na hora, e com o porquê.</h2>
            <p>Nada de só &quot;certo&quot; ou &quot;errado&quot; no fim do exercício. A Cady te ajusta no momento em que você erra, mostra como um nativo diria e explica o motivo. É assim que a correção gruda, em vez de escorrer.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="bub y">Yesterday I <span className="strike">go</span> to a party.</div>
            <div className="bub c">Quick fix: <span className="fix">&quot;I went&quot;</span>, not &quot;I go&quot;, it already happened. Say it back: &quot;Yesterday I went to a party.&quot; 👌</div>
            <div className="bub y">Yesterday I went to a party!</div>
          </div></div></div>
        </section>

        {/* CTA interlude 1 */}
        <section className="interlude">
          <p className="rise">Cansado de passar de fase sem falar de verdade?</p>
          <div className="rise"><Cta /></div>
        </section>

        {/* 4 · Desconforto */}
        <section className="stage rev">
          <div className="txt rise">
            <span className="k"><span className="num">04</span> · Desconforto que ensina</span>
            <h2>Vai te tirar da zona de conforto (de propósito).</h2>
            <p>O Cadence não é o app fofo que te dá parabéns por clicar certo. Vão ter vários momentos em que você tenta, erra e se sente desconfortável, e é exatamente aí que o aprendizado acontece. Você erra, a Cady corrige, você aprende a falar do jeito certo, e da próxima vez sai natural. Desconforto é sinal de que você está evoluindo de verdade.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="bub y">I… uh… yesterday I, hmm…</div>
            <div className="bub c">Take your time. Try: &quot;I went out&quot;. 💪</div>
            <div className="bub y">Yesterday I went out with friends.</div>
            <div className="tagrow">✅ Desconforto vira domínio.</div>
          </div></div></div>
        </section>

        {/* 5 · Pra quem é intermediário */}
        <section className="stage">
          <div className="txt rise">
            <span className="k"><span className="num">05</span> · Feito pra você</span>
            <h2>Pra quem é intermediário e quer, enfim, destravar.</h2>
            <p>Pra ser 100% sincero: o Cadence não é pra quem está começando do absoluto zero, pelo menos nesta fase inicial. Ele foi desenhado pra quem já arranha o inglês, entende boa parte das coisas, mas ainda trava na hora de falar, e quer finalmente soltar a língua. Se é o seu caso, é exatamente pra você.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="levels">
              <div className="lv">Iniciante</div>
              <div className="lv on">Intermediário<span className="u">você está aqui</span></div>
              <div className="lv">Avançado</div>
            </div>
            <div className="tagrow" style={{ marginTop: 12 }}>🎯 Pra quem já entende, mas ainda trava na fala.</div>
          </div></div></div>
        </section>

        {/* 6 · Preço */}
        <section className="stage rev">
          <div className="txt rise">
            <span className="k"><span className="num">06</span> · Acessível de verdade</span>
            <h2>Um professor particular por menos de R$1 por dia.</h2>
            <p>Aula particular de inglês custa caro e depende da agenda do professor. O Cadence te dá alguém pra conversar a qualquer hora, quantas vezes quiser, por uma fração do preço. O professor que te conhece, no seu bolso, sempre disponível.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="fc">
              <span className="tag">Aula particular</span>
              <div className="price">
                <div className="old">R$ 80 por aula</div>
                <div className="big">menos de R$ 1<small> / dia</small></div>
                <div className="cap">Fale quando quiser, quantas vezes quiser.</div>
              </div>
            </div>
          </div></div></div>
        </section>

        {/* CTA interlude 2 */}
        <section className="interlude">
          <p className="rise">10 minutos por dia. É só começar.</p>
          <div className="rise"><Cta /></div>
        </section>

        {/* 7 · Trilha */}
        <section className="stage">
          <div className="txt rise">
            <span className="k"><span className="num">07</span> · Trilha gamificada</span>
            <h2>Uma trilha que evolui com você (e te traz de volta).</h2>
            <p>Lições curtas de 1 a 2 minutos que sobem de nível junto com você. Ganha XP, sobe de patente (do Aprendiz ao Nativo) e cumpre missões da semana. A gamificação aqui não é enfeite: é o que faz você voltar todo dia, que é o que realmente destrava o inglês.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="hud">
              <div className="top"><span className="rk">🗣️</span><b>Conversador</b><span className="xp">Nível 4 · 1.720 XP</span></div>
              <div className="bar"><i /></div>
              <div className="m">🔥 Missão: 3 lições esta semana · 2/3</div>
            </div>
            <div className="bub c" style={{ maxWidth: '100%' }}>B1 · 04 · Present perfect + advérbios ✓</div>
          </div></div></div>
        </section>

        {/* 8 · Revisão */}
        <section className="stage rev">
          <div className="txt rise">
            <span className="k"><span className="num">08</span> · Revisão inteligente</span>
            <h2>Revisão 100% personalizada pros seus erros.</h2>
            <p>Tudo que você erra ou pede pra guardar vira card automaticamente, com uma inteligência que mapeia os seus erros individuais pra você ter uma aprendizagem 100% personalizada.</p>
          </div>
          <div className="visual"><div className="crop"><div className="cbody">
            <div className="tagrow">🤖 IA mapeou este erro no seu dia 28/08</div>
            <div className="fc">
              <span className="tag">Correção</span>
              <div className="t">by vs until</div>
              <div className="e">&quot;Send it by Monday.&quot; é um prazo final.</div>
            </div>
            <div className="rate"><span className="a">De novo</span><span className="b">Bom</span><span className="c">Fácil</span></div>
          </div></div></div>
        </section>

        {/* DEPOIMENTOS */}
        <section className="fbsec">
          <span className="k rise" style={{ display: 'block', textAlign: 'center' }}>quem tá usando</span>
          <h2 className="fbtitle rise">Gente destravando o inglês</h2>
          <p className="fbnote rise">(depoimentos ilustrativos · arraste pro lado →)</p>
          <div className="tstrip">
            {TESTIMONIALS.map((t, i) => (
              <div className="tcard" key={i}>
                <div className="stars">★★★★★</div>
                <p>&quot;{t.p}&quot;</p>
                <div className="who">
                  <span className="av">{t.av}</span>
                  <div><b>{t.n}</b><br /><span>{t.c}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FECHO */}
        <section className="final rise">
          <h2>Outros apps te deixam bom em usar o app. O Cadence te deixa bom em <span className="g">falar inglês</span>.</h2>
          <Link className="fcta" href={ONBOARDING}>Destravar meu inglês agora</Link>
          <div className="fsub">Teste sem cadastro. Depois crie sua conta.</div>
        </section>
      </div>

      <div className="foot">cadence · você já entende inglês, hora de soltar a fala</div>

      <style jsx>{`
        .porque{
          --paper:#F6F9F4; --card:#FFFFFF; --ink:#14201A; --soft:#566057; --faint:#939D94;
          --line:#E7ECE3; --green:#2E9E5B; --green-d:#1C6B41; --green-soft:#E4F1E9;
          --dark:#122019; --amber:#E0A63C; --terra:#B0722C;
          --shadow:0 2px 8px rgba(20,28,22,.05), 0 24px 60px rgba(20,28,22,.10);
          background:var(--paper); color:var(--ink); min-height:100vh;
          font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
          -webkit-font-smoothing:antialiased; overflow-x:hidden;
        }
        .wrap{max-width:1000px;margin:0 auto;padding:0 22px}
        .k{font-size:12.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--green-d)}
        .num{font-family:ui-monospace,monospace}

        /* top bar */
        .topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px clamp(14px,3vw,26px);background:rgba(246,249,244,.82);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);border-bottom:1px solid var(--line)}
        .tb-logo{font-weight:900;font-size:19px;letter-spacing:-.03em;color:var(--ink)}
        .tb-actions{display:flex;align-items:center;gap:12px}
        .tb-login{font-size:14px;font-weight:700;color:var(--ink);text-decoration:none;white-space:nowrap}
        .tb-login:hover{color:var(--green-d)}
        .tb-cta{background:var(--green-d);color:#fff;font-weight:800;font-size:14px;padding:11px 20px;border-radius:12px;text-decoration:none;white-space:nowrap;box-shadow:0 8px 18px rgba(28,107,65,.22)}
        .tb-cta:hover{filter:brightness(1.06)}
        @media (max-width:520px){ .tb-login{display:none} .tb-logo{font-size:17px} }

        /* CTA button */
        .cta{display:inline-flex;flex-direction:column;align-items:center;gap:5px;text-decoration:none}
        .cta b{background:var(--green);color:#fff;font-weight:800;font-size:16px;padding:15px 30px;border-radius:16px;box-shadow:0 12px 26px rgba(46,158,91,.28);transition:transform .15s ease, box-shadow .15s ease}
        .cta:hover b{transform:translateY(-2px);box-shadow:0 16px 32px rgba(46,158,91,.34)}
        .cta small{font-size:12px;color:var(--faint);font-weight:600}

        /* hero */
        .hero{min-height:88vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:20px;padding:48px 0 44px}
        .brand{font-weight:900;font-size:clamp(58px,15vw,150px);letter-spacing:-.055em;line-height:.86;color:var(--ink)}
        .brand .dot{color:var(--green)}
        .hero h1{font-size:clamp(24px,4.4vw,40px);font-weight:800;letter-spacing:-.02em;line-height:1.14;margin:8px 0 0;max-width:20ch}
        .hero .lead{font-size:clamp(15px,2.3vw,19px);color:var(--soft);max-width:44ch;margin:0;line-height:1.5;font-weight:500}
        .scrollhint{margin-top:12px;color:var(--faint);font-size:12px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:6px;animation:pqBob 1.8s infinite}
        @keyframes pqBob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}

        /* intro statement — mais horizontal (menos coluna estreita) */
        .intro{padding:11vh 0 4vh;text-align:center}
        .intro p{font-size:clamp(19px,2.8vw,29px);font-weight:800;letter-spacing:-.015em;line-height:1.34;margin:0 auto;max-width:760px;color:var(--ink)}
        .intro .hl{color:var(--green-d)}
        .intro .small{display:block;margin-top:22px;font-size:clamp(15px,2vw,17.5px);font-weight:500;color:var(--soft);max-width:660px;margin-left:auto;margin-right:auto;line-height:1.6}

        /* feature stage */
        .stage{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:11vh 0}
        .stage.rev .txt{order:2}
        @media (max-width:840px){ .stage{grid-template-columns:1fr;gap:26px;padding:8vh 0} .stage.rev .txt{order:0} }
        .txt h2{font-size:clamp(26px,4vw,42px);font-weight:900;letter-spacing:-.025em;line-height:1.06;margin:12px 0 0}
        .txt p{font-size:clamp(15px,2vw,18px);color:var(--soft);line-height:1.6;margin:16px 0 0;max-width:44ch}

        /* rise-in */
        .rise{opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)}
        .rise.in{opacity:1;transform:none}
        @media (prefers-reduced-motion:reduce){ .rise{opacity:1;transform:none;transition:none} }

        /* visual (zoom on scroll) */
        .visual{transform-origin:center center;will-change:transform,opacity}
        .crop{background:var(--card);border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);padding:16px;position:relative}
        .crop::before{content:"";position:absolute;top:10px;left:18px;width:36px;height:5px;border-radius:3px;background:var(--line)}
        .cbody{margin-top:16px;display:flex;flex-direction:column;gap:9px}
        .bub{max-width:88%;font-size:13.5px;line-height:1.45;padding:9px 13px;border-radius:15px}
        .bub.c{align-self:flex-start;background:var(--card);border:1px solid var(--line);border-bottom-left-radius:5px}
        .bub.y{align-self:flex-end;background:var(--green-soft);border-bottom-right-radius:5px}
        .strike{text-decoration:line-through;color:var(--terra);opacity:.85}
        .fix{color:var(--green-d);font-weight:700}
        .orbwrap{display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 0 6px}
        .orb{width:92px;height:92px;border-radius:50%;background:var(--green);display:grid;place-items:center;box-shadow:0 0 0 12px var(--green-soft);animation:pqPulse 1.6s infinite ease-in-out}
        @keyframes pqPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .orbwrap .st{font-size:13px;font-weight:700}
        .tagrow{display:flex;align-items:center;gap:9px;background:var(--green-soft);border-radius:11px;padding:9px 12px;font-size:12.5px;color:var(--green-d);font-weight:700}
        .hud{background:var(--dark);color:#fff;border-radius:18px;padding:16px}
        .hud .top{display:flex;align-items:center;gap:10px}
        .hud .rk{font-size:26px}.hud b{font-size:14.5px}.hud .xp{margin-left:auto;font-size:11.5px;opacity:.78;font-family:ui-monospace,monospace}
        .hud .bar{height:7px;border-radius:99px;background:rgba(255,255,255,.16);margin-top:10px;overflow:hidden}
        .hud .bar i{display:block;height:100%;width:62%;background:var(--green)}
        .hud .m{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:11px;opacity:.9}
        .fc{border:1px solid var(--line);border-radius:16px;padding:22px 16px;text-align:center}
        .fc .tag{font-size:10px;font-weight:800;color:var(--terra);border:1px solid var(--terra);border-radius:999px;padding:2px 9px;letter-spacing:.04em}
        .fc .t{font-size:23px;font-weight:800;margin:11px 0 4px}
        .fc .e{font-size:12.5px;color:var(--soft)}
        .rate{display:flex;gap:6px;margin-top:12px}
        .rate span{flex:1;text-align:center;font-size:11.5px;font-weight:800;padding:9px 4px;border-radius:10px}
        .rate .a{border:1.5px solid var(--terra);color:var(--terra)}.rate .b{border:1.5px solid var(--green);color:var(--green-d)}.rate .c{background:var(--green);color:#fff}
        .levels{display:flex;gap:8px}
        .lv{flex:1;text-align:center;border-radius:12px;padding:14px 6px;font-size:12.5px;font-weight:800;border:1.5px solid var(--line);color:var(--faint)}
        .lv.on{border-color:var(--green);background:var(--green-soft);color:var(--green-d)}
        .lv .u{display:block;font-size:10px;font-weight:800;letter-spacing:.06em;margin-top:5px;color:var(--green)}
        .price{text-align:center;padding:6px 0}
        .price .old{font-size:14px;color:var(--faint);text-decoration:line-through}
        .price .big{font-size:34px;font-weight:900;letter-spacing:-.03em;margin:4px 0 0}
        .price .big small{font-size:15px;font-weight:700;color:var(--soft)}
        .price .cap{font-size:12.5px;color:var(--soft);margin-top:8px}

        /* interlude cta */
        .interlude{text-align:center;padding:6vh 0 2vh}
        .interlude p{font-size:clamp(19px,3vw,28px);font-weight:800;letter-spacing:-.02em;margin:0 0 20px;line-height:1.25}

        /* depoimentos */
        .fbsec{padding:10vh 0 4vh;text-align:center}
        .fbtitle{font-size:clamp(24px,4vw,36px);font-weight:900;letter-spacing:-.02em;margin:8px 0 4px}
        .fbnote{font-size:12px;color:var(--faint);margin:0}
        .tstrip{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:28px 4px 16px;margin-top:6px;text-align:left;scrollbar-width:thin;scrollbar-color:var(--line) transparent;-webkit-overflow-scrolling:touch}
        .tstrip::-webkit-scrollbar{height:8px}
        .tstrip::-webkit-scrollbar-track{background:transparent}
        .tstrip::-webkit-scrollbar-thumb{background:var(--line);border-radius:99px}
        .tcard{flex:0 0 84%;max-width:300px;scroll-snap-align:start;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:var(--shadow);display:flex;flex-direction:column}
        @media (min-width:560px){ .tcard{flex-basis:300px} }
        .stars{color:var(--amber);font-size:14px;letter-spacing:2px}
        .tcard p{font-size:14.5px;line-height:1.5;margin:10px 0 14px;flex:1;color:var(--ink)}
        .who{display:flex;align-items:center;gap:10px}
        .who .av{width:36px;height:36px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px}
        .who b{font-size:13.5px;font-weight:800}.who span{font-size:11.5px;color:var(--faint)}

        /* final */
        .final{background:var(--dark);color:#fff;border-radius:30px;padding:clamp(36px,7vw,72px);text-align:center;margin:6vh 0 10vh}
        .final h2{font-size:clamp(26px,5vw,46px);font-weight:900;letter-spacing:-.025em;margin:0 auto;line-height:1.12;max-width:18ch}
        .final h2 .g{color:#7FD6A2}
        .final .fcta{display:inline-block;background:var(--green);color:#fff;text-decoration:none;font-weight:800;font-size:17px;padding:16px 36px;border-radius:16px;margin-top:26px}
        .final .fsub{color:rgba(255,255,255,.7);font-size:13px;margin-top:14px}
        .foot{text-align:center;color:var(--faint);font-size:12px;padding:0 0 44px}
      `}</style>
    </div>
  );
}
