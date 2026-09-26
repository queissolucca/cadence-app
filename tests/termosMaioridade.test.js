import { describe, it, expect } from 'vitest';
import { TERMS_CLAUSES, TERMS_CLOSING, TERMS_VERSION } from '../lib/terms.js';

/* SÓ MAIORES DE 18, E SEM BRECHA.

   O texto antigo dizia "destina-se a maiores de 18 anos" e, na mesma frase,
   "menores devem utilizá-lo sob supervisão e consentimento de responsável
   legal". A segunda metade desfazia a primeira: com um responsável de acordo,
   o menor estava liberado. O pedido foi o oposto — uma cláusula clara dizendo
   que o serviço é só pra maiores de 18.

   O que estes testes seguram é o que volta em silêncio numa revisão futura
   do texto jurídico: a exceção do "menor com supervisão" reaparecendo, a
   regra sendo rebaixada de novo a subitem perdido no meio do cadastro, e a
   renumeração desalinhando os subitens "N.1." do número da cláusula. */

const texto = (c) => `${c.title} ${c.body}`;
const idade = TERMS_CLAUSES.find((c) => /18 anos/.test(c.title));

describe('a idade mínima é cláusula própria', () => {
  it('existe uma cláusula com a regra dos 18 anos no próprio título', () => {
    // No título, não só no corpo: na página /termos só o título é negrito,
    // e é o que quem passa o olho lê.
    expect(idade).toBeTruthy();
    expect(idade.title).toMatch(/exclusiv|somente|apenas/i);
  });

  it('diz "exclusivamente" e veda o uso por menores', () => {
    expect(idade.body).toMatch(/exclusivamente a pessoas com 18 \(dezoito\) anos completos ou mais/);
    expect(idade.body).toMatch(/vedado o cadastro, a contratação e a utilização do Serviço por menores de 18 anos/);
  });

  it('fecha nominalmente a porta do responsável legal', () => {
    // Proibição que não nomeia a exceção deixa a exceção de pé: o texto antigo
    // liberava o menor "sob supervisão e consentimento de responsável legal".
    expect(idade.body).toMatch(/ainda que com autorização, supervisão ou consentimento de pais ou responsáveis legais/);
  });

  it('o usuário declara ter 18 anos ao usar', () => {
    expect(idade.body).toMatch(/declara ter 18 anos completos ou mais/);
  });

  it('vem antes do cadastro e do pagamento', () => {
    // É condição pra usar: se vier depois do cadastro, volta a parecer
    // detalhe do cadastro — que foi exatamente o problema do antigo 2.3.
    const pos = (re) => TERMS_CLAUSES.findIndex((c) => re.test(c.title));
    expect(pos(/18 anos/)).toBeGreaterThan(-1);
    expect(pos(/18 anos/)).toBeLessThan(pos(/^Cadastro/));
    expect(pos(/18 anos/)).toBeLessThan(pos(/^Pagamento/));
  });
});

describe('nenhuma outra cláusula libera o menor', () => {
  it('não sobrou o "menores devem utilizá-lo sob supervisão"', () => {
    for (const c of TERMS_CLAUSES) {
      expect(texto(c)).not.toMatch(/menores devem/i);
      expect(texto(c)).not.toMatch(/sob supervisão e consentimento/i);
    }
  });

  it('a idade aparece numa cláusula só', () => {
    // Duas cláusulas falando de idade é como o texto antigo nasceu
    // contraditório: uma regra e, em outro canto, a exceção.
    const falamDeIdade = TERMS_CLAUSES.filter((c) => /18 anos|menores? de idade|menores de 18/i.test(texto(c)));
    expect(falamDeIdade).toHaveLength(1);
  });

  it('o fecho, colado na caixa de aceite, repete a declaração de idade', () => {
    expect(TERMS_CLOSING).toMatch(/declara ter 18 anos completos ou mais/);
  });
});

describe('a renumeração não desalinhou nada', () => {
  it('as cláusulas vão de 1 a N, sem pular nem repetir', () => {
    expect(TERMS_CLAUSES.map((c) => c.n)).toEqual(TERMS_CLAUSES.map((_, i) => i + 1));
  });

  it('todo subitem "N.x." do corpo usa o número da própria cláusula, em sequência', () => {
    // Inserir a cláusula 2 empurrou todas em uma casa; o "5.1." do pagamento
    // tinha que virar "6.1.". Um subitem esquecido com o número velho aponta
    // pra cláusula errada — num texto jurídico, isso é outra regra.
    for (const c of TERMS_CLAUSES) {
      const subitens = [...c.body.matchAll(/(?:^|\s)(\d+)\.(\d+)\.\s/g)];
      subitens.forEach((m, i) => {
        expect(Number(m[1]), `cláusula ${c.n}, subitem "${m[0].trim()}"`).toBe(c.n);
        expect(Number(m[2]), `cláusula ${c.n}, subitem "${m[0].trim()}"`).toBe(i + 1);
      });
    }
  });
});

describe('a versão dos Termos mudou junto', () => {
  it('não é mais a de 2026-09-02, que ainda aceitava menor com supervisão', () => {
    // O aceite é gravado com TERMS_VERSION (tabela terms_acceptance). Sem o
    // bump, quem aceitar agora ficaria registrado como tendo aceito o texto
    // que liberava o menor — o registro deixaria de refletir o que foi lido.
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TERMS_VERSION > '2026-09-02').toBe(true);
  });
});
