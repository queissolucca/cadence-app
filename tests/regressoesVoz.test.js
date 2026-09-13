import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/* QUATRO DEFEITOS QUE ENTRARAM COM AS CORREÇÕES DE ONTEM.

   Todos têm o mesmo formato, e é um formato traiçoeiro: código escrito PRA
   consertar um problema que, do jeito que ficou, recria o mesmo problema por
   outro caminho. Um teste por um, pra que a próxima refatoração não os traga de
   volta em silêncio. */

const FONTE = readFileSync('components/v2/ConversationClient.js', 'utf8');
const SDK = readFileSync('node_modules/@elevenlabs/client/dist/BaseConversation.js', 'utf8');
const ROTA = readFileSync('app/api/convai/signed-url/route.js', 'utf8');

describe('o teto de tempo da gravação não pode ser o que trava a gravação', () => {
  /* `AbortSignal.timeout` não existe em Safari antes do 16. A linha estava FORA
     do try: um "undefined is not a function" ali pulava o `finally`, deixava
     `salvandoAgora` travado em true e `emVoo` sem resolver — nenhuma fala era
     gravada dali em diante, e o fecho ficava esperando uma promessa morta. A
     linha escrita pra matar o travamento era um jeito de travar pra sempre. */
  it('a criação do sinal está DENTRO do try', () => {
    const iTry = FONTE.indexOf('    try {', FONTE.indexOf('const persistir = useCallback'));
    const iSinal = FONTE.indexOf('AbortSignal.timeout(30000)');
    expect(iSinal).toBeGreaterThan(iTry);
  });

  it('e não assume que AbortSignal.timeout existe', () => {
    expect(FONTE).toMatch(/typeof AbortSignal\.timeout === 'function'/);
  });

  it('o finally continua liberando as duas travas', () => {
    const i = FONTE.indexOf('const persistir = useCallback');
    const bloco = FONTE.slice(i, FONTE.indexOf('}, [isCard', i));
    expect(bloco).toContain('salvandoAgora.current = false;');
    expect(bloco).toContain('liberar();');
  });
});

describe('observar o SDK não pode mudar o que o SDK faz', () => {
  /* Parecia telemetria inofensiva: registrar `onUnhandledClientToolCall` pra
     saber quando o agente pede uma ferramenta que não existe. Só que o SDK, ao
     ver esse callback registrado, chama e dá RETURN — sem devolver o
     `client_tool_result`. O agente fica esperando uma resposta que nunca vem, o
     turno não fecha, e ele desliga por timeout. */
  it('o SDK realmente deixa de responder quando o callback existe', () => {
    // O motivo de o teste existir está no SDK, não no nosso código.
    const i = SDK.indexOf('onUnhandledClientToolCall');
    const trecho = SDK.slice(i - 120, i + 160);
    expect(trecho).toMatch(/onUnhandledClientToolCall\(event\.client_tool_call\);\s*\n\s*return;/);
  });

  it('então a gente NÃO registra o callback', () => {
    expect(FONTE).not.toMatch(/onUnhandledClientToolCall:/);
    // E o comentário que explica o porquê fica, senão alguém "melhora" de novo.
    expect(FONTE).toContain('NÃO REGISTRE `onUnhandledClientToolCall`');
  });
});

describe("o status 'error' gruda — e não pode segurar relógios ligados", () => {
  /* 'error' é inventado pelo SDK do React em qualquer onError e só sai quando a
     sessão encerra de verdade. Com `sessaoViva = status !== 'disconnected'`, um
     erro qualquer deixava a rede do microfone (700ms) e o pulso da caixa-preta
     (um POST a cada 30s) rodando pra sempre numa tela sem conversa. */
  it('a sessão viva sai do nosso próprio sinal, não do status do SDK', () => {
    expect(FONTE).toContain('const [sessaoPropria, setSessaoPropria] = useState(false)');
    expect(FONTE).toMatch(/const sessaoViva = \(sessaoPropria \|\| status === 'connecting'\) && status !== 'disconnected'/);
  });

  it('liga no onConnect e desliga no onDisconnect', () => {
    const iCon = FONTE.indexOf('onConnect: () => {');
    expect(FONTE.slice(iCon, iCon + 400)).toContain('setSessaoPropria(true)');
    const iDis = FONTE.indexOf('onDisconnect: (detalhes) => {');
    expect(FONTE.slice(iDis, iDis + 400)).toContain('setSessaoPropria(false)');
  });
});

describe('503 de pagamento não é 503 de configuração', () => {
  /* A rota devolve 503 quando falta chave do ElevenLabs. O PORTÃO DE PAGAMENTO
     no middleware devolve 503 {"error":"try_again"} quando não conseguiu
     confirmar o acesso. Tratados iguais, um soluço do banco no meio da conversa
     anunciava "Agente de voz ainda não configurado" e abortava a retomada. */
  it('só o erro nomeado vira "não configurado"', () => {
    expect(FONTE).toContain("erro === 'elevenlabs_not_configured'");
    expect(FONTE, 'status 503 cru não pode mais decidir isso').not.toMatch(/if \(res\.status === 503\) return \{ naoConfigurado: true \}/);
  });

  it('e a rota realmente manda esse nome', () => {
    expect(ROTA).toContain("error: 'elevenlabs_not_configured'");
  });

  it('o resto vira erro de verdade, pra retomada poder tentar de novo', () => {
    const i = FONTE.indexOf('const buscarSignedUrl = useCallback');
    const bloco = FONTE.slice(i, i + 1400);
    expect(bloco).toMatch(/throw new Error\(erro \|\| `signed_url_\$\{res\.status\}`\)/);
  });
});
