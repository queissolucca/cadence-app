import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Contrato §6.3 — sempre JSON puro, sem preâmbulo. "problemas" tem no máximo
// 2 itens (regra dura de produto: foco, não avalanche). Campos do erro_ledger
// e rubrica_delta são sempre preenchidos (string vazia / 0 quando não se aplica)
// para manter o schema estritamente tipado.
const CORRECTION_SCHEMA = {
  type: 'object',
  properties: {
    veredito: { type: 'string', enum: ['erro', 'nao_natural', 'correto'] },
    problemas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trecho_problema: { type: 'string' },
          correcao: { type: 'string' },
        },
        required: ['trecho_problema', 'correcao'],
        additionalProperties: false,
      },
    },
    versao_natural: { type: 'string' },
    porque: { type: 'string' },
    restricao_cumprida: { type: 'boolean' },
    erro_ledger: {
      type: 'object',
      properties: {
        acao: { type: 'string', enum: ['nenhuma', 'criar', 'atualizar'] },
        id: { type: 'string' },
        pattern: { type: 'string' },
        categoria: { type: 'string' },
        forma_natural: { type: 'string' },
        porque_padrao: { type: 'string' },
        dica: { type: 'string' },
      },
      required: ['acao', 'id', 'pattern', 'categoria', 'forma_natural', 'porque_padrao', 'dica'],
      additionalProperties: false,
    },
    rubrica_delta: {
      type: 'object',
      properties: {
        precisao: { type: 'integer' },
        naturalidade: { type: 'integer' },
        vocabulario: { type: 'integer' },
        fluencia: { type: 'integer' },
      },
      required: ['precisao', 'naturalidade', 'vocabulario', 'fluencia'],
      additionalProperties: false,
    },
  },
  required: ['veredito', 'problemas', 'versao_natural', 'porque', 'restricao_cumprida', 'erro_ledger', 'rubrica_delta'],
  additionalProperties: false,
};

function fallbackCorrection(reason) {
  return {
    veredito: 'erro',
    problemas: [],
    versao_natural: '',
    porque: reason,
    restricao_cumprida: false,
    erro_ledger: { acao: 'nenhuma', id: '', pattern: '', categoria: '', forma_natural: '', porque_padrao: '' },
    rubrica_delta: { precisao: 0, naturalidade: 0, vocabulario: 0, fluencia: 0 },
  };
}

// perfil comprimido: só os top-5 itens ativos, uma linha cada — nunca o
// ledger inteiro, nunca histórico de conversa.
function formatErrorProfile(errorProfile) {
  if (!errorProfile || !errorProfile.length) return '(nenhum erro ativo registrado ainda)';
  return errorProfile
    .slice(0, 5)
    .map((it) => `${it.id} | ${it.pattern} | ${it.skill} | ${Math.round((it.taxa_erro_recente || 0) * 100)}%`)
    .join('\n');
}

// mode "quick" (turno curto de sessão) roteia pro modelo pequeno com
// temperature 0; mode "rubrica" (boss scenario, texto longo) usa um modelo
// maior — ver §6.1 do prompt mestre.
export async function correctAnswer({ skill, task, userText, restriction, errorProfile, mode = 'quick' }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackCorrection('Claude não está configurado no backend. Verifique ANTHROPIC_API_KEY.');
  }

  const skillLabel = skill === 'speaking' ? 'fala' : 'escrita';
  const restrictionLine = restriction
    ? `Restrição do exercício: o aluno deveria usar "${restriction.structureHint}" na resposta.`
    : 'Sem restrição de estrutura neste exercício.';

  const prompt = `Você é um coach de inglês para brasileiros de nível intermediário-avançado. O foco é produção (escrita/fala) real — nunca tradução, nunca frase solta.

Tarefa (${skillLabel}): ${task.context}
Pedido: ${task.askPt}
${restrictionLine}
Resposta do aluno: ${userText}

Perfil de erros ativos do aluno (id | padrão | skill | taxa de erro recente):
${formatErrorProfile(errorProfile)}

Avalie a resposta e retorne o JSON do contrato:
- "veredito": "erro" (violação gramatical clara) | "nao_natural" (aceitável mas soa rude/robótico/não natural) | "correto".
- "problemas": no máximo 2 itens, cada um com o trecho exato problemático e a correção. Vazio se veredito="correto". Priorize problemas que batem com o perfil de erros acima.
- "versao_natural": a frase inteira reescrita como um nativo diria.
- "porque": no máximo 140 caracteres, direto, sem jargão gramatical.
- "restricao_cumprida": true se o aluno usou a estrutura pedida (ou se não havia restrição).
- "erro_ledger": se um problema apontado é o MESMO padrão de um item do perfil acima, use acao="atualizar" e "id" com o id dele (deixe os outros campos de texto vazios). Se é um padrão novo e recorrente (não um erro pontual), use acao="criar" e preencha pattern/categoria/forma_natural/porque_padrao/dica ("dica" é um chip curtíssimo tipo "use: by + prazo", máximo 4 palavras, forma imperativa). Caso contrário, acao="nenhuma" e todos os campos de texto vazios ("").
- "rubrica_delta": para precisao/naturalidade/vocabulario/fluencia, -1 se a resposta piorou nesse eixo, 0 se neutro/não evidenciado, +1 se demonstrou domínio. A maioria fica 0 — só marque quando a resposta realmente evidenciar aquele eixo especificamente.`;

  const isQuick = mode === 'quick';

  try {
    const response = await client.messages.create({
      model: isQuick ? 'claude-haiku-4-5' : 'claude-sonnet-5',
      max_tokens: isQuick ? 300 : 800,
      ...(isQuick ? { temperature: 0 } : {}),
      output_config: {
        format: { type: 'json_schema', schema: CORRECTION_SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude refused the request.');
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new Error('Claude did not return a text response.');
    }

    return JSON.parse(textBlock.text);
  } catch (error) {
    console.error('Correction error:', error);
    return fallbackCorrection('O Claude não conseguiu processar a requisição agora. Tente de novo em instantes.');
  }
}
