import { describe, it, expect } from 'vitest';
import { lerFonte } from './fonte.js';

/* A CADY DO ESCREVER FALA PORTUGUÊS.

   O sintoma: a pessoa escrevia em português e a resposta vinha só em inglês.
   A causa não era o modelo nem o agente do ElevenLabs — era uma linha no
   system prompt desta rota mandando exatamente isso:

     "Reply ONLY in English — always. If they write in Portuguese, don't
      switch: answer in English and hand them the English phrasing..."

   E o tempo perdido nisso tem uma causa própria: dava pra achar que o Escrever
   usava o agente de voz. Não usa — usa a Anthropic. Por isso o primeiro teste
   aqui é sobre QUEM responde, não sobre o texto. */

const ROTA = lerFonte('app/api/chat/route.js');
const CHAT = lerFonte('components/v2/TextChatClient.js');

/* SÓ O PROMPT DA CONVERSA ABERTA. `lessonPrompt` (drill da Trilha) e
   `cardDrillPrompt` (1 card da Revisão) continuam em inglês de propósito: são
   outras features, e o pedido foi sobre o Escrever da Conversa Aberta. Varrer
   o arquivo inteiro faria este teste falhar por causa delas. */
const ABERTA = ROTA.slice(
  ROTA.indexOf('function systemPrompt('),
  ROTA.indexOf('function lessonPrompt('),
);

describe('quem responde no Escrever', () => {
  it('é a Anthropic, não o ElevenLabs — e isso não pode virar ambíguo', () => {
    expect(ROTA).toContain("from '@anthropic-ai/sdk'");
    expect(ROTA, 'se um dia o Escrever passar pelo ElevenLabs, este teste tem que cair')
      .not.toMatch(/elevenlabs/i);
  });
});

describe('a persona e o idioma do Escrever', () => {
  it('a regra de "só inglês" morreu na conversa aberta', () => {
    expect(ABERTA, 'a asserção precisa estar olhando o prompt certo').toContain('Cady');
    for (const proibido of ['Reply ONLY in English', "don't switch", 'English only']) {
      expect(ABERTA, `"${proibido}" é o bug, não pode voltar`).not.toContain(proibido);
    }
  });

  it('manda escrever em português do Brasil, com o inglês na última linha', () => {
    expect(ABERTA).toMatch(/Portuguese from Brazil/);
    // O método inteiro depende disso: todo turno termina numa linha em inglês
    // pra pessoa digitar. Sem ela, virou papo em português e parou de ensinar.
    expect(ABERTA).toMatch(/English line always goes last, alone, on its own line/);
    expect(ABERTA).toMatch(/Every single turn ends with a line in English/);
  });

  it('é a Cady Mosby do agente de voz, não a Whitfield antiga', () => {
    expect(ABERTA).toContain('Cady" Mosby');
    expect(ROTA, 'a bio antiga saiu do arquivo inteiro').not.toContain('Whitfield');
  });

  it('mantém o freio: o ácido é sobre a frase, nunca sobre a pessoa', () => {
    // Sem esta lista o prompt é só "seja cruel", e aí ele erra o alvo.
    expect(ABERTA).toMatch(/Off limits, no exceptions: appearance, body, family, origin, religion, sexuality/);
    expect(ABERTA).toMatch(/never at who he is/);
  });

  it('proíbe markdown, porque a bolha não tem parser', () => {
    // TextChatClient renderiza com whiteSpace: pre-wrap. Um `**` do modelo
    // aparece como `**` na tela.
    expect(CHAT).toMatch(/whiteSpace: 'pre-wrap'/);
    expect(ABERTA).toMatch(/NO markdown, no asterisks/);
  });

  it('não sobra nenhuma variável de painel sem valor', () => {
    /* As variáveis de duplo-colchete só existem no painel do ElevenLabs. Se
       uma passar batida pra cá, chega literal no prompt e o modelo lê o
       colchete. A varredura é na FONTE sem comentários (lerFonte): os
       comentários deste projeto citam essas variáveis pra explicar de onde
       vieram, e uma asserção sobre o texto cru falharia por causa da própria
       documentação. Já aconteceu outras vezes aqui — é pra isso que
       tests/fonte.js existe. */
    expect(ABERTA, 'variável do ElevenLabs não resolvida no prompt').not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });
});

describe('as seções condicionais do prompt', () => {
  /* Variável vazia não é neutra num prompt que tem instrução em cima dela: foi
     assim que `unit_*` em branco renderizou "Lesson:  — focus:" no agente de
     voz e fez o modelo desligar a chamada sozinho. Sem dado, a seção não
     pode existir. */
  it('memória e callbacks só aparecem quando há dado', () => {
    expect(ABERTA).toMatch(/\$\{pastCorrections \? `/);
    expect(ABERTA).toMatch(/\$\{memoryBlock \? `/);
  });

  it('as correções antigas vêm da Revisão, e em paralelo com a memória', () => {
    expect(ROTA).toMatch(/from\('review_saved'\)/);
    expect(ROTA).toMatch(/eq\('category', 'correction'\)/);
    const i = ROTA.indexOf('const [memoryBlock, pastCorrections]');
    expect(i, 'as duas leituras precisam sair juntas').toBeGreaterThan(-1);
    expect(ROTA.slice(i, i + 200)).toContain('Promise.all');
  });
});

describe('a primeira bolha da tela', () => {
  it('abre em português, porque o system prompt não alcança string de cliente', () => {
    expect(CHAT).not.toContain("I'm Cady. What do you wanna talk about today?");
    expect(CHAT).toMatch(/sou a Cady/);
    // E ainda assim entrega uma linha em inglês pra pessoa digitar: é o método.
    expect(CHAT).toMatch(/Tell me what you did today\./);
  });
});
