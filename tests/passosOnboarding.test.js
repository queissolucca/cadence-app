import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PASSOS, TOTAL_DE_PASSOS, numeroDoPasso } from '../lib/comecar/passos.js';

/* O NÚMERO DO PASSO SE DESALINHA EM SILÊNCIO.

   Ele era escrito à mão em cada uma das nove telas que o mostram. Tirar uma
   pergunta do meio do fluxo não quebra build nem teste — a pessoa só vê "passo
   2, passo 4, passo 5" e conclui que o produto é malfeito, sem saber dizer por
   quê. É o pior tipo de defeito: invisível pra quem faz, evidente pra quem usa.

   Agora o número sai de uma lista só. Estes testes seguram as duas metades: que
   a lista e o fluxo não divirjam, e que ninguém volte a escrever o número na
   mão. */

const TELAS = readdirSync('components/comecar/screens')
  .filter((f) => f.endsWith('.js'))
  .map((f) => [f, readFileSync(join('components/comecar/screens', f), 'utf8')]);
const FLOW = readFileSync('lib/comecar/flow.js', 'utf8');

describe('a numeração é derivada, não escrita', () => {
  it('nenhuma tela escreve "Passo N" na mão', () => {
    const culpadas = TELAS
      .filter(([, src]) => /<Kicker>\s*Passo\s+\d/.test(src))
      .map(([nome]) => nome);
    expect(culpadas, 'voltou a escrever o número na mão').toEqual([]);
  });

  it('as telas de pergunta usam <Passo id=...>', () => {
    const usos = TELAS.flatMap(([, src]) => [...src.matchAll(/<Passo id="([^"]+)"/g)].map((m) => m[1]));
    expect(usos.length).toBeGreaterThan(5);
    // Todo id usado tem que existir na lista — senão o rótulo some sem avisar.
    for (const id of usos) {
      expect(PASSOS, `<Passo id="${id}"> não está em PASSOS`).toContain(id);
    }
  });

  it('a contagem é 1-based e contínua', () => {
    expect(numeroDoPasso(PASSOS[0])).toBe(1);
    expect(numeroDoPasso(PASSOS[TOTAL_DE_PASSOS - 1])).toBe(TOTAL_DE_PASSOS);
    expect(numeroDoPasso('nao-existe')).toBeNull();
  });

  it('todo passo é uma tela de verdade do fluxo', () => {
    // Um id órfão na lista desloca a numeração de todos os seguintes sem que
    // nada apareça quebrado.
    for (const id of PASSOS) {
      expect(FLOW, `PASSOS tem "${id}", que não existe no fluxo`).toContain(`id: '${id}'`);
    }
  });

  it('a ordem da lista é a ordem do fluxo', () => {
    // Fora de ordem, o "passo 6" apareceria depois do "passo 7".
    const posicoes = PASSOS.map((id) => FLOW.indexOf(`id: '${id}'`));
    const ordenado = [...posicoes].sort((a, b) => a - b);
    expect(posicoes).toEqual(ordenado);
  });
});

describe('a pergunta de áudio saiu', () => {
  it('a tela não existe mais', () => {
    expect(FLOW).not.toContain("id: 'audio'");
    const abertura = readFileSync('components/comecar/screens/abertura.js', 'utf8');
    expect(abertura).not.toMatch(/export function Audio\b/);
  });

  it('e ninguém tenta navegar pra ela', () => {
    // Um go('audio') sobrevivente levaria a uma tela que não existe — e o
    // acharTela devolve o splash como fallback, ou seja, o onboarding recomeça.
    for (const [nome, src] of TELAS) {
      expect(src, `${nome} ainda navega pra 'audio'`).not.toContain("go('audio')");
    }
  });

  it('a numeração fechou o buraco: a tela seguinte virou o passo 2', () => {
    expect(numeroDoPasso('nivel')).toBe(2);
    expect(numeroDoPasso('prazo')).toBe(6);
    expect(numeroDoPasso('temas')).toBe(TOTAL_DE_PASSOS);
  });
});

describe('a tela nova da memória', () => {
  const APP = readFileSync('components/comecar/screens/app.js', 'utf8');

  it('existe e entra entre a lição e o plano', () => {
    expect(APP).toMatch(/export function Memoria\b/);
    const iMem = FLOW.indexOf("id: 'memoria'");
    const iLic = FLOW.indexOf("id: 'licao-fim'");
    const iPla = FLOW.indexOf("id: 'plano'");
    expect(iLic).toBeLessThan(iMem);
    expect(iMem).toBeLessThan(iPla);
  });

  it('a lição leva a ela, e ela leva ao plano', () => {
    expect(APP).toMatch(/<Cta onClick=\{\(\) => go\('memoria'\)\}>continuar<\/Cta>/);
    const i = APP.indexOf('export function Memoria');
    expect(APP.slice(i, i + 2600)).toContain("go('plano')");
  });

  it('não é um passo numerado — é demonstração, não pergunta', () => {
    expect(PASSOS).not.toContain('memoria');
  });

  /* Cada exemplo prova um mecanismo DIFERENTE. Três exemplos com dois
     mecanismos são, na prática, dois: quando a pessoa percebe o molde, para de
     ler como prova e lê como modelo preenchido. */
  it('mostra a frase que a Cady DIZ, e não um resumo dela', () => {
    const i = APP.indexOf('export function Memoria');
    const tela = APP.slice(i, i + 2600);
    for (const fala of ['sparkling water', 'how was your run', 'how was Sunday with your family']) {
      expect(tela, `faltou a fala "${fala}"`).toContain(fala);
    }
  });

  it('o primeiro exemplo é da conversa que acabou de acontecer', () => {
    // É o que separa prova de promessa: a memória aconteceu 30 segundos atrás.
    const i = APP.indexOf('export function Memoria');
    expect(APP.slice(i, i + 2600)).toContain('Agora há pouco');
  });
});

describe('os textos pedidos', () => {
  const PERFIL = readFileSync('components/comecar/screens/perfil.js', 'utf8');
  const APP = readFileSync('components/comecar/screens/app.js', 'utf8');

  it('prazo e temas', () => {
    expect(PERFIL).toContain('Em quanto tempo você quer estar confiante no inglês?');
    expect(PERFIL).toContain('Sobre o que você quer conversar?');
    expect(PERFIL).not.toContain('estar solto?');
    expect(PERFIL).not.toContain('Sobre o que a gente conversa?');
  });

  it('o quarto ponto do plano acende junto com os outros', () => {
    // `dim` num desenho em que aceso quer dizer pronto lia como "isso ainda não
    // acontece" — o contrário do que a tela existe pra dizer.
    expect(APP).not.toContain('knot dim');
    expect(APP).toContain('eu guardo seus gostos, objetivos e o seu jeito!');
    const css = readFileSync('app/comecar/comecar.css', 'utf8');
    expect(css, 'CSS morto descrevendo um desenho que não existe mais').not.toContain('knot.dim');
  });

  it('a tela de conta não repete o pedido duas vezes', () => {
    /* Sem comentários: o comentário de lá CITA o título antigo pra explicar por
       que ele saiu, e um teste que não distingue código de explicação proíbe
       justamente o que faz o código ser legível depois. */
    const codigo = APP.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(codigo).toContain('Crie sua conta agora!');
    expect(codigo, 'o título antigo voltou').not.toContain('Falta só guardar');
    // E o subtítulo que repetia o pedido não está mais lá.
    expect(codigo).not.toMatch(/<Lede style=\{\{ textAlign: 'center' \}\}>Crie sua conta/);
  });
});
