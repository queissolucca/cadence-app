import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { idDoAgente, VOZES, VOZ_PADRAO } from '../lib/agentesVoz.js';
import { AGENTS } from '../lib/track/sessionOptions.js';

/* QUAL AGENTE DO ELEVENLABS ABRE, E QUEM DECIDE ISSO.

   O jeito óbvio de suportar duas vozes seria o cliente mandar o `agent_id` e a
   rota repassar. Isso custaria dinheiro: qualquer pessoa logada abriria
   QUALQUER agente da conta do ElevenLabs — inclusive os que não são deste
   produto — com um parâmetro de query, e cada minuto de conversa é cobrado.

   Então o contrato é: o cliente manda uma CHAVE curta, o servidor traduz, e o
   que não está na lista não existe. Estes testes seguram as duas metades —
   a tradução e o fato de que ela é fechada. */

const guardado = { ...process.env };
beforeEach(() => { process.env.ELEVENLABS_AGENT_ID = 'agent_da_cady'; });
afterEach(() => { process.env = { ...guardado }; });

describe('tradução de voz para agente', () => {
  it('cada voz da galeria tem uma tradução no servidor', () => {
    for (const a of AGENTS) {
      expect(VOZES[a.id], `a voz "${a.name}" (${a.id}) não tem id de agente`).toBeTypeOf('function');
    }
  });

  it('a Cady vem da variável de ambiente, sem literal duplicado', () => {
    expect(idDoAgente('cadi')).toBe('agent_da_cady');
    // O valor não pode estar escrito no código: duplicado em dois lugares, eles
    // divergem no primeiro dia em que alguém troca o agente pelo painel.
    const fonte = readFileSync('lib/agentesVoz.js', 'utf8');
    expect(fonte).not.toContain('agent_da_cady');
    expect(fonte).toContain('ELEVENLABS_AGENT_ID');
  });

  it('a Cady Tranquila funciona sem env var, e a env var ganha quando existe', () => {
    delete process.env.ELEVENLABS_AGENT_ID_TRANQUILA;
    expect(idDoAgente('tranquila')).toBe('agent_4301m2725r6aey2swh592r0ked0j');
    process.env.ELEVENLABS_AGENT_ID_TRANQUILA = 'agent_trocado_no_painel';
    expect(idDoAgente('tranquila'), 'a env var tem que vencer o literal').toBe('agent_trocado_no_painel');
  });

  /* A parte que protege a conta. Uma chave desconhecida não pode virar um
     agente — nem o que veio no parâmetro, nem um erro que revele algo. */
  it('chave desconhecida cai na voz padrão, nunca no que o cliente pediu', () => {
    expect(idDoAgente('agent_de_outra_pessoa')).toBe('agent_da_cady');
    expect(idDoAgente('../../etc/passwd')).toBe('agent_da_cady');
    expect(idDoAgente(null)).toBe('agent_da_cady');
    expect(idDoAgente(undefined)).toBe('agent_da_cady');
    expect(idDoAgente('')).toBe('agent_da_cady');
    expect(VOZ_PADRAO).toBe('cadi');
  });

  it('sem ambiente configurado devolve null, e não uma string vazia', () => {
    delete process.env.ELEVENLABS_AGENT_ID;
    // null é o que faz a rota responder 503 "não configurado" — string vazia
    // passaria batido e abriria uma URL de agente sem id.
    expect(idDoAgente('cadi')).toBeNull();
    process.env.ELEVENLABS_AGENT_ID = '   ';
    expect(idDoAgente('cadi')).toBeNull();
  });
});

describe('a rota não aceita id vindo do cliente', () => {
  const ROTA = readFileSync('app/api/convai/signed-url/route.js', 'utf8');

  it('lê a chave `agente`, e o id só sai do lib/agentesVoz', () => {
    expect(ROTA).toContain("searchParams.get('agente')");
    expect(ROTA).toContain('idDoAgente(');
    // Nada de pegar agent_id do cliente.
    expect(ROTA).not.toMatch(/searchParams\.get\(['"]agent_?id['"]\)/i);
  });

  it('o id do agente não aparece em nenhum arquivo de cliente', () => {
    // sessionOptions é importado por componente de cliente — só metadado.
    const cliente = readFileSync('lib/track/sessionOptions.js', 'utf8');
    expect(cliente).not.toMatch(/agent_[a-z0-9]{20,}/i);
    expect(cliente).not.toContain('ELEVENLABS_AGENT_ID');
  });
});

describe('a galeria mostra as duas vozes', () => {
  it('Cady e Cady Tranquila, cada uma com papel e cor próprios', () => {
    expect(AGENTS).toHaveLength(2);
    const [cady, soft] = AGENTS;
    expect(cady.name).toBe('Cady');
    expect(soft.name).toBe('Cady Tranquila');
    expect(soft.role).toBe('The Soft English Teacher');
    // Cores diferentes: o quadradinho da galeria é o que distingue as duas de
    // relance, antes de alguém ler o nome.
    expect(soft.accent).not.toBe(cady.accent);
    for (const a of AGENTS) expect(a.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
