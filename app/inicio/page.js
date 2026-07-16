import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'cadence — você já sabe inglês. hora de aprender de vez',
  description: 'cadence é feito pra quem já passou do básico e quer treinar exatamente o que falta: escrever com naturalidade e falar com confiança em situações reais.',
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
            <span className={styles.eyebrow}>você já sabe inglês. hora de aprender de vez</span>
            <h1>você entende quase tudo em inglês. <em>então por que ainda trava</em> na hora de escrever ou falar?</h1>
            <p className={styles.leadHero}>cadence é feito pra quem já passou do básico — nível intermediário pra cima — e quer treinar exatamente o que falta: escrever com naturalidade e falar com confiança em situações reais. sem lição de gramática do zero.</p>
            <div className={styles.ctaRow}>
              <Link href="/inicio/onboarding" className={styles.btnPrimary}>quero destravar meu inglês agora</Link>
              <a href="#metodo" className={styles.btnGhost}>ver como funciona</a>
            </div>
            <p className={styles.microcopy}>acesso antecipado · sessões de ~10 min · sem cartão de crédito</p>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.phone}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>01 · hoje · início da sessão</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '13px', color: 'var(--stone)', marginBottom: '2px' }}>bom dia, rafa</p>
                <div className={styles.phoneTitle}>Hoje</div>
                <div className={styles.phoneCard}>
                  <span className={styles.phonePill}>10 min · 6 itens</span><br />
                  2 escrita · 2 fala · 2 revisão
                </div>
                <div className={styles.phoneBtn}>continuar sessão</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.problem} id="problema">
        <div className={styles.wrap}>
          <span className={styles.eyebrow}>// o problema real</span>
          <h2>você não é iniciante. então por que ainda trava?</h2>
          <p className={styles.leadProblem}>anos de inglês, série sem legenda, e-mail lido sem esforço — mas na hora de escrever algo importante ou entrar numa call em inglês, o cérebro trava. isso não é falta de nível. é falta de prática no que realmente importa.</p>
          <div className={styles.cards}>
            <div className={styles.card}>
              <h3>o platô do intermediário</h3>
              <p>você passou dos exercícios básicos há anos, mas continua com os mesmos deslizes: preposição errada, tempo verbal torto, aquela pausa antes de falar porque não sabe se soa natural.</p>
            </div>
            <div className={styles.card}>
              <h3>tempo, você não tem</h3>
              <p>entre trabalho e o resto da vida, sobra pouco. curso inteiro, aula de 40 minutos, lição de casa — não cabe. o que cabe são os 10 minutos entre uma reunião e outra.</p>
            </div>
            <div className={styles.card}>
              <h3>os apps tratam você como principiante</h3>
              <p>"the cat is on the table" não é o seu problema. você já lê, já assiste, já entende. falta treinar escrita e fala em situações reais — com correção que explica o porquê, não só pontuação por acerto.</p>
            </div>
          </div>
          <p className={styles.closer}>resultado: você entende quase tudo — mas ainda reescreve um e-mail cinco vezes ou trava numa apresentação. familiar?</p>
        </div>
      </section>

      <section className={styles.solution} id="metodo">
        <div className={styles.wrap}>
          <div className={styles.solutionHead}>
            <span className={styles.eyebrow}>// como o cadence funciona</span>
            <h2>duas dores, um método: escrever e falar, todo dia, um pouco.</h2>
            <p className={styles.leadSolution}>cada sessão dura o tempo de um café — cerca de 10 minutos, sempre misturando escrita e fala em cenários reais, nunca frases soltas de manual.</p>
          </div>
          <div className={styles.chipRow}>
            <span className={styles.chip}>cenários reais, não frases soltas</span>
            <span className={styles.chip}>correção direta + o porquê</span>
            <span className={styles.chip}>SRS: hoje → amanhã → 1 sem → 1 mês</span>
          </div>

          <div className={styles.phonesGrid}>
            <div className={styles.phone}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>02 · escrita · cenário real</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '11px', color: 'var(--stone)', marginBottom: '6px' }}>CENÁRIO · E-MAIL DE TRABALHO</p>
                <div className={styles.phoneTitle} style={{ fontSize: '16px' }}>seu gerente pergunta se o relatório fica pronto hoje.</div>
                <div className={styles.phoneInput}>I will send the report until tomorrow morning.</div>
                <div className={styles.phoneBtn}>verificar</div>
              </div>
            </div>

            <div className={styles.phone}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>03 · escrita · correção direta</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>✓ quase lá — 1 ajuste</p>
                <div className={styles.phoneCard}>
                  <span style={{ fontSize: '10px', color: 'var(--stone)' }}>VOCÊ ESCREVEU</span><br />
                  I will send the report <span className={styles.strike}>until</span> <span className={styles.ok}>by</span> tomorrow morning.
                </div>
                <div className={styles.phoneWhy}><b>por quê:</b> "by" marca um prazo final. "until" seria uma ação que continua até aquele momento.</div>
              </div>
            </div>

            <div className={`${styles.phone} ${styles.phoneDark}`}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>04 · fala · gravando</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '11px', color: '#9FB6A9', marginTop: '6px' }}>CENÁRIO · RESTAURANTE</p>
                <div className={styles.transcript}>você terminou de comer.<br />peça a conta com educação.</div>
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
              <span className={styles.phoneStep}>05 · fala · correção + porquê</span>
              <div className={styles.phoneBody}>
                <p style={{ fontSize: '11px', color: '#e2a583', marginTop: '6px' }}>entendível, mas soa rude</p>
                <div className={styles.quoteYou}><span>você falou</span>&quot;I want the bill.&quot;</div>
                <div className={styles.quoteYou}><span>como um nativo diria</span>&quot;Could we get the bill, please?&quot;</div>
              </div>
            </div>

            <div className={styles.phone}>
              <div className={styles.phoneBar}><span>9:41</span><span>●●●</span></div>
              <span className={styles.phoneStep}>06 · progresso · pipeline SRS</span>
              <div className={styles.phoneBody}>
                <div className={styles.phoneTitle} style={{ fontSize: '16px' }}>progresso</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <div className={styles.phoneCard} style={{ flex: 1, textAlign: 'center', padding: '10px' }}>
                    <b style={{ fontSize: '18px' }}>12</b><br /><span style={{ fontSize: '11px' }}>dias seguidos</span>
                  </div>
                  <div className={styles.phoneCard} style={{ flex: 1, textAlign: 'center', padding: '10px' }}>
                    <b style={{ fontSize: '18px' }}>47</b><br /><span style={{ fontSize: '11px' }}>itens dominados</span>
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--stone)' }}>memória espaçada: hoje · amanhã · 1 sem · 1 mês</p>
              </div>
            </div>
          </div>

          <div className={styles.featGrid}>
            <div className={styles.feat}>
              <span className={styles.num}>escrita</span>
              <h4>situações reais, não gramática solta</h4>
              <p>você escreve dentro de um cenário — um e-mail, uma mensagem, um pedido — porque é assim que o inglês te trava na vida real.</p>
            </div>
            <div className={styles.feat}>
              <span className={styles.num}>fala</span>
              <h4>correção com o porquê, em uma linha</h4>
              <p>nada de &quot;errado, tente de novo&quot;. cada correção explica por que a frase soa mais natural — e volta pra revisão depois.</p>
            </div>
            <div className={styles.feat}>
              <span className={styles.num}>memória</span>
              <h4>repetição espaçada, sem enrolação</h4>
              <p>o que você errou volta hoje, amanhã, em uma semana e em um mês — só o suficiente pra ficar de verdade, sem repetir o que você já domina.</p>
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
              <p>não, o cadence serve para todas as pessoas que têm inglês intermediário. se você já entende conversas no geral, lê sem ficar traduzindo tudo mentalmente e consegue entender alguns trechos de músicas em inglês, é exatamente pra você.</p>
            </details>
            <details>
              <summary>quanto tempo eu preciso dedicar por dia?</summary>
              <p>em torno de 10 minutos. as sessões são curtas de propósito, pra caber entre uma reunião e outra — não pedem hora marcada.</p>
            </details>
            <details>
              <summary>o cadence ensina gramática do zero?</summary>
              <p>não. não tem lição de &quot;verb to be&quot; ou vocabulário básico. o foco é no que trava quem já tem base: escrever com naturalidade e falar com confiança em situações reais.</p>
            </details>
            <details>
              <summary>como funciona a correção?</summary>
              <p>cada erro vem com o porquê em uma linha — não só o certo e o errado. e o que você errou volta pra revisão em hoje, amanhã, uma semana e um mês, seguindo repetição espaçada.</p>
            </details>
            <details>
              <summary>por que eu pagaria para treinar só 10 minutos por dia?</summary>
              <p>relembre os momentos que você ficou insegura(o) pra escrever uma mensagem ou email em inglês e teve que pesquisar cada frase antes de enviar. relembre as vezes que precisou falar e travou, ficou calado ou disparou a frase rápido demais só pra sair da situação. relembre aquela oportunidade de trabalho ou de vida que talvez tivesse sido diferente se o seu inglês não tivesse travado. 10 minutos por dia, todo dia, é o que resolve isso — porque é treino real, não mais uma lição que você vai esquecer. e o custo de continuar assim é maior que r$89,90 — pagos uma única vez, com acesso vitalício (até o lançamento oficial). pagar esse valor também é o que garante que você vai abrir o app hoje, amanhã e o resto da semana — de graça é fácil abandonar, você já viveu isso outras vezes.</p>
            </details>
            <details>
              <summary>preciso falar em voz alta, mesmo em lugar público?</summary>
              <p>dá pra treinar por texto ou por áudio — você escolhe o formato e o ritmo de cada sessão, dependendo de onde e quando estiver praticando.</p>
            </details>
            <details>
              <summary>quando eu posso começar a usar?</summary>
              <p>você já pode começar a usar — estamos em fase inicial, então no momento estamos testando com os usuários. e a grande vantagem de começar a usar agora é ter o acesso vitalício: ele vai ser só para as pessoas que adquirirem nessa fase de pré-lançamento e quiserem ajudar a gente a melhorar o inglês de mais gente.</p>
            </details>
          </div>
        </div>
      </section>

      <footer id="cta">
        <div className={styles.wrap}>
          <div className={styles.footTop}>
            <div>
              <div className={styles.footLogo}>cadence</div>
              <div className={styles.footTag}>você já sabe inglês. hora de aprender de vez</div>
            </div>
            <div className={styles.footCta}>
              <Link href="/inicio/onboarding" className={styles.btnPrimary}>quero destravar meu inglês agora</Link>
            </div>
          </div>
          <div className={styles.footBottom}>
            <span>© 2026 cadence. feito pra quem já sabe inglês o bastante pra querer mais.</span>
            <span>contato · privacidade</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
