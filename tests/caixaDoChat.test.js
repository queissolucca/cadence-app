import { describe, it, expect } from 'vitest';
import { lerFonte } from './fonte.js';

/* A CAIXA DE ESCREVER TEM QUE CABER NA TELA DO CELULAR.

   O defeito, duas vezes: a altura da caixa era calculada descontando um
   orçamento chutado para "tudo o que não é a conversa", e o chute era pequeno.
   Resultado — o campo "Escreva em inglês…" ficava ABAIXO DA DOBRA, e a pessoa
   tinha que rolar a página pra achar onde escrever. Numa tela cujo único
   propósito é escrever.

   Primeiro foi `min(56vh, 460px)`: `vh` no Safari do iPhone é o viewport
   EXPANDIDO, maior do que se vê com a barra do navegador à mostra. Depois
   `calc(100dvh - 430px)`, que corrigiu a unidade e manteve o número curto.

   Estes testes não fixam o número — fixam o que dá errado quando ele está
   errado. */

const CHAT = lerFonte('components/v2/TextChatClient.js');
const PAGINA = lerFonte('app/v2/(app)/conversar/page.js');

describe('a altura da caixa do chat', () => {
  it('mede o viewport visível (dvh), não o expandido (vh)', () => {
    expect(CHAT).toMatch(/calc\(100dvh - \d+px\)/);
    // `100vh` solto é o bug original; `dvh` contém a substring 'vh', então a
    // checagem precisa ser do número colado no vh, não de 'vh' em qualquer lugar.
    expect(CHAT, 'vh sem o d volta a medir a tela expandida').not.toMatch(/\d\s*vh\b/);
  });

  it('desconta o orçamento inteiro do que não é a conversa', () => {
    const m = CHAT.match(/calc\(100dvh - (\d+)px\)/);
    expect(m, 'a conta da altura precisa existir').toBeTruthy();
    /* 481px somados elemento por elemento no mobile (a soma está comentada no
       arquivo). Abaixo disso o campo de digitar volta pra baixo da dobra —
       foi exatamente o que aconteceu com 430. */
    expect(Number(m[1]), 'orçamento pequeno = campo de escrever abaixo da dobra').toBeGreaterThanOrEqual(480);
  });

  it('a rolagem fica DENTRO da caixa e não contamina a página', () => {
    const i = CHAT.indexOf('calc(100dvh');
    const bloco = CHAT.slice(i - 400, i + 400);
    expect(bloco).toMatch(/overflowY:\s*'auto'/);
    // Sem isto, chegar ao fim da conversa continua rolando a página atrás.
    expect(bloco).toMatch(/overscrollBehavior:\s*'contain'/);
  });

  it('tem teto e piso — nem fresta, nem caixa dominando a tela', () => {
    const m = CHAT.match(/clamp\((\d+)px,\s*calc\(100dvh - \d+px\),\s*(\d+)px\)/);
    expect(m, 'a altura precisa continuar sendo um clamp').toBeTruthy();
    const [piso, teto] = [Number(m[1]), Number(m[2])];
    expect(piso).toBeGreaterThanOrEqual(150);
    expect(teto).toBeLessThanOrEqual(400);
    expect(piso).toBeLessThan(teto);
  });
});

describe('o ar acima da caixa', () => {
  it('o parágrafo de abertura não empilha margem com o gap do shell', () => {
    /* `.web-main-inner` já põe 26px de gap entre o cabeçalho e a ConversarView.
       A margem de 18px embaixo do parágrafo somava 44px de ar entre o texto e o
       botão "Agentes & histórico" — altura que faltava pra caixa caber. */
    const m = PAGINA.match(/margin: '6px 0 (\d+)px'/);
    expect(m, 'a margem do parágrafo de abertura precisa existir').toBeTruthy();
    expect(Number(m[1]), 'somada ao gap de 26px do shell, isto vira ar demais').toBeLessThanOrEqual(8);
  });
});
