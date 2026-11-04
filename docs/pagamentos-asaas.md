# Pagamentos pelo Asaas

O Cadence cobra pelo Asaas desde a v6.4.0, no lugar do AbacatePay.

| Plano | Como cobra | Onde a pessoa paga |
|---|---|---|
| **3 meses** (`pro-trimestral`, R$ 89,90) | Pagamento único: Pix ou cartão em até 8x | Checkout hospedado do Asaas |
| **Mensal** (`pro-mensal`, R$ 39,90) no cartão | Assinatura: o Asaas cobra o cartão todo mês | Checkout hospedado do Asaas |
| **Mensal** no Pix Automático | Um QR Code paga o 1º mês e autoriza os próximos; o banco debita todo mês | QR Code no popup do plano, dentro do app |

Preços em `lib/plans.js`. Mudar ali muda o popup, o checkout e o Pix Automático. Assinaturas já criadas mantêm o valor antigo no Asaas.

## Configurar (uma vez)

1. **Conta Asaas PJ.** O Pix Automático exige CNPJ (MEI vale) ativo há pelo menos 6 meses. É regra do Banco Central (Resolução BCB 482), não do Asaas. Confira em *Minha conta* se o Pix Automático aparece habilitado.
2. **Chave de API.** Painel → Integrações → Chaves de API → gerar a de **produção** (começa com `$aact_prod_`).
3. **Vercel** → projeto `0-projects` → Settings → Environment Variables, ambiente **Production**, tipo **Sensitive**:
   - `ASAAS_API_KEY` = a chave do passo 2
   - `ASAAS_WEBHOOK_TOKEN` = gerado no passo 4
4. **Webhook.** No terminal, na pasta do repositório (aspas **simples** na chave):
   ```sh
   ASAAS_API_KEY='$aact_prod_...' node scripts/asaas-setup.mjs --email seu@email.com
   ```
   O script cadastra o webhook `https://heycady.com/api/webhooks/asaas` com os 14 eventos certos, em ordem (`SEQUENTIALLY`), e imprime o token **uma vez**. Cole esse token como `ASAAS_WEBHOOK_TOKEN` na Vercel. Rodar de novo é seguro: ele atualiza em vez de duplicar.
5. **Supabase** → SQL Editor → rodar `supabase/migrations/0042_asaas_assinaturas.sql`. É aditiva. Sem ela o fluxo funciona, mas mais devagar e sem a trava única contra liberar duas vezes a mesma cobrança.
6. **Deploy** da `main` (variável nova só vale depois de um deploy).

## Conferir

Abra no navegador: `https://heycady.com/api/webhooks/asaas?token=SEU_TOKEN`

O retorno mostra as variáveis presentes, se a chave é de produção (`"asaas": "producao"`), se a migration 0042 rodou, os últimos 30 eventos com o desfecho de cada um, os acessos liberados e os pedidos.

| Desfecho | O que significa |
|---|---|
| `liberado (via …) ate AAAA-MM-DD` | Acesso gravado. O "via" diz como o dono foi achado. |
| `ja_liberado` | Segundo evento da mesma compra (o cartão manda dois; o parcelado manda um por parcela). Normal. |
| `pagamento_de_fora` | Cobrança que não é do Cadence (outro negócio na mesma conta Asaas). Ignorada de propósito. |
| `sem_plano` | É de um cliente nosso, mas o valor não bate com nenhum plano à venda. Ver à mão. |
| `revogado` | Estorno ou chargeback: o acesso expirou na hora. |
| `encerrado` | Assinatura cancelada. O acesso já pago continua até o fim. |
| `falha_ao_gravar` | Banco fora. O Asaas reenvia sozinho. |

## Teste de ponta a ponta (com dinheiro de verdade)

O preview da Vercel tem proteção de login e não recebe webhook, então o teste é em produção:

1. Numa conta de teste sem plano, toque em Falar → popup → **Mensal → Cartão**. Pague com o seu cartão.
2. O `/obrigado` deve confirmar em segundos, e o diagnóstico deve mostrar `liberado (via checkout)`.
3. Perfil → **Assinatura** deve mostrar "Cartão de crédito · próxima cobrança em …". Cancele ali. O diagnóstico deve mostrar `encerrado`, e o acesso continua.
4. No painel do Asaas, estorne a cobrança. O diagnóstico deve mostrar `revogado`.
5. Repita com **Mensal → Pix Automático** pelo app do seu banco.

## Regras que o código segue (e por quê)

- **O webhook quase sempre responde 200.** O Asaas pausa a fila depois de 15 falhas seguidas, e uma fila pausada trava a confirmação de todo mundo. Só "banco fora" devolve 500. Token errado devolve 401, de propósito: é configuração quebrada, e a fila pausada (com e-mail do Asaas) é o alarme.
- **O dono do pagamento vem do nosso pedido**, gravado antes do checkout, e não do e-mail digitado no checkout. Sem pedido, só vale um cliente que **nós** criamos (`externalReference` = id do usuário).
- **A mensalidade vale até o vencimento seguinte + 3 dias**, ancorada no calendário de cobrança, sem somar. Assim a folga não acumula mês a mês.
- **Chave de sandbox em produção é recusada** (seria vender de graça). Para um teste controlado: `ASAAS_PERMITIR_SANDBOX=1`.
- **Cancelar só mexe no que é do Cadence**: assinatura nascida de um checkout nosso, ou Pix Automático de um cliente criado por nós.

## O AbacatePay

O webhook antigo (`/api/webhooks/abacatepay`) segue no ar para estornos tardios de compras feitas lá. Quando não houver mais compra recente no AbacatePay, dá pra apagar `ABACATEPAY_*` da Vercel e as rotas `lib/abacatepay.js`, `app/api/webhooks/abacatepay`, `scripts/abacate-setup-products.mjs`.
