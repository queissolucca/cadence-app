'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const TOTAL_STEPS = 5;

function buildFeedback(raw) {
  const lower = raw.toLowerCase();

  if (lower.includes('until') && !lower.includes(' by ')) {
    const idx = raw.search(/until/i);
    const matchEnd = idx + 5; // 'until'.length
    return {
      badgeType: 'adjust',
      badgeText: 'quase lá — 1 ajuste',
      sentence: (
        <>
          {raw.slice(0, idx)}
          <span className={styles.strike}>{raw.slice(idx, matchEnd)}</span>{' '}
          <span className={styles.ok}>by</span>
          {raw.slice(matchEnd)}
        </>
      ),
      why: (
        <>
          <b>por quê:</b> &quot;by&quot; marca um prazo final (&quot;no mais tardar&quot;). &quot;until&quot; seria uma ação que continua até aquele momento — não é o caso aqui.
        </>
      ),
      native: (
        <>
          <span>como um nativo diria</span>&quot;I&apos;ll send the report by tomorrow morning.&quot;
        </>
      ),
    };
  }

  if (lower.includes(' by ') || lower.startsWith('by ') || lower.includes('by tomorrow')) {
    return {
      badgeType: 'good',
      badgeText: 'muito bem — está natural!',
      sentence: raw,
      why: (
        <>
          <b>por quê:</b> quando existe um prazo final, &quot;by&quot; é exatamente a escolha certa. é assim que um nativo escreveria.
        </>
      ),
      native: (
        <>
          <span>reforçando o padrão</span>&quot;I&apos;ll send the report by tomorrow morning.&quot;
        </>
      ),
    };
  }

  return {
    badgeType: 'adjust',
    badgeText: 'bom começo — dá pra ficar mais natural',
    sentence: raw,
    why: (
      <>
        <b>por quê:</b> quando o prazo é um horário-limite, o mais natural em inglês é usar &quot;by&quot;, não &quot;until&quot; ou outras construções mais literais do português.
      </>
    ),
    native: (
      <>
        <span>como um nativo diria</span>&quot;I&apos;ll send the report by tomorrow morning.&quot;
      </>
    ),
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answer, setAnswer] = useState('');
  const [inputError, setInputError] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('card');

  const progressPct = step > TOTAL_STEPS ? 100 : (step / TOTAL_STEPS) * 100;
  const progressLabel = step > TOTAL_STEPS ? 'concluído' : `passo ${step} de ${TOTAL_STEPS}`;

  function checkAnswer() {
    const raw = answer.trim();
    if (!raw) {
      setInputError(true);
      return;
    }
    setInputError(false);
    setFeedback(buildFeedback(raw));
    setStep(3);
  }

  const stepClass = (n) => `${styles.step} ${step === n ? styles.stepActive : ''}`;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.logo}><span className={styles.dot}></span>cadence</div>
        <div className={styles.progressWrap}>
          <span className={styles.progressLabel}>{progressLabel}</span>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
        <Link href="/cadence" className={styles.exit}>sair</Link>
      </div>

      <div className={styles.stage}>

        <section className={stepClass(1)}>
          <span className={styles.eyebrow}>experimente agora</span>
          <h1 style={{ fontSize: '32px', margin: '14px 0 14px' }}>vamos treinar sua primeira frase real</h1>
          <p style={{ color: 'var(--stone)', fontSize: '16px', lineHeight: 1.6 }}>isso leva menos de 2 minutos, sem cadastro. você vai escrever uma resposta pra um cenário real de trabalho e ver como funciona a correção do cadence — com o porquê, não só certo ou errado.</p>
          <div className={styles.card}>
            <span className={styles.pill}>1 cenário · 1 correção</span>
            <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--stone)' }}>cenário: e-mail de trabalho</p>
          </div>
          <button className={styles.btnPrimary} onClick={() => setStep(2)}>começar</button>
        </section>

        <section className={stepClass(2)}>
          <span className={styles.scenarioTag}>cenário · e-mail de trabalho</span>
          <h1 style={{ fontSize: '26px', margin: '12px 0 8px' }}>seu gerente pergunta se o relatório fica pronto hoje.</h1>
          <p className={styles.hint}>responda dizendo que você vai enviar amanhã de manhã — em inglês.</p>
          <textarea
            value={answer}
            maxLength={140}
            placeholder={inputError ? 'escreva algo antes de verificar :)' : 'escreva sua resposta em inglês...'}
            style={inputError ? { borderColor: 'var(--rust)' } : undefined}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (inputError) setInputError(false);
            }}
          />
          <div className={styles.charcount}><span>{answer.length}</span>/140 caracteres</div>
          <button className={styles.btnPrimary} onClick={checkAnswer}>verificar</button>
        </section>

        <section className={stepClass(3)}>
          {feedback && (
            <>
              <div className={styles.fbBadge}>
                <span className={`${styles.ic} ${feedback.badgeType === 'good' ? styles.icGood : styles.icAdjust}`}>
                  {feedback.badgeType === 'good' ? '✓' : '!'}
                </span>
                {feedback.badgeText}
              </div>
              <div className={styles.card}>
                <span className={styles.youLabel}>você escreveu</span>
                <p className={styles.sentence}>{feedback.sentence}</p>
              </div>
              <p className={styles.why}>{feedback.why}</p>
              <div className={styles.nativeQuote}>{feedback.native}</div>
            </>
          )}
          <div className={styles.srsRow}>
            <span className={`${styles.srsChip} ${styles.srsChipActive}`}>hoje</span>
            <span className={styles.srsChip}>amanhã</span>
            <span className={styles.srsChip}>1 semana</span>
            <span className={styles.srsChip}>1 mês</span>
          </div>
          <button className={styles.btnPrimary} style={{ marginTop: '24px' }} onClick={() => setStep(4)}>continuar</button>
        </section>

        <section className={stepClass(4)}>
          <span className={styles.eyebrow}>isso foi só 1 de 6 itens de uma sessão real</span>
          <h1 style={{ fontSize: '28px', margin: '14px 0 10px' }}>imagina isso todo dia, 10 minutos, até virar automático.</h1>
          <p style={{ color: 'var(--stone)', fontSize: '15px', lineHeight: 1.6 }}>cada sessão mistura escrita e fala, sempre com correção direta e repetição espaçada — assim é como quem já treina no cadence está evoluindo:</p>
          <div className={styles.statRow}>
            <div className={styles.stat}><b>12</b><span>dias seguidos</span></div>
            <div className={styles.stat}><b>47</b><span>itens dominados</span></div>
            <div className={styles.stat}><b>10min</b><span>por sessão</span></div>
          </div>
          <button className={styles.btnPrimary} onClick={() => setStep(5)}>quero continuar treinando</button>
        </section>

        <section className={stepClass(5)}>
          <span className={styles.eyebrow}>última etapa</span>
          <h1 style={{ fontSize: '28px', margin: '12px 0 4px' }}>comece a treinar todos os dias</h1>
          <div className={styles.planCard}>
            <div className={styles.planPrice}>R$ 29,90<span> /mês</span></div>
            <div className={styles.planList}>
              + sessões diárias de ~10 minutos<br />
              + correção direta com o porquê<br />
              + repetição espaçada (hoje → amanhã → 1 sem → 1 mês)<br />
              + cenários reais ilimitados de escrita e fala
            </div>
          </div>

          <div className={styles.tabs}>
            <div className={`${styles.tab} ${activeTab === 'card' ? styles.tabActive : ''}`} onClick={() => setActiveTab('card')}>cartão de crédito</div>
            <div className={`${styles.tab} ${activeTab === 'pix' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pix')}>pix agendado (mensal)</div>
          </div>

          <div className={`${styles.payPanel} ${activeTab === 'card' ? styles.payPanelActive : ''}`}>
            <label>nome no cartão</label>
            <input type="text" placeholder="como está impresso no cartão" />
            <div className={styles.fieldRow}>
              <div>
                <label>número do cartão</label>
                <input type="text" placeholder="0000 0000 0000 0000" />
              </div>
              <div>
                <label>validade</label>
                <input type="text" placeholder="MM/AA" />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div>
                <label>cvv</label>
                <input type="text" placeholder="123" />
              </div>
              <div></div>
            </div>
          </div>

          <div className={`${styles.payPanel} ${activeTab === 'pix' ? styles.payPanelActive : ''}`}>
            <label>cpf</label>
            <input type="text" placeholder="000.000.000-00" />
            <p className={styles.hint} style={{ marginTop: '12px' }}>você autoriza um débito pix de R$ 29,90 todo mês, na mesma data. cancele quando quiser, direto pelo app.</p>
          </div>

          <button className={styles.btnPrimary} style={{ marginTop: '22px' }} onClick={() => setStep(6)}>confirmar assinatura</button>
          <p className={styles.finePrint}>cobrança recorrente mensal de R$ 29,90. cancele quando quiser, sem multa. pagamento processado com criptografia de ponta a ponta.</p>
        </section>

        <section className={stepClass(6)}>
          <div className={styles.successIc}>✓</div>
          <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>tudo certo — sua assinatura está ativa.</h1>
          <p style={{ color: 'var(--stone)', fontSize: '15px', lineHeight: 1.6 }}>sua sessão de hoje já está pronta: 6 itens, 10 minutos, escrita e fala. bora treinar o que fica travado.</p>
          <button
            className={styles.btnPrimary}
            style={{ marginTop: '22px' }}
            onClick={() => router.push('/')}
          >
            ir para a sessão de hoje
          </button>
        </section>

      </div>
    </div>
  );
}
