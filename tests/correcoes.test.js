import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { filtrarNovos, transcricaoEmTexto, chaveDoTermo, CATEGORIAS, MAX_POR_CONVERSA } from '../lib/correcoes.js';
import { MEMORY_CAP } from '../lib/memory.js';
import { ORCAMENTO } from '../lib/retomada.js';

/* A CORREÇÃO SAIU DE DENTRO DO TURNO.

   A Cady chamava o `save_to_review` sozinha a cada correção. Uma chamada de
   ferramenta obriga o modelo a um passo a mais ANTES de falar, e isso acontecia
   justamente nos turnos de correção — a hora em que a conversa mais precisa
   fluir era a hora em que ela engasgava.

   Agora a extração é depois, da transcrição inteira. O que estes testes seguram
   é a parte que some em silêncio se alguém mexer: o card duplicado. Um extrator
   que roda a cada conversa, sem deduplicar, transforma a aba Revisão num
   depósito do mesmo erro repetido — e ninguém revisa um depósito. */

describe('nada entra duas vezes na Revisão', () => {
  it('o que já está na lista não volta', () => {
    const novos = filtrarNovos(
      [{ term: 'I went', example: 'I went there.', note: 'passado', category: 'correction' }],
      ['I went'],
    );
    expect(novos).toHaveLength(0);
  });

  it('a comparação ignora caixa, pontuação e espaço sobrando', () => {
    // "I went." e "i  went" são o mesmo card. Sem normalizar, viram três.
    expect(chaveDoTermo('  I Went.  ')).toBe(chaveDoTermo('i went'));
    const novos = filtrarNovos([{ term: '"I went!"', example: 'x', note: 'y', category: 'correction' }], ['i went']);
    expect(novos).toHaveLength(0);
  });

  it('duplicata DENTRO da mesma resposta também é cortada', () => {
    const novos = filtrarNovos([
      { term: 'used to', example: 'I used to run.', note: 'hábito no passado', category: 'phrase' },
      { term: 'Used to', example: 'She used to sing.', note: 'de novo', category: 'phrase' },
    ], []);
    expect(novos).toHaveLength(1);
  });

  it('tem teto por conversa', () => {
    // Uma aula longa de iniciante despeja trinta cards de uma vez, e a Revisão
    // deixa de ser uma lista e vira castigo.
    const muitos = Array.from({ length: 30 }, (_, i) => ({ term: `termo ${i}`, example: 'x', note: 'y', category: 'word' }));
    expect(filtrarNovos(muitos, [])).toHaveLength(MAX_POR_CONVERSA);
  });

  it('descarta item sem termo e normaliza categoria desconhecida', () => {
    const novos = filtrarNovos([
      { term: '   ', example: 'x', note: 'y', category: 'correction' },
      { term: 'break a leg', example: 'Break a leg!', note: 'boa sorte', category: 'inventada' },
    ], []);
    expect(novos).toHaveLength(1);
    expect(CATEGORIAS).toContain(novos[0].category);
  });
});

describe('a transcrição que vai pro extrator', () => {
  it('marca quem falou o quê', () => {
    const t = transcricaoEmTexto([
      { role: 'you', text: 'I go yesterday' },
      { role: 'coach', text: "It's 'I went'." },
    ]);
    expect(t).toBe("Student: I go yesterday\nTeacher: It's 'I went'.");
  });

  it('numa conversa longa, fica com o FIM', () => {
    // O trecho recente é o que ainda não virou card.
    const muitas = Array.from({ length: 500 }, (_, i) => ({ role: 'you', text: `fala ${i}` }));
    const t = transcricaoEmTexto(muitas, 300);
    expect(t.length).toBeLessThanOrEqual(300);
    expect(t).toContain('fala 499');
    expect(t).not.toContain('fala 0\n');
  });

  it('ignora mensagem sem texto em vez de quebrar', () => {
    expect(transcricaoEmTexto([{ role: 'you' }, null, { role: 'coach', text: 'hi' }])).toBe('Teacher: hi');
    expect(transcricaoEmTexto(null)).toBe('');
  });
});

describe('o que a conversa manda pro agente encolheu', () => {
  /* Estes números são custo POR TURNO: o bloco inteiro é reenviado a cada fala.
     Um teste aqui não é preciosismo — é o que impede alguém de "só aumentar um
     pouquinho" sem ver que está pagando isso em toda frase da conversa. */
  it('a memória cabe em 20 fatos', () => {
    expect(MEMORY_CAP).toBe(20);
  });

  it('o contexto de retomada cabe em 3.000 caracteres', () => {
    expect(ORCAMENTO).toBe(3000);
  });

  it('o system prompt documentado perdeu a auto-captura e ganhou a proibição', () => {
    const doc = readFileSync('docs/elevenlabs-agent-setup.md', 'utf8');
    const i = doc.indexOf('## System prompt (Cady)');
    const prompt = doc.slice(doc.indexOf('```', i) + 3, doc.indexOf('```', doc.indexOf('```', i) + 3));
    expect(prompt).not.toMatch(/Automatically: whenever you make a REAL correction/);
    expect(prompt).toContain('Do NOT call any tool to save your corrections');
    expect(prompt, 'o salvar POR PEDIDO continua').toContain('save_to_review');
    // Continua cabendo o que o app injeta.
    for (const v of ['{{user_name}}', '{{user_memory}}', '{{prior_context}}', '{{unit_title}}', '{{unit_focus}}', '{{unit_context}}', '{{unit_drill}}']) {
      expect(prompt, `${v} sumiu do prompt`).toContain(v);
    }
    // E continua proibindo encerrar a conversa aberta sozinha.
    expect(prompt).toMatch(/NEVER end the call yourself/);
    expect(prompt).toMatch(/if "Lesson:" below says NONE/);
  });

  it('o prompt encolheu de verdade', () => {
    const doc = readFileSync('docs/elevenlabs-agent-setup.md', 'utf8');
    const i = doc.indexOf('## System prompt (Cady)');
    const prompt = doc.slice(doc.indexOf('```', i) + 3, doc.indexOf('```', doc.indexOf('```', i) + 3));
    expect(prompt.length).toBeLessThan(6200);   // era 7.431 + 739 do bloco separado
  });
});

describe('quem chama a extração', () => {
  const FONTE = readFileSync('components/v2/ConversationClient.js', 'utf8');
  it('roda ao ENCERRAR, não durante', () => {
    expect(FONTE).toContain("fetch('/api/review/extract'");
    const i = FONTE.indexOf("fetch('/api/review/extract'");
    expect(FONTE.slice(0, i), 'tem que estar dentro do onDisconnect').toContain('onDisconnect: (detalhes) => {');
  });

  it('não roda em revisão — ali os cards já existem', () => {
    expect(FONTE).toMatch(/if \(!isReview && messages\.length >= 4\)/);
  });
});
