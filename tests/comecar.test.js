import { describe, it, expect } from 'vitest';
import { payloadOnboarding, respostasCompletas } from '../lib/comecar/paraApi.js';
import { compararFala, FRASE_TESTE } from '../lib/comecar/fala.js';

// Estado como as 33 telas o deixam no localStorage ao chegar na tela de conta.
const respondido = {
  idioma: 'Inglês',
  audio: 'sempre',
  nivel: 'medio',
  objetivo: 'Carreira',
  bloqueio: 'Congelo na hora',
  hoje: '-10',
  prazo: '3',
  horario: 'manha',
  min: 10,
  temas: ['Viagem', 'Trabalho'],
  tom: 'agressivo',
};

describe('payloadOnboarding (estado das telas -> corpo da API)', () => {
  const p = payloadOnboarding(respondido);

  it('marca a origem, que é o que separa as duas coortes', () => {
    expect(p.source).toBe('comecar');
  });

  it('manda rótulo legível, não o código da tela', () => {
    // O texto vai direto pra memória da Cady: "manha" não lê como frase.
    expect(p.bestTime).toBe('De manhã');
    expect(p.speaksToday).toBe('Menos de 10 minutos por dia');
    expect(p.deadline).toBe('3 meses');
    expect(p.audioPref).toBe('Pode falar sempre');
    expect(p.level).toMatch(/falo travando/i);
  });

  it('daily_goal sai no mesmo formato do funil antigo', () => {
    expect(p.dailyGoal).toBe('10 minutos / dia');
  });

  it('escolha única vira array, porque a coluna é a mesma do funil antigo', () => {
    expect(p.reasons).toEqual(['Trabalho e carreira.']);
    expect(p.challenges).toEqual(['Congelo na hora H.']);
  });

  it('não inventa resposta pro que não foi perguntado', () => {
    // A interface nova não pergunta idade nem gênero — mandar string vazia aqui
    // gravaria dado falso; a validação da API é que trata a ausência.
    expect(p.age).toBeUndefined();
    expect(p.gender).toBeUndefined();
  });

  it('aguenta estado pela metade sem explodir', () => {
    const p2 = payloadOnboarding({ temas: [] });
    expect(p2.level).toBeNull();
    expect(p2.reasons).toEqual([]);
    expect(p2.dailyGoal).toBeNull();
  });
});

describe('respostasCompletas (o que a API exige pra marcar onboarded_at)', () => {
  it('completo passa', () => {
    expect(respostasCompletas(respondido)).toBe(true);
  });
  it('faltando qualquer um dos quatro, reprova', () => {
    for (const k of ['nivel', 'objetivo', 'bloqueio', 'min']) {
      expect(respostasCompletas({ ...respondido, [k]: null })).toBe(false);
    }
  });
});

describe('compararFala (teste de fala)', () => {
  it('frase inteira é reconhecida como inteira', () => {
    expect(compararFala('I would like a table for two, please').completa).toBe(true);
  });

  it('aceita a contração como o reconhecedor costuma devolver', () => {
    expect(compararFala("I'd like a table for two please").completa).toBe(true);
  });

  it('ignora pontuação e caixa', () => {
    expect(compararFala('id LIKE a TABLE for TWO please!!!').completa).toBe(true);
  });

  it('aponta o que faltou em vez de dar nota', () => {
    const r = compararFala('like a table please');
    expect(r.completa).toBe(false);
    expect(r.faltando).toContain('two');
    expect(r.faltando).toContain('for');
    expect(r.acertou).toBeLessThan(r.alvo.length);
  });

  it('sem áudio não vira resultado', () => {
    // O caminho que importa: navegador sem a API, ou microfone negado. Antes a
    // tela mostrava "pronúncia 92%" mesmo assim.
    for (const v of ['', '   ', null, undefined]) {
      expect(compararFala(v).ouviu).toBe(false);
    }
  });

  it('a frase-alvo bate com ela mesma', () => {
    expect(compararFala(FRASE_TESTE).completa).toBe(true);
  });
});
