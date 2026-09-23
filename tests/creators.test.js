import { describe, it, expect } from 'vitest';
import { validarCreator, limparCreator, formatarNumero, normalizarInstagram, NICHO_OUTROS } from '../lib/creators';

const ok = { email: 'ana@gmail.com', ddd: '11', telefone: '912345678', instagram: 'ana.cria', nichos: ['Viagem'], outro: '' };

describe('Para Creators — validação', () => {
  it('aceita um formulário completo', () => {
    expect(validarCreator(ok)).toEqual({});
  });
  it('tudo obrigatório', () => {
    const e = validarCreator({});
    expect(Object.keys(e).sort()).toEqual(['email', 'instagram', 'nichos', 'telefone']);
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
});
