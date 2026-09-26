import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TERMS_CLAUSES, TERMS_CLOSING, TERMS_VERSION } from '../lib/terms.js';
import { lerFonte, RAIZ } from './fonte.js';

/* TERMOS: SÓ PARA MAIORES DE 18.

   A cláusula antiga (2.3, dentro do Cadastro) dizia "destina-se a maiores de
   18 anos" e, na mesma frase, liberava o menor "sob supervisão e consentimento
   de responsável legal". Uma regra com a porta aberta do lado. O dono pediu o
   contrário: cláusula clara, só 18+, sem exceção.

   Estes testes importam lib/terms.js de verdade (é JS puro, sem JSX) em vez de
   ler o fonte: o que importa é o texto que a página /termos renderiza, e o
   cabeçalho do arquivo CITA a frase antiga de propósito, pra explicar a troca —
   ler o fonte faria o "não existe mais sob supervisão" falhar com o texto
   certo publicado. */

const idade = TERMS_CLAUSES.find((c) => /18 anos/.test(c.title));

/* Recorta UMA tela de um arquivo com várias: de `export function <nome>(`
   até o próximo `export` de nível de topo (ou o fim do arquivo). Não amarra
   em qual tela vem depois, então reordenar as telas não quebra o recorte. */
const tela = (caminho, nome) => {
  const fonte = lerFonte(caminho);
  const ini = fonte.indexOf(`export function ${nome}(`);
  if (ini < 0) return '';
  const prox = fonte.indexOf('\nexport ', ini + 1);
  return fonte.slice(ini, prox < 0 ? undefined : prox);
};

describe('a cláusula de idade mínima', () => {
  it('existe, com "18 anos" no título', () => {
    expect(idade, 'nenhuma cláusula tem "18 anos" no título').toBeTruthy();
    expect(idade.title).toMatch(/maiores de 18 anos/);
  });

  it('vem logo depois da Aceitação e antes do Cadastro — é condição de acesso', () => {
    const titulos = TERMS_CLAUSES.map((c) => c.title);
    const iAceite = titulos.indexOf('Aceitação dos Termos');
    const iIdade = TERMS_CLAUSES.indexOf(idade);
    const iCadastro = titulos.findIndex((t) => /^Cadastro/.test(t));
    expect(iAceite).toBe(0);
    expect(iIdade).toBe(iAceite + 1);
    expect(iCadastro).toBeGreaterThan(iIdade);
  });

  it('diz "exclusivamente" 18 anos completos ou mais', () => {
    expect(idade.body).toMatch(/exclusivamente a pessoas com 18 \(dezoito\) anos completos ou mais/);
  });

  it('proíbe o menor MESMO com autorização ou supervisão do responsável', () => {
    // A exceção que existia é justamente a que a cláusula nova tem que negar
    // por escrito: vedado, "ainda que com" supervisão/consentimento.
    expect(idade.body).toMatch(/[ÉE] vedado o cadastro e a utiliza[çc][ãa]o do Servi[çc]o por menores de 18/);
    expect(idade.body).toMatch(/ainda que com [^.]*supervis[ãa]o[^.]*respons[áa]vel legal/);
  });

  it('o cadastro carrega a declaração de maioridade e de veracidade', () => {
    expect(idade.body).toMatch(/Ao se cadastrar, o Usu[áa]rio declara ter 18 \(dezoito\) anos completos ou mais/);
    expect(idade.body).toMatch(/verdadeira/);
  });

  it('a Empresa pode suspender/encerrar a conta de menor e excluir os dados pela LGPD', () => {
    expect(idade.body).toMatch(/ind[íi]cios/);
    expect(idade.body).toMatch(/suspender ou encerrar a conta/);
    expect(idade.body).toMatch(/excluir os dados pessoais/);
    expect(idade.body).toMatch(/LGPD/);
  });
});

describe('a exceção antiga saiu de todo o texto publicado', () => {
  const tudo = [...TERMS_CLAUSES.flatMap((c) => [c.title, c.body]), TERMS_CLOSING].join('\n');

  it('não existe mais "sob supervisão" nem "menores devem"', () => {
    expect(tudo).not.toMatch(/sob supervis[ãa]o/i);
    expect(tudo).not.toMatch(/menores devem/i);
  });

  it('só UMA cláusula fala de idade — sem regra duplicada que possa divergir', () => {
    const falamDeIdade = TERMS_CLAUSES.filter((c) => /18 anos|18 \(dezoito\)|menores? de/.test(c.body));
    expect(falamDeIdade.map((c) => c.n)).toEqual([idade.n]);
  });
});

