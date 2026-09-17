import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Conta nova tem que abrir no padrão — e as TRÊS pontas têm que concordar.

   O bug original era silencioso porque o código parecia certo: o provider
   dizia um padrão, o ThemeSync comentava outro, e quem de fato decidia era o
   default da coluna, que ninguém lia. Não importa QUAL é o valor escolhido;
   importa que provider, ThemeSync e banco digam a MESMA coisa. É isso que
   estes testes travam — por isso seguiram valendo quando o padrão virou
   escuro (0036) e de novo quando voltou pro claro (0037). */

/* fileURLToPath e não `.pathname`: o pathname de uma file:// URL vem
   percent-encoded, então a pasta deste projeto ("0. Projects/0. Cadence Nova")
   chegava como "0.%20Projects" e o readdirSync abaixo estourava ENOENT. O teste
   falhava por causa do espaço no caminho, não por causa do que ele afirma. */
const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const migrations = readdirSync(join(raiz, 'supabase/migrations')).sort();
const todasAsMigrations = migrations.map((f) => ler(join('supabase/migrations', f))).join('\n');

/* O padrão sai da ÚLTIMA migration que mexe nele, e não de um valor escrito à
   mão aqui: assim virar o tema de novo é uma migration só, e não uma migration
   mais uma caça a valores espalhados pelos testes. */
const PADRAO = [...todasAsMigrations.matchAll(/column theme[\s\S]{0,80}?default '(\w+)'/g)].map((m) => m[1]).at(-1);

describe('o padrão vem do banco', () => {
  it(`a coluna theme tem default ${PADRAO}`, () => {
    // A última definição de default que aparece nas migrations, em ordem, é a
    // que vale — foi 'light' na 0005 até a 0036 mudar.
    const defaults = [...todasAsMigrations.matchAll(/column theme[\s\S]{0,80}?default '(\w+)'/g)].map((m) => m[1]);
    expect(defaults.length, 'nenhuma migration define o default de theme').toBeGreaterThan(0);
    expect(defaults.at(-1), `defaults encontrados, em ordem: ${defaults.join(' -> ')}`).toBe(PADRAO);
  });

  it('o trigger que cria o perfil passa o tema explicitamente', () => {
    // Sem isto, o comportamento depende de um default invisível pra quem lê a
    // função — foi o que escondeu o bug por tanto tempo.
    const ultimo = todasAsMigrations.lastIndexOf('function public.handle_new_user');
    const fn = todasAsMigrations.slice(ultimo, ultimo + 700);
    expect(fn).toMatch(/insert into public\.profiles \([^)]*\btheme\b/);
    expect(fn).toMatch(new RegExp(`'${PADRAO}'`));
  });

  it('não vira o tema de quem já existe', () => {
    // 'light' antigo pode ser o default velho OU uma escolha real em Ajustes —
    // idênticos no banco. Um UPDATE em massa tiraria a preferência de alguém.
    const m036 = ler('supabase/migrations/0036_tema_escuro_padrao.sql');
    const executavel = m036.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(executavel).not.toMatch(/update\s+public\.profiles/i);
  });
});

describe('o cliente obedece o que está gravado', () => {
  const sync = ler('components/v2/ThemeSync.js');

  const OUTRO = PADRAO === 'light' ? 'dark' : 'light';

  it(`só '${OUTRO}' gravado foge do padrão; o resto cai no ${PADRAO}`, () => {
    // \\? e não \?: num template literal `\?` vira um "?" puro, que o regex lê
    // como quantificador do espaço anterior — e aí o teste falha com o código
    // certo na frente.
    expect(sync).toMatch(new RegExp(`profileTheme === '${OUTRO}' \\? '${OUTRO}' : '${PADRAO}'`));
  });

  it(`o provider abre no ${PADRAO} enquanto o valor do banco não chega`, () => {
    // Discordar aqui faz a tela abrir de um jeito e virar meio segundo depois.
    expect(ler('components/v2/ThemeProviderV2.js')).toMatch(new RegExp(`defaultTheme="${PADRAO}"`));
  });
});
