import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { apiLiberada, ehRotaApi, ROTAS_LIBERADAS } from '../lib/apiAccess.js';

/* Lê as rotas do DISCO, e não de uma lista escrita à mão: um teste que repete a
   lista do código não descobre a rota nova que alguém acabou de criar — e rota
   nova sem portão é exatamente a falha que este arquivo existe pra impedir. */
function rotasDoDisco(dir = 'app/api', prefixo = '/api') {
  const out = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      out.push(...rotasDoDisco(caminho, `${prefixo}/${nome}`));
    } else if (nome === 'route.js') {
      out.push(prefixo);
    }
  }
  return out;
}

const TODAS = rotasDoDisco();

// O que precisa funcionar pra alguém conseguir PAGAR. Barrar qualquer uma
// destas tranca a porta da loja por fora: a pessoa não paga porque não pagou.
const FUNIL = [
  '/api/checkout',
  '/api/checkout/status',
  '/api/onboarding',
  '/api/terms/accept',
];

// Conteúdo pago: cada uma custa dinheiro de verdade (token da Anthropic,
// minuto do ElevenLabs) ou entrega o produto.
const PAGAS = [
  '/api/chat',
  '/api/convai/signed-url',
  '/api/v2/roleplay/start',
  '/api/v2/roleplay/turn',
  '/api/daily',
  '/api/evaluate',
  '/api/review/practice',
  '/api/exercise/submit',
  '/api/weak-training',
  '/api/memory',
  '/api/conversations',
];

describe('portão das rotas de API', () => {
  it('reconhece o que é rota de API', () => {
    expect(ehRotaApi('/api/chat')).toBe(true);
    expect(ehRotaApi('/api')).toBe(true);
    expect(ehRotaApi('/v2/conversar')).toBe(false);
    // O caso que criou o furo: /api/v2/... não começa com /v2.
    expect('/api/v2/roleplay/start'.startsWith('/v2')).toBe(false);
    expect(ehRotaApi('/api/v2/roleplay/start')).toBe(true);
  });

  it('o funil até o pagamento continua aberto', () => {
    for (const r of FUNIL) expect(apiLiberada(r), `${r} precisa passar`).toBe(true);
  });

  it('webhooks e demo público passam', () => {
    expect(apiLiberada('/api/webhooks/abacatepay')).toBe(true);
    expect(apiLiberada('/api/webhooks/kiwify')).toBe(true);
    expect(apiLiberada('/api/demo/chat')).toBe(true);
    expect(apiLiberada('/api/convai/demo-signed-url')).toBe(true);
  });

  it('o conteúdo pago é barrado', () => {
    for (const r of PAGAS) expect(apiLiberada(r), `${r} NÃO podia estar liberada`).toBe(false);
  });

  it('o demo é liberado mas a rota de voz com sessão NÃO', () => {
    // Um caractere de diferença entre a que é pública e a que queima minuto.
    expect(apiLiberada('/api/convai/demo-signed-url')).toBe(true);
    expect(apiLiberada('/api/convai/signed-url')).toBe(false);
  });

  it('rota nova nasce fechada', () => {
    expect(apiLiberada('/api/inventada-ontem')).toBe(false);
    expect(apiLiberada('/api/v2/qualquer-coisa')).toBe(false);
  });

  it('prefixo não vaza pra irmão de nome parecido', () => {
    // '/api/demo/' com barra: '/api/demonstracao' não pode passar de carona.
    expect(apiLiberada('/api/demonstracao')).toBe(false);
    expect(apiLiberada('/api/webhooksfalso')).toBe(false);
  });

  it('/api/claude não existe mais', () => {
    // Era pública, sem sessão nenhuma, e queimava a chave da Anthropic de quem
    // passasse na URL. Não tinha um único chamador no repo.
    expect(TODAS).not.toContain('/api/claude');
  });

  it('toda exceção da lista corresponde a uma rota que existe', () => {
    // Pega entrada que sobrou de rota renomeada ou removida: exceção órfã é um
    // buraco esperando a rota voltar com outro propósito.
    for (const r of ROTAS_LIBERADAS) {
      expect(TODAS, `${r} está liberada mas não existe`).toContain(r);
    }
  });

  it('a esmagadora maioria das rotas está protegida', () => {
    const abertas = TODAS.filter(apiLiberada);
    expect(TODAS.length).toBeGreaterThan(40);
    // Se um dia isso disparar, alguém liberou demais.
    expect(abertas.length).toBeLessThanOrEqual(12);
  });
});
