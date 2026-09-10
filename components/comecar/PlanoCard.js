/* O card do plano — a oferta em si.

   Vive fora da tela de paywall porque agora aparece em DOIS lugares: no fim do
   onboarding (/comecar) e no /pagamento, pra onde o middleware manda quem está
   logado e sem acesso válido. Duas cópias do mesmo preço divergiriam no dia em
   que uma delas mudasse — e divergência de preço é o tipo de bug que só se
   descobre por reclamação de cliente.

   Puramente apresentacional: quem chama é que sabe o que o botão faz. */

export const PRECO_CHEIO = 296.90;
export const PRECO = 89.90;
export const DIAS = 90;              // 3 meses de acesso

const real = (v) => v.toFixed(2).replace('.', ',');
// Arredonda pra baixo: prometer "R$ 0,99/dia" quando dá 1,00 é propaganda
// arredondada pro lado errado. O desconto também sai do cálculo, não da mão.
export const POR_DIA = real(PRECO / DIAS);
export const DESCONTO = Math.round((1 - PRECO / PRECO_CHEIO) * 100);

export function PlanoCard({ minutos = 5 }) {
  return (
    <div className="plancard">
      <span className="plantag">3 meses de acesso · lançamento</span>
      <div className="priceline">
        <span className="priceold">R$ {real(PRECO_CHEIO)}</span>
        <span className="priceoff">-{DESCONTO}%</span>
      </div>
      <div className="priceday">
        <span className="pricenew">R$ {real(PRECO)}</span>
        <span className="perday">R$ {POR_DIA} / dia</span>
      </div>
      <p className="priceunit">pagamento único · 3 primeiros meses de acesso</p>
      <ul className="planlist">
        <li><span className="memdot" />conversa de {minutos} minutos por dia, todo dia</li>
        <li><span className="memdot" />correção direta, com o porquê de cada erro</li>
        <li><span className="memdot" />revisão espaçada: hoje · amanhã · 1 sem · 1 mês</li>
        <li><span className="memdot" />cenários ilimitados de escrita e fala</li>
      </ul>
      <p className="planfoot">O preço de lançamento vale pra quem entra agora. Depois dos 3 meses
        você decide se continua — não renova sozinho.</p>
    </div>
  );
}
