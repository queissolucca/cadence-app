import { describe, it, expect } from 'vitest';
import { payloadOnboarding } from '../lib/comecar/paraApi.js';

/* NENHUMA RESPOSTA DAS 33 TELAS PODE FICAR DE FORA DO BANCO.

   O defeito que este arquivo existe pra impedir já aconteceu duas vezes: a
   vitrine de idiomas (2ª tela) e o teste de fala (7ª) perguntavam, gravavam no
   localStorage, e o payload não os carregava — a pessoa respondia e o dado
   morria quando a conta nascia. Ninguém percebeu porque a gravação é
   best-effort: não há erro, não há tela vermelha, só ausência.

   É um defeito de OMISSÃO, e omissão não quebra teste nenhum que olhe só pro
   que existe. Por isso o teste é ao contrário: parte da lista de tudo o que as
   telas guardam e cobra que cada chave apareça em algum lugar do corpo enviado.
   Tela nova que grave uma chave nova entra nesta lista e falha até ser
   carregada — que é exatamente o momento em que se quer descobrir. */

// Toda chave que alguma das 33 telas escreve no estado (lib/comecar/state.js).
// Ordem do funil.
const TUDO_QUE_AS_TELAS_GUARDAM = [
  'idioma',    // vitrine de bandeiras
  'audio',     // preferência de áudio
  'nivel',     // autoavaliação
  'fala',      // teste de fala (transcrição)
  'objetivo',  // pra que quer o inglês
  'bloqueio',  // o que mais te trava
  'hoje',      // voz alta por semana
  'prazo',     // em quanto tempo
  'horario',   // melhor horário
  'min',       // minutos por dia
  'temas',     // temas de conversa
  'tom',       // tonalidade da correção
];

// Um funil inteiro respondido, com valores que as telas realmente produzem.
const RESPONDIDO = {
  idioma: 'Inglês',
  audio: 'sempre',
  nivel: 'medio',
  fala: 'I would like a table for two please',
  objetivo: 'Carreira',
  bloqueio: 'Vergonha de errar',
  hoje: '-10',
  prazo: '3',
  horario: 'manha',
  min: 10,
  temas: ['Viagem', 'Trabalho'],
  tom: 'agressivo',
};

const achatar = (o) => JSON.stringify(o).toLowerCase();

describe('payload do onboarding', () => {
  it('carrega TODA resposta das telas — nenhuma chave fica pra trás', () => {
    const corpo = payloadOnboarding(RESPONDIDO);
    const texto = achatar(corpo);
    for (const chave of TUDO_QUE_AS_TELAS_GUARDAM) {
      const valor = RESPONDIDO[chave];
      const procurado = Array.isArray(valor) ? valor[0] : String(valor);
      expect(texto, `a resposta "${chave}" (${procurado}) não chega no banco`)
        .toContain(procurado.toLowerCase());
    }
  });

  it('o idioma e a fala têm campo próprio, e não só o bruto', () => {
    const corpo = payloadOnboarding(RESPONDIDO);
    expect(corpo.language).toBe('Inglês');
    expect(corpo.speechSample).toBe('I would like a table for two please');
  });

  it('guarda o estado bruto junto — a rede embaixo das colunas tipadas', () => {
    const corpo = payloadOnboarding(RESPONDIDO);
    expect(corpo.answers).toEqual(RESPONDIDO);
    // Uma pergunta que ainda não tem coluna também precisa sobreviver.
    const comNovidade = payloadOnboarding({ ...RESPONDIDO, perguntaDoFuturo: 'resposta' });
    expect(comNovidade.answers.perguntaDoFuturo).toBe('resposta');
  });

  it('o convite entra quando existe e não vira lixo quando não existe', () => {
    expect(payloadOnboarding(RESPONDIDO, { convite: 'AMIGO10' }).inviteCode).toBe('AMIGO10');
    // Caminho do Google: o campo nem aparece na tela.
    expect(payloadOnboarding(RESPONDIDO).inviteCode).toBeNull();
    expect(payloadOnboarding(RESPONDIDO, { convite: '' }).inviteCode).toBeNull();
  });

  it('estado vazio não vira string "undefined" em coluna nenhuma', () => {
    const corpo = payloadOnboarding({});
    for (const [k, v] of Object.entries(corpo)) {
      // `answers` é jsonb — objeto ali é o formato certo, não um acidente de
      // concatenação. As outras colunas são texto, e é nelas que um objeto
      // vazando viraria a string "[object Object]" dentro do banco.
      if (k === 'answers') { expect(typeof v === 'object' || v === null).toBe(true); continue; }
      expect(String(v), `campo ${k}`).not.toContain('undefined');
      expect(String(v), `campo ${k}`).not.toContain('[object Object]');
    }
  });

  it('a fala é cortada antes de virar um textão no banco', () => {
    const corpo = payloadOnboarding({ ...RESPONDIDO, fala: 'a'.repeat(2000) });
    expect(corpo.speechSample.length).toBeLessThanOrEqual(500);
  });
});