describe('numeração', () => {
  it('as cláusulas vão de 1 a N, em ordem, sem buraco nem repetição', () => {
    const ns = TERMS_CLAUSES.map((c) => c.n);
    expect(ns).toEqual(ns.map((_, i) => i + 1));
  });

  it('as subnumerações internas ("3.1.", "6.2."…) batem com o número da cláusula e são sequenciais', () => {
    // Renumerar a cláusula e esquecer o corpo é o erro clássico: o título diz
    // "6." e o corpo segue dizendo "5.1.". `\s` depois do ponto final evita
    // casar "13.709/2018" (a Lei da LGPD), que não é subnumeração.
    for (const c of TERMS_CLAUSES) {
      const subs = [...c.body.matchAll(/(?:^|\s)(\d+)\.(\d+)\.\s/g)].map((m) => [Number(m[1]), Number(m[2])]);
      for (const [maior] of subs) {
        expect(maior, `cláusula ${c.n} ("${c.title}") tem subitem ${maior}.x`).toBe(c.n);
      }
      expect(subs.map(([, menor]) => menor), `subitens da cláusula ${c.n}`).toEqual(subs.map((_, i) => i + 1));
    }
  });

  it('a cláusula de idade tem os quatro itens (2.1 a 2.4)', () => {
    const subs = [...idade.body.matchAll(/(?:^|\s)(\d+)\.(\d+)\.\s/g)].map((m) => `${m[1]}.${m[2]}`);
    expect(subs).toEqual([1, 2, 3, 4].map((i) => `${idade.n}.${i}`));
  });
});

