import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'cadence — você entende inglês. hora de destravar a fala',
  description: 'cadence é pra quem já entende inglês e quer soltar a fala: converse por voz com a Cadi, sua coach de IA, e treine numa trilha de lições de 1–2 minutos, do B1 ao C1, com correção na hora.',
};

export default function CadenceLandingPage() {
  return (
    <div className={styles.page}>
      <header>
        <nav>
          <div className={styles.logo}><span className={styles.dot}></span>cadence</div>
          <div className={styles.navlinks}>
            <a href="#problema">o problema</a>
            <a href="#metodo">o método</a>
            <a href="#faq">perguntas</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.navLogin}>já tenho conta criada</Link>
            <Link href="/inicio/onboarding" className={styles.navcta}>criar conta nova</Link>
          </div>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <span className={styles.eyebrow}>você já entende inglês. hora de soltar a fala</span>
            <h1>você entende quase tudo em inglês. <em>então por que ainda trava</em> na hora de falar?</h1>
            <p className={styles.leadHero}>cadence é pra quem já passou do básico e quer treinar o que realmente falta: <strong>conversar</strong>. você fala por voz com a Cadi, sua coach de IA — em conversas livres ou numa trilha de lições de 1 a 2 minutos, do B1 ao C1 — e ela entende, responde e corrige na hora. sem lição escrita, sem gramática do zero.</p>
            <div className={styles.ctaRow}>
              <Link href="/inicio/onboarding" className={styles.btnPrimary}>quero destravar meu inglês agora</Link>
              <a href="#metodo" className={styles.btnGhost}>ver como funciona</a>
            </div>
            <p className={styles.microcopy}>acesso antecipado · lições de 1–2 min · treino por voz</p>
          </div>
          <div className={styles.heroVisual}>
            <div className={`${styles.phone} ${styles.phoneDark}`}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>conversar · ao vivo</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '11px', color: '#9FB6A9', margin: '6px 0 14px' }}>CADI · THE ENGLISH TEACHER</p>
                <div className={styles.mic}>
                  <div className={styles.micBars}>
                    <span style={{ height: '10px' }}></span><span style={{ height: '18px' }}></span><span style={{ height: '8px' }}></span><span style={{ height: '14px' }}></span>
                  </div>
                </div>
                <p className={styles.captionDark}>toque pra falar com a Cadi</p>
                <div className={styles.quoteYou} style={{ marginTop: '12px' }}><span>🔥 4 dias seguidos</span>continue a cadência</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.problem} id="problema">
        <div className={styles.wrap}>
          <span className={styles.eyebrow}>// o problema real</span>
          <h2>você não é iniciante. então por que ainda trava pra falar?</h2>
          <p className={styles.leadProblem}>anos de inglês, série sem legenda, e-mail lido sem esforço — mas na hora de entrar numa call ou puxar uma conversa em inglês, o cérebro trava. isso não é falta de nível. é falta de treino de fala no que realmente importa.</p>
          <div className={styles.cards}>
            <div className={styles.card}>
              <h3>o platô do intermediário</h3>
              <p>você passou dos exercícios básicos há anos, mas na hora de falar continua com os mesmos deslizes: preposição errada, tempo verbal torto, e aquela pausa antes de abrir a boca porque não sabe se soa natural.</p>
            </div>
            <div className={styles.card}>
              <h3>tempo, você não tem</h3>
              <p>entre trabalho e o resto da vida, sobra pouco. curso inteiro, aula de 40 minutos — não cabe. o que cabe são 1 ou 2 minutos entre uma reunião e outra. o cadence é feito nesse tamanho.</p>
            </div>
            <div className={styles.card}>
              <h3>os apps tratam você como principiante</h3>
              <p>&quot;the cat is on the table&quot; não é o seu problema. você já lê, já assiste, já entende. o que falta é <strong>conversar de verdade</strong> — falando, com correção que explica o porquê, na hora.</p>
            </div>
          </div>
          <p className={styles.closer}>resultado: você entende quase tudo — mas trava numa call ou fica calado num jantar em inglês. familiar?</p>
        </div>
      </section>

      <section className={styles.solution} id="metodo">
        <div className={styles.wrap}>
          <div className={styles.solutionHead}>
            <span className={styles.eyebrow}>// como o cadence funciona</span>
            <h2>um jeito só: conversar. todo dia, um pouco.</h2>
            <p className={styles.leadSolution}>nada de lição escrita. você <strong>fala</strong> — com a Cadi, sua coach de IA — em conversas livres sobre o que quiser, ou seguindo uma trilha de lições de 1 a 2 minutos. ela entende, responde e corrige na hora, sem quebrar o papo.</p>
          </div>
          <div className={styles.chipRow}>
            <span className={styles.chip}>conversa de verdade, por voz</span>
            <span className={styles.chip}>correção na hora, com o porquê</span>
            <span className={styles.chip}>trilha do B1 ao C1 · 1–2 min por lição</span>
          </div>

          <div className={styles.phonesGrid}>
            <div className={styles.phone}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>01 · trilha · escolha o nível</span>
              <div className={styles.phoneBody}>
                <div className={styles.phoneTitle} style={{ fontSize: '16px' }}>B1 · Independent</div>
                <p style={{ fontSize: '11px', color: 'var(--stone)', margin: '2px 0 8px' }}>3/30 lições · continue de onde parou</p>
                <div className={styles.phoneCard}>
                  <span className={styles.phonePill}>present perfect</span><br />
                  Ever been there?
                </div>
              </div>
            </div>

            <div className={styles.phone}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>02 · lição · 1–2 min</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '11px', color: 'var(--stone)', marginBottom: '6px' }}>PRESENT PERFECT VS PAST SIMPLE</p>
                <div className={styles.phoneTitle} style={{ fontSize: '16px' }}>Ever been there?</div>
                <div className={styles.phoneCard} style={{ marginTop: '10px' }}>
                  a Cadi dá um exemplo, você fala, ela corrige — e em ~1 min tá feito.
                </div>
                <div className={styles.phoneBtn}>começar a falar</div>
              </div>
            </div>

            <div className={`${styles.phone} ${styles.phoneDark}`}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>03 · fala · ao vivo</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '11px', color: '#9FB6A9', marginTop: '6px' }}>A CADI ESTÁ OUVINDO</p>
                <div className={styles.transcript}>fale à vontade —<br />ela entende do jeito que der.</div>
                <div className={styles.mic}>
                  <div className={styles.micBars}>
                    <span style={{ height: '10px' }}></span><span style={{ height: '18px' }}></span><span style={{ height: '8px' }}></span><span style={{ height: '14px' }}></span>
                  </div>
                </div>
                <p className={styles.captionDark}>toque para parar</p>
              </div>
            </div>

            <div className={`${styles.phone} ${styles.phoneDark}`}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>04 · correção · na hora</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '11px', color: '#e2a583', marginTop: '6px' }}>certo, mas dá pra soar mais natural</p>
                <div className={styles.quoteYou}><span>você falou</span>&quot;I have 25 years.&quot;</div>
                <div className={styles.quoteYou}><span>a Cadi ajusta</span>&quot;I&rsquo;m 25 — em inglês idade usa &lsquo;be&rsquo;, não &lsquo;have&rsquo;.&quot;</div>
              </div>
            </div>

            <div className={styles.phone}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>05 · progresso · cadência</span>
              <div className={styles.phoneBody}>
                <div className={styles.phoneTitle} style={{ fontSize: '16px' }}>sua cadência</div>
                <div style={{ display: 'flex', gap: '8px', margin: '10px 0' }}>
                  <div className={styles.phoneCard} style={{ flex: 1, textAlign: 'center', padding: '10px' }}>
                    <b style={{ fontSize: '18px' }}>🔥 12</b><br /><span style={{ fontSize: '11px' }}>dias seguidos</span>
                  </div>
                  <div className={styles.phoneCard} style={{ flex: 1, textAlign: 'center', padding: '10px' }}>
                    <b style={{ fontSize: '18px' }}>18</b><br /><span style={{ fontSize: '11px' }}>lições feitas</span>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--stone)' }}>um pouco todo dia é o que vira reflexo.</p>
              </div>
            </div>
          </div>

          <div className={styles.featGrid}>
            <div className={styles.feat}>
              <span className={styles.num}>conversa</span>
              <h4>fale à vontade, do seu jeito</h4>
              <p>papo livre com a Cadi sobre o que quiser, ou siga a trilha. ela entende mesmo se você travar no meio — e puxa a conversa pra você continuar falando.</p>
            </div>
            <div className={styles.feat}>
              <span className={styles.num}>correção</span>
              <h4>na hora, com o porquê</h4>
              <p>cada deslize que importa vem com o porquê em uma linha, dentro da conversa. nada de &quot;errado, tente de novo&quot; — é do jeito que um professor nativo faria.</p>
            </div>
            <div className={styles.feat}>
              <span className={styles.num}>cadência</span>
              <h4>1–2 min por dia viram fluência</h4>
              <p>lições curtas de propósito, do B1 ao C1, com uma sequência que te puxa a voltar. um pouco todo dia é o que faz o inglês virar reflexo — não mais um curso que você abandona.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.faq} id="faq">
        <div className={styles.wrap}>
          <span className={styles.eyebrow}>// perguntas</span>
          <h2>perguntas antes de começar</h2>
          <div className={styles.faqList}>
            <details>
              <summary>preciso ser avançado pra usar o cadence?</summary>
              <p>não. o cadence é pra quem já tem inglês intermediário (B1 pra cima). se você entende conversas no geral, lê sem traduzir tudo mentalmente e pega trechos de músicas em inglês, é exatamente pra você.</p>
            </details>
            <details>
              <summary>quanto tempo eu preciso dedicar por dia?</summary>
              <p>o mínimo é 1 a 2 minutos — o tempo de uma lição da trilha. se quiser, puxa uma conversa livre mais longa com a Cadi. as lições são curtas de propósito, pra caber entre uma reunião e outra, sem hora marcada.</p>
            </details>
            <details>
              <summary>o cadence ensina gramática do zero?</summary>
              <p>não. não tem lição de &quot;verb to be&quot; nem vocabulário básico. o foco é destravar quem já tem base: falar com naturalidade e confiança. a gramática aparece dentro da conversa, no contexto — nunca solta.</p>
            </details>
            <details>
              <summary>como funciona a correção?</summary>
              <p>na hora, dentro da conversa. a Cadi corrige o que realmente importa com o porquê em uma linha — sem te interromper a cada palavra e sem quebrar o clima. o que te pega volta nas próximas lições.</p>
            </details>
            <details>
              <summary>é só por voz? e se eu estiver num lugar público?</summary>
              <p>sim, o treino é falando — é assim que a fala destrava. dá pra mutar o microfone e só ouvir a Cadi quando não der pra falar, mas o melhor é achar um cantinho e mandar ver por 1–2 minutos. não tem exercício escrito: aqui você pratica conversando.</p>
            </details>
            <details>
              <summary>por que eu pagaria para treinar só 1–2 minutos por dia?</summary>
              <p>relembre as vezes que precisou falar inglês e travou, ficou calado ou disparou a frase rápido demais só pra sair da situação. relembre aquela call ou oportunidade que talvez tivesse sido diferente se o seu inglês não tivesse travado na hora de falar. 1 a 2 minutos por dia, todo dia, é o que resolve isso — porque é treino de fala real, não mais uma lição que você esquece. e o custo de continuar travado é maior que r$89,90 — pagos uma única vez, com acesso vitalício (até o lançamento oficial). pagar também é o que garante que você vai abrir o app hoje, amanhã e o resto da semana — de graça é fácil abandonar, você já viveu isso.</p>
            </details>
            <details>
              <summary>quando eu posso começar a usar?</summary>
              <p>já. estamos em fase inicial, testando com os primeiros usuários. a vantagem de entrar agora é o acesso vitalício — só pra quem adquirir nesse pré-lançamento e quiser ajudar a gente a destravar o inglês de mais gente.</p>
            </details>
          </div>
        </div>
      </section>

      <footer id="cta">
        <div className={styles.wrap}>
          <div className={styles.footTop}>
            <div>
              <div className={styles.footLogo}>cadence</div>
              <div className={styles.footTag}>você já entende inglês. hora de soltar a fala</div>
            </div>
            <div className={styles.footCta}>
              <Link href="/inicio/onboarding" className={styles.btnPrimary}>quero destravar meu inglês agora</Link>
            </div>
          </div>
          <div className={styles.footBottom}>
            <span>© 2026 cadence. feito pra quem já sabe inglês o bastante pra querer falar de vez.</span>
            <span>contato · privacidade</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
