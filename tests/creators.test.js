import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validarCreator, limparCreator, formatarNumero, normalizarInstagram, NICHO_OUTROS, SEGUIDORES } from '../lib/creators';

const ok = { email: 'ana@gmail.com', ddd: '11', telefone: '912345678', instagram: 'ana.cria', seguidores: '1.000 a 10 mil', nichos: ['Viagem'], outro: '' };

describe('Para Creators — validação', () => {
  it('aceita um formulário completo', () => {
    expect(validarCreator(ok)).toEqual({});
  });
  it('tudo obrigatório', () => {
    const e = validarCreator({});
    expect(Object.keys(e).sort()).toEqual(['email', 'instagram', 'nichos', 'seguidores', 'telefone']);
  });
  it('e-mail precisa de @ e domínio', () => {
    expect(validarCreator({ ...ok, email: 'ana.gmail.com' }).email).toBeTruthy();
    expect(validarCreator({ ...ok, email: 'ana@gmail' }).email).toBeTruthy();
  });
  it('telefone: DDD de 2 dígitos e número de 8 ou 9, só números', () => {
    expect(validarCreator({ ...ok, ddd: '1' }).telefone).toBeTruthy();
    expect(validarCreator({ ...ok, ddd: '01' }).telefone).toBeTruthy();
    expect(validarCreator({ ...ok, telefone: '1234567' }).telefone).toBeTruthy();
    expect(validarCreator({ ...ok, telefone: '1234-5678' })).toEqual({});
    expect(limparCreator({ ...ok, telefone: '91234-5678' }).telefone).toBe('912345678');
  });
  it('formata o número pra exibir', () => {
    expect(formatarNumero('912345678')).toBe('91234-5678');
    expect(formatarNumero('12345678')).toBe('1234-5678');
    expect(formatarNumero('91a2')).toBe('912');
  });
  it('instagram sempre com um @ só', () => {
    expect(normalizarInstagram('@@ana')).toBe('@ana');
    expect(validarCreator({ ...ok, instagram: 'ana cria' }).instagram).toBeTruthy();
  });
  it('"Outros" exige o texto', () => {
    expect(validarCreator({ ...ok, nichos: [NICHO_OUTROS] }).nichos).toBeTruthy();
    expect(validarCreator({ ...ok, nichos: [NICHO_OUTROS], outro: 'Culinária' })).toEqual({});
    expect(limparCreator({ ...ok, outro: 'ignorado' }).nicho_outro).toBeNull();
  });
  it('ignora nicho que não está na lista', () => {
    expect(validarCreator({ ...ok, nichos: ['hack'] }).nichos).toBeTruthy();
  });

  it('seguidores: uma das 5 faixas, obrigatória', () => {
    expect(SEGUIDORES).toEqual(['Menos de 1.000', '1.000 a 10 mil', '10 mil a 50 mil', '50 mil a 100 mil', '100 mil ou mais']);
    for (const faixa of SEGUIDORES) expect(validarCreator({ ...ok, seguidores: faixa })).toEqual({});
    expect(validarCreator({ ...ok, seguidores: '' }).seguidores).toBeTruthy();
    expect(validarCreator({ ...ok, seguidores: '1 milhão' }).seguidores).toBeTruthy();
    expect(limparCreator(ok).seguidores).toBe('1.000 a 10 mil');
    expect(limparCreator({ ...ok, seguidores: 'hack' }).seguidores).toBeNull();
  });
  it('o check da migration aceita exatamente as mesmas faixas', () => {
    const sql = readFileSync(new URL('../supabase/migrations/0041_creators_seguidores.sql', import.meta.url), 'utf8');
    for (const faixa of SEGUIDORES) expect(sql).toContain(`'${faixa}'`);
    expect((sql.match(/'[^']+'/g) || []).filter((t) => t !== "'Para Creators'").length).toBe(SEGUIDORES.length);
  });
});