describe('o aceite declara a maioridade', () => {
  it('TERMS_CLOSING junta a declaração de 18+ ao consentimento', () => {
    expect(TERMS_CLOSING).toMatch(/consentimento livre, informado e inequ[íi]voco/);
    expect(TERMS_CLOSING).toMatch(/declara ter 18 \(dezoito\) anos completos ou mais/);
  });

  it('a caixinha do cadastro (/comecar) diz "Declaro ter 18 anos ou mais" na MESMA label do aceite', () => {
    const conta = tela('components/comecar/screens/app.js', 'Conta');
    expect(conta).toMatch(/<label className=\{`termos[^>]*>[\s\S]*?Declaro ter 18 anos ou mais e aceito os <a href="\/termos"[\s\S]*?<\/label>/);
  });

  it('sem caixinha nova: o cadastro continua com UM checkbox, o mesmo `aceito`', () => {
    // Pedido do dono: não quebrar o funil. A declaração entrou no texto da
    // caixinha que já existia; nenhuma condição nova pro "criar conta".
    //
    // Conta SÓ dentro da tela Conta. A primeira versão contava o arquivo
    // inteiro — e screens/app.js tem treze telas (lição, plano, paywall,
    // login, home…). Um "lembrar de mim" no Login derrubaria este teste com
    // uma mensagem falsa sobre o funil de cadastro, com a Conta intacta.
    const conta = tela('components/comecar/screens/app.js', 'Conta');
    expect(conta.match(/type="checkbox"/g) || []).toHaveLength(1);
    expect(conta).toMatch(/checked=\{aceito\}/);
  });

  it('o recorte da tela Conta pega a caixinha e para antes da tela seguinte', () => {
    // Guarda do próprio recorte: se `tela()` devolvesse o arquivo até o fim
    // (ou nada), o teste de cima passaria ou cairia pelo motivo errado.
    const conta = tela('components/comecar/screens/app.js', 'Conta');
    expect(conta).toMatch(/^export function Conta\(/);
    expect(conta).toMatch(/Declaro ter 18 anos ou mais/);
    expect(conta).not.toMatch(/\nexport /);
  });
});

/* OS OUTROS CAMINHOS QUE CRIAM CONTA.

   "Continuar com o Google" no /login e na tela Login do /comecar serve pra
   quem já tem conta — mas pro Supabase um e-mail Google novo vira conta nova
   na hora, e o /auth/callback manda direto pro /v2. Esse caminho nunca passou
   pela caixinha da tela Conta, então a pessoa ganhava conta sem ter declarado
   18+ em lugar nenhum.

   O conserto é SÓ TEXTO (AvisoTermos, em components/comecar/shell.js): uma
   linha dizendo que continuar é declarar 18+ e aceitar os termos. Caixinha ou
   portão aqui cobraria uma condição nova de todo mundo que volta pro app —
   isso é decisão do dono, e estes testes também travam que ela não entrou
   escondida. */
describe('as telas de entrar avisam que continuar é declarar 18+', () => {
  const aviso = lerFonte('components/comecar/shell.js');
  const login = lerFonte('app/login/page.js');
  const loginComecar = tela('components/comecar/screens/app.js', 'Login');

  it('o aviso diz 18 anos ou mais e leva aos termos e à política de privacidade', () => {
    const corpo = aviso.slice(aviso.indexOf('export const AvisoTermos'));
    expect(corpo).toMatch(/^export const AvisoTermos/);
    expect(corpo).toMatch(/Ao continuar, voc[êe] declara ter 18 anos ou mais e aceita os/);
    expect(corpo).toMatch(/href="\/termos"/);
    expect(corpo).toMatch(/href="\/privacy"/);
  });

  it('o /login mostra o aviso no modo entrar (onde está o botão do Google)', () => {
    expect(login).toMatch(/import \{[^}]*\bAvisoTermos\b[^}]*\} from '..\/..\/components\/comecar\/shell'/);
    expect(login).toMatch(/\{!recuperando && <AvisoTermos \/>\}/);
  });

  it('a tela Login do /comecar mostra o aviso', () => {
    expect(loginComecar).toMatch(/entrarComGoogleExistente/);
    expect(loginComecar).toMatch(/<AvisoTermos \/>/);
  });

  it('é aviso, não portão: nenhuma caixinha nem aceite novo pra entrar', () => {
    for (const fonte of [login, loginComecar, aviso]) {
      expect(fonte).not.toMatch(/type="checkbox"/);
    }
    for (const fonte of [login, loginComecar]) {
      expect(fonte).not.toMatch(/exigirAceite|setAceito/);
    }
  });
});

/* O /onboarding ANTIGO AINDA ABRE.

   Ele saiu do funil, e o middleware manda embora quem cai nele — mas só
   quando consegue decidir o passo. Se a leitura do banco falha, nextStep()
   devolve undefined e a pessoa fica onde está: a tela aparece inteira, com o
   aceite. Um comentário da primeira versão deste ajuste dizia que ela era
   sempre "expulsa"; não é, e por isso a caixinha de lá também tem que
   declarar 18+. */
describe('o aceite do /onboarding antigo', () => {
  it('a página ainda pode abrir: é tela de passo e fica quando o middleware não decide', () => {
    const middleware = lerFonte('middleware.js');
    const funil = lerFonte('lib/funil.js');
    expect(funil).toMatch(/TELAS_DE_PASSO = \[[^\]]*'\/onboarding'/);
    expect(middleware).toMatch(/if \(step === undefined\) return response;/);
  });

  it('por isso a caixinha de lá também declara 18+', () => {
    const onboarding = lerFonte('components/v2/OnboardingClient.js');
    expect(onboarding).toMatch(/Li e aceito os[\s\S]{0,400}e declaro ter 18 anos ou mais\./);
  });
});

describe('TERMS_VERSION', () => {
  it('é uma data AAAA-MM-DD e foi trocada junto com a cláusula nova', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TERMS_VERSION >= '2026-09-26').toBe(true);
  });

  /* O comentário do TERMS_VERSION afirma que trocar a versão NÃO força
     ninguém a reaceitar, porque nada lê terms_acceptance de volta. Foi isso
     que deixou trocar a versão com segurança. Se um dia aparecer um portão de
     reaceite (um select nessa tabela em middleware, página ou rota), este
     teste cai de propósito: a partir daí, cada bump de versão trava TODO
     usuário existente, e o comentário — e a decisão — têm que mudar junto. */
  it('nada no app LÊ terms_acceptance (o bump não trava quem já tem conta)', () => {
    const arquivos = [];
    const andar = (dir) => {
      for (const nome of readdirSync(dir)) {
        const p = join(dir, nome);
        if (statSync(p).isDirectory()) andar(p);
        else if (/\.(js|jsx|ts|tsx)$/.test(nome)) arquivos.push(p);
      }
    };
    for (const d of ['app', 'lib', 'components']) andar(join(RAIZ, d));
    arquivos.push(join(RAIZ, 'middleware.js'));

    // Tira também as linhas que são SÓ comentário de linha: o cabeçalho de
    // lib/terms.js explica esta tabela em `//`, e explicar não é ler. Linha
    // inteira, e não `//` em qualquer lugar — ver o aviso em tests/fonte.js.
    const semLinhasDeComentario = (t) => t.replace(/^\s*\/\/.*$/gm, '');
    const tocam = arquivos
      .map((p) => relative(RAIZ, p))
      .filter((p) => semLinhasDeComentario(lerFonte(p)).includes('terms_acceptance'));
    expect(tocam).toEqual(['app/api/terms/accept/route.js']);

    const rota = lerFonte('app/api/terms/accept/route.js');
    expect(rota).toMatch(/\.upsert\(/);
    expect(rota).not.toMatch(/\.select\(/);
  });
});
