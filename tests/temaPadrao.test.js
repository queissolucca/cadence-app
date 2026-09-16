import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Conta nova tem que abrir no ESCURO.

   O bug era silencioso porque o código parecia certo: ThemeProviderV2 usa
   defaultTheme="dark" e o ThemeSync comentava "default é escuro". Só que
   profiles.theme foi criada como `not null default 'light'` e o trigger
   handle_new_user() não passa theme — então todo perfil novo nascia com
   'light' GRAVADO, que o ThemeSync corretamente obedecia. Dois comentários
   afirmando um padrão que o banco desmentia. */

/* fileURLToPath e não `.pathname`: o pathname de uma file:// URL vem
   percent-encoded, então a pasta deste projeto ("0. Projects/0. Cadence Nova")
   chegava como "0.%20Projects" e o readdirSync abaixo estourava ENOENT. O teste
   falhava por causa do espaço no caminho, não por causa do que ele afirma. */
const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const migrations = readdirSync(join(raiz, 'supabase/migrations')).sort();
const todasAsMigrations = migrations.map((f) => ler(join('supabase/migrations', f))).join('\n');

describe('o padrão vem do banco', () => {
  it('a coluna theme tem default dark', () => {
    // A última definição de default que aparece nas migrations, em ordem, é a
    // que vale — foi 'light' na 0005 até a 0036 mudar.
    const defaults = [...todasAsMigrations.matchAll(/column theme[\s\S]{0,80}?default '(\w+)'/g)].map((m) => m[1]);
    expect(defaults.length, 'nenhuma migration define o default de theme').toBeGreaterThan(0);
    expect(defaults.at(-1), `defaults encontrados, em ordem: ${defaults.join(' -> ')}`).toBe('dark');
  });

  it('o trigger que cria o perfil passa o tema explicitamente', () => {
    // Sem isto, o comportamento depende de um default invisível pra quem lê a
    // função — foi o que escondeu o bug por tanto tempo.
    const ultimo = todasAsMigrations.lastIndexOf('function public.handle_new_user');
    const fn = todasAsMigrations.slice(ultimo, ultimo + 700);
    expect(fn).toMatch(/insert into public\.profiles \([^)]*\btheme\b/);
    expect(fn).toMatch(/'dark'/);
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

  it("só 'light' gravado fica no claro; o resto cai no escuro", () => {
    expect(sync).toMatch(/profileTheme === 'light' \? 'light' : 'dark'/);
  });

  it('o provider abre no escuro enquanto o valor do banco não chega', () => {
    expect(ler('components/v2/ThemeProviderV2.js')).toMatch(/defaultTheme="dark"/);
  });
});
