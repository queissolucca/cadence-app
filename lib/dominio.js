/* ONDE O PRODUTO MORA — e o que fazer com quem chega pelo endereço antigo.

   O endereço mudou de cadenceenglish.app para heycady.com. Um domínio aposentado
   não some: ele continua em e-mail já enviado, em print, em favorito, em
   resultado de busca, no cartão de visita, no link que alguém mandou pra um
   amigo. Deixá-lo morrer é perder essas pessoas em silêncio — elas veem um erro
   e vão embora sem nunca saber que o produto continua existindo.

   Então o antigo continua de pé, e aponta pro novo.

   Uma constante só, e ela vive aqui: o endereço aparece no redirect, nos
   metadados (og:image, canonical) e nas URLs de retorno do pagamento. Espalhado
   em três lugares, eles divergem na primeira troca — e a divergência aparece do
   pior jeito, como um link de compartilhamento que leva pro lugar errado. */

export const DOMINIO = 'heycady.com';
export const URL_BASE = `https://${DOMINIO}`;

/* Os endereços aposentados. `www` entra junto porque quem digita um domínio na
   mão digita com www mais vezes do que se imagina. */
export const DOMINIOS_ANTIGOS = Object.freeze([
  'cadenceenglish.app',
  'www.cadenceenglish.app',
]);

/* QUEM NÃO PODE SER REDIRECIONADO.

   Redirect é uma resposta que só serve pra quem sabe segui-la. Um navegador
   sabe. Um servidor de pagamento mandando um POST de webhook, muitas vezes não —
   e mesmo os que seguem podem descartar o corpo no caminho. Um webhook perdido é
   alguém que pagou e não recebeu acesso: o pior defeito que este produto pode
   ter, e um que não dá erro em lugar nenhum.

   Enquanto a URL antiga estiver cadastrada no painel do AbacatePay (e da Kiwify),
   ela precisa CONTINUAR atendendo no endereço antigo. Isto sai daqui só depois de
   os painéis apontarem pro novo — e sem pressa, porque um webhook que chega nos
   dois endereços não custa nada. */
export const SEM_REDIRECT = Object.freeze(['/api/webhooks/']);

/* Devolve pra onde mandar quem chegou pelo endereço antigo, ou null quando não
   há nada a fazer (já está no endereço certo, ou é um caminho que não redireciona).

   O host vem com a porta em desenvolvimento (localhost:3000), por isso o corte. */
export function destinoDoDominio({ host, pathname = '/', search = '' } = {}) {
  const h = String(host || '').toLowerCase().split(':')[0].trim();
  if (!h || !DOMINIOS_ANTIGOS.includes(h)) return null;
  if (SEM_REDIRECT.some((prefixo) => pathname.startsWith(prefixo))) return null;
  return `${URL_BASE}${pathname || '/'}${search || ''}`;
}
