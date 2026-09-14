import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/* O Supabase responde a um signUp de e-mail JA CADASTRADO exatamente como
   responderia a um novo — 200, sem erro, sem sessao — e nao manda e-mail
   nenhum. A unica diferenca e `identities` voltar vazio.

   Antes disso ser tratado, a tela mostrava "Confirma seu e-mail" e a pessoa
   esperava pra sempre um link que nunca foi enviado. Confirmado no projeto
   real: queissolucca@gmail.com voltou identities:[] e email_confirmed_at:null.

   Sem transform de JSX aqui, entao estes testes leem o fonte. Comentarios sao
   removidos antes de qualquer assercao — senao um teste passaria por casar com
   o texto de um comentario que so EXPLICA o comportamento. */
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const fonte = (p) => semComentarios(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

const conta = fonte('lib/comecar/conta.js');
const tela = fonte('components/comecar/screens/app.js');
const shell = fonte('components/comecar/shell.js');
const login = fonte('app/login/page.js');

describe('detectar que a conta ja existe', () => {
  it('criarConta olha identities, que e o unico sinal que o Supabase da', () => {
    expect(conta).toMatch(/identities/);
    expect(conta).toMatch(/jaExiste/);
  });

  it('a tela recebe jaExiste do criarConta', () => {
    expect(tela).toMatch(/const\s*\{[^}]*jaExiste[^}]*\}\s*=\s*await\s+criarConta/);
  });

  it('jaExiste NAO cai na tela de "confirma seu e-mail"', () => {
    // O return dentro do if(jaExiste) tem que vir ANTES do setFase('confirme').
    const iJa = tela.indexOf('if (jaExiste)');
    const iConfirme = tela.indexOf("setFase('confirme')");
    expect(iJa).toBeGreaterThan(-1);
    expect(iConfirme).toBeGreaterThan(iJa);
  });
});

describe('o que a pessoa ve', () => {
  it('o aviso sai no campo de e-mail, nao num erro geral do formulario', () => {
    expect(tela).toMatch(/erro=\{jaTemConta \? 'Esse e-mail já possui conta\.' : ''\}/);
  });

  it('Field sabe mostrar erro de campo, com a marcacao vermelha ja existente', () => {
    expect(shell).toMatch(/className="fielderr"/);
    expect(shell).toMatch(/erro \? 'ruim' : undefined/);
  });

  it('o envio fica travado enquanto o e-mail for um que ja tem conta', () => {
    expect(tela).toMatch(/const podeEnviar = !jaTemConta/);
  });

  it('o aviso some sozinho quando a pessoa troca o e-mail', () => {
    // Guardar QUAL e-mail tem conta (e nao um booleano) e o que faz o aviso
    // sumir na edicao, sem precisar de um limpa-erro no onChange.
    expect(tela).toMatch(/jaTemConta = !!emailComConta && f\.email\.trim\(\)\.toLowerCase\(\) === emailComConta/);
  });

  it('tem saida pra quem ja tem conta: entrar e recuperar senha', () => {
    expect(tela).toMatch(/já tenho conta · entrar/);
    expect(tela).toMatch(/recuperar senha/);
    expect(tela).toMatch(/\/login\?recuperar=1/);
  });
});

describe('reenviar a confirmacao', () => {
  it('existe, e usa o resend do proprio Supabase', () => {
    expect(conta).toMatch(/export async function reenviarConfirmacao/);
    expect(conta).toMatch(/auth\.resend/);
  });

  it('a tela de confirmacao oferece o reenvio', () => {
    expect(tela).toMatch(/reenviar link/);
  });
});

describe('/login abrindo direto na recuperacao', () => {
  it('le ?recuperar=1', () => {
    expect(login).toMatch(/recuperar'\) === '1'/);
  });

  it('le num efeito, nao no valor inicial do useState', () => {
    // Esta pagina e renderizada no servidor antes de hidratar; window nao
    // existe la. No inicializador daria divergencia de hidratacao.
    expect(login).toMatch(/useEffect\(\(\) => \{[\s\S]{0,200}recuperar/);
    expect(login).not.toMatch(/useState\(\(\) => \{[\s\S]{0,200}window\.location\.search/);
  });
});
