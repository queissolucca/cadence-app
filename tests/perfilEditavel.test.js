import { describe, it, expect } from 'vitest';
import { lerFonte } from './fonte.js';

/* NO DESKTOP NÃO HAVIA COMO TROCAR NOME E FOTO.

   No celular, a foto no cabeçalho da Início abre o ProfileDialog. No desktop
   aquele cabeçalho não existe — quem o substitui é a barra lateral —, então os
   dados do perfil apareciam na aba Perfil como texto morto: nome, e-mail e
   plano, sem nenhum caminho pra editar.

   O conserto foi reusar o MESMO diálogo, e é isso que estes testes protegem.
   Escrever um segundo editor de perfil seria a forma garantida de os dois
   divergirem no primeiro ajuste. */

const AJUSTES = lerFonte('components/v2/AjustesClient.js');
const HEADER = lerFonte('components/ui/AppHeader.js');
const DIALOGO = lerFonte('components/v2/ProfileDialog.js');

describe('o cartão do perfil na aba Perfil', () => {
  it('é clicável de verdade, não uma div com onClick', () => {
    const i = AJUSTES.indexOf('onClick={() => setShowProfile(true)}');
    expect(i, 'o cartão precisa abrir o diálogo').toBeGreaterThan(-1);
    // <button> e não <div>: teclado e leitor de tela alcançam um, o outro não.
    expect(AJUSTES.slice(i - 260, i)).toMatch(/<button\s/);
    expect(AJUSTES.slice(i - 260, i + 120)).toMatch(/aria-label="Abrir perfil/);
  });

  it('mostra que dá pra clicar', () => {
    /* Sem affordance o cartão lê como cabeçalho, e cabeçalho ninguém tenta
       clicar — foi exatamente o que aconteceu até aqui. */
    const i = AJUSTES.indexOf('setShowProfile(true)');
    expect(AJUSTES.slice(i, i + 1600)).toMatch(/<ChevronRight/);
  });

  it('abre o MESMO diálogo do mobile, não um editor próprio', () => {
    expect(AJUSTES).toMatch(/import \{ ProfileDialog \} from '\.\/ProfileDialog'/);
    expect(HEADER, 'o mobile continua usando o mesmo').toMatch(/import \{ ProfileDialog \}/);
  });

  it('passa todas as props que o diálogo exige', () => {
    const assinatura = DIALOGO.match(/export function ProfileDialog\(\{([^}]+)\}/);
    expect(assinatura, 'a assinatura do diálogo precisa existir').toBeTruthy();
    const esperadas = assinatura[1].split(',').map((p) => p.split('=')[0].trim()).filter(Boolean);
    const i = AJUSTES.indexOf('<ProfileDialog');
    const uso = AJUSTES.slice(i, AJUSTES.indexOf('/>', i));
    for (const prop of esperadas) {
      expect(uso, `${prop} não está sendo passada`).toContain(`${prop}=`);
    }
  });

  it('a data e o recorde saem do perfil, com os mesmos cuidados da Início', () => {
    // Fuso de São Paulo: sem ele, quem abre de madrugada vê a data de ontem.
    expect(AJUSTES).toMatch(/timeZone: 'America\/Sao_Paulo'/);
    // O recorde nunca pode aparecer menor que a sequência atual.
    expect(AJUSTES).toMatch(/Math\.max\(profile\?\.streak_count \|\| 0, profile\?\.streak_max \|\| 0\)/);
  });

  it('salvar atualiza a tela por baixo', () => {
    // Sem o refresh, a pessoa troca o nome, fecha o diálogo, e o cartão
    // continua com o nome velho — parece que não salvou.
    const i = DIALOGO.indexOf('router.refresh()');
    expect(i).toBeGreaterThan(-1);
    expect(DIALOGO.slice(i, i + 80)).toContain('onClose()');
  });
});
