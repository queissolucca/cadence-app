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
    exemplo_analogo: { type: 'string' },
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
  required: ['veredito', 'problemas', 'versao_natural', 'porque', 'exemplo_analogo', 'restricao_cumprida', 'erro_ledger', 'rubrica_delta'],
  additionalProperties: false,
};

function fallbackCorrection(reason) {
  return {
    veredito: 'erro',
    problemas: [],
    versao_natural: '',
    porque: reason,
    exemplo_analogo: '',
    restricao_cumprida: false,
    erro_ledger: { acao: 'nenhuma', id: '', pattern: '', categoria: '', forma_natural: '', porque_padrao: '' },
    rubrica_delta: { precisao: 0, naturalidade: 0, vocabulario: 0, fluencia: 0 },
  };
}

// Recheck leve — só confirma se a reescrita corrigiu o padrão apontado,
// nunca uma correção completa nova (§2.2). Modelo/params mínimos de propósito.
const RECHECK_SCHEMA = {
  type: 'object',
  properties: {
    corrigido: { type: 'boolean' },
    comentario: { type: 'string' },
  },
  required: ['corrigido', 'comentario'],
  additionalProperties: false,
};

function fallbackRecheck() {
  return { corrigido: false, comentario: 'Não consegui verificar agora. Tente de novo.' };
}

export async function recheckRewrite({ skill, versaoNatural, rewriteText }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackRecheck();
  }

  const skillLabel = skill === 'speaking' ? 'fala' : 'escrita';
  const prompt = `Você é um coach de inglês checando só UMA coisa: se a reescrita do aluno (${skillLabel}) aplicou corretamente o padrão da versão corrigida abaixo. Não é uma correção completa nova — não aponte outros problemas.

Versão corrigida (referência): ${versaoNatural}
Reescrita do aluno: ${rewriteText}

Retorne "corrigido": true se a reescrita aplicou o mesmo padrão corretamente (não precisa ser idêntica, só correta nesse ponto), false caso contrário. "comentario": uma frase curtíssima (até 80 caracteres), direta, sem jargão.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: RECHECK_SCHEMA },
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
    console.error('Recheck error:', error);
    return fallbackRecheck();
  }
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

// Sempre Haiku (modelo mais rápido e barato) com temperature 0 — inclusive
// pra boss scenario, a pedido explícito do usuário de minimizar custo/latência.
export async function correctAnswer({ skill, task, userText, restriction, errorProfile, mode = 'quick', depth = 'explain_always' }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackCorrection('Claude não está configurado no backend. Verifique ANTHROPIC_API_KEY.');
  }

  const skillLabel = skill === 'speaking' ? 'fala' : 'escrita';
  const restrictionLine = restriction
    ? `Restrição do exercício: o aluno deveria usar "${restriction.structureHint}" na resposta.`
    : 'Sem restrição de estrutura neste exercício.';

  // §5: com depth="flag_only" o usuário só quer o apontamento do erro — a
  // explicação completa e o exemplo análogo custam tokens à toa se ninguém
  // vai ler; só geramos sob demanda (ver explainProblem) quando o usuário
  // pedir "por quê" na UI.
  const explainLine = depth === 'flag_only'
    ? '- "porque": deixe SEMPRE vazio ("") — a explicação será gerada sob demanda depois, só se o aluno pedir.\n- "exemplo_analogo": deixe SEMPRE vazio ("") pelo mesmo motivo.'
    : '- "porque": no máximo 140 caracteres, direto, sem jargão gramatical — explique a regra/padrão por trás do erro de forma simples.\n- "exemplo_analogo": se veredito != "correto", um exemplo curto (uma frase) usando o MESMO padrão/regra em um contexto diferente do da tarefa, pra reforçar o padrão (não repita o mesmo cenário). Vazio ("") se veredito="correto".';

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
${explainLine}
- "restricao_cumprida": true se o aluno usou a estrutura pedida (ou se não havia restrição).
- "erro_ledger": se um problema apontado é o MESMO padrão de um item do perfil acima, use acao="atualizar" e "id" com o id dele (deixe os outros campos de texto vazios). Se é um padrão novo e recorrente (não um erro pontual), use acao="criar" e preencha pattern/categoria/forma_natural/porque_padrao/dica ("dica" é um chip curtíssimo tipo "use: by + prazo", máximo 4 palavras, forma imperativa). Caso contrário, acao="nenhuma" e todos os campos de texto vazios ("").
- "rubrica_delta": para precisao/naturalidade/vocabulario/fluencia, -1 se a resposta piorou nesse eixo, 0 se neutro/não evidenciado, +1 se demonstrou domínio. A maioria fica 0 — só marque quando a resposta realmente evidenciar aquele eixo especificamente.`;

  const isQuick = mode === 'quick';

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: isQuick ? 300 : 600,
      temperature: 0,
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

// Feedback nomeado (§1) — só chamado na transição active→mastered de um
// review_item, nunca a cada acerto isolado. Call leve, contexto mínimo.
const MASTERY_SCHEMA = {
  type: 'object',
  properties: { mensagem: { type: 'string' } },
  required: ['mensagem'],
  additionalProperties: false,
};

function fallbackMasteryMessage(pattern) {
  return { mensagem: `Você acabou de dominar: ${pattern}.` };
}

export async function generateMasteryMessage({ pattern, categoria, formaNatural, timesSeen, timesCorrect }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackMasteryMessage(pattern);
  }

  const prompt = `Um aluno de inglês (brasileiro, intermediário pra cima) acabou de dominar um padrão de erro, depois de acertá-lo de forma consistente na revisão espaçada.

Padrão dominado: ${pattern}
Categoria: ${categoria}
Forma natural: ${formaNatural}
Apareceu ${timesSeen}x nos exercícios, acertou ${timesCorrect}x.

Escreva "mensagem": uma frase curta e direta (até 180 caracteres), tom sem hype, nomeando o padrão dominado e em que contexto ele apareceu nos exercícios do aluno (quantas vezes, taxa de acerto). Nunca genérico tipo "parabéns!" — seja específico sobre o que foi dominado.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: MASTERY_SCHEMA },
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
    console.error('Mastery message error:', error);
    return fallbackMasteryMessage(pattern);
  }
}

// §5 (correction_depth="flag_only"): explicação e exemplo análogo gerados só
// quando o aluno pede, clicando "por quê" — nunca de graça em toda correção.
const EXPLAIN_SCHEMA = {
  type: 'object',
  properties: {
    porque: { type: 'string' },
    exemplo_analogo: { type: 'string' },
  },
  required: ['porque', 'exemplo_analogo'],
  additionalProperties: false,
};

function fallbackExplain() {
  return { porque: 'Não consegui gerar a explicação agora. Tente de novo.', exemplo_analogo: '' };
}

export async function explainProblem({ skill, userText, versaoNatural, problemas }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackExplain();
  }

  const skillLabel = skill === 'speaking' ? 'fala' : 'escrita';
  const problemasLine = (problemas || []).map((p) => `"${p.trecho_problema}" → "${p.correcao}"`).join('; ') || '(nenhum trecho específico apontado)';

  const prompt = `Você já corrigiu a resposta de ${skillLabel} de um aluno de inglês. Ele pediu a explicação (não pediu antes, por preferência de estilo mais direto).

Resposta original: ${userText}
Versão natural: ${versaoNatural}
Trechos corrigidos: ${problemasLine}

Retorne:
- "porque": até 140 caracteres, direto, sem jargão gramatical — a regra/padrão por trás do erro.
- "exemplo_analogo": um exemplo curto (uma frase) usando o mesmo padrão em outro contexto.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: EXPLAIN_SCHEMA },
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
    console.error('Explain error:', error);
    return fallbackExplain();
  }
}

// §4 — reforço imediato, na mesma sessão: 1-2 variações CURTAS do mesmo
// padrão em contextos diferentes (nunca a mesma frase — isso é a reescrita
// da §2.2). Reforço de curto prazo; o SRS de 0/1/7/30 dias continua sendo o
// de longo prazo — os dois não duplicam o mesmo item na mesma sessão porque
// isso aqui não mexe em review_items, só gera prompts efêmeros.
const REINFORCE_SCHEMA = {
  type: 'object',
  properties: {
    drills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          hint: { type: 'string' },
        },
        required: ['prompt', 'hint'],
        additionalProperties: false,
      },
    },
  },
  required: ['drills'],
  additionalProperties: false,
};

function fallbackReinforce() {
  return { drills: [] };
}

export async function generateReinforcementDrills({ skill, pattern, categoria, formaNatural }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackReinforce();
  }

  const skillLabel = skill === 'speaking' ? 'fala' : 'escrita';
  const prompt = `Um aluno de inglês (brasileiro, intermediário pra cima) acabou de errar/praticar este padrão em ${skillLabel}:

Padrão: ${pattern}
Categoria: ${categoria}
Forma natural: ${formaNatural}

Gere EXATAMENTE 1 "drill" curtíssimo pra fixar o MESMO padrão AGORA, em um contexto diferente do exercício original (nunca repita o cenário). O drill: "prompt" é uma situação em português em uma frase (ex: "seu chefe pediu pra terminar até sexta"), pedindo pro aluno responder com 1 frase curta em inglês aplicando o padrão. "hint" é o mesmo chip curtíssimo de estrutura-alvo (até 4 palavras, ex: "use: by + prazo"). Só 1 item no array — nada de sobrecarregar o aluno logo depois de já ter reescrito a frase.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 250,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: REINFORCE_SCHEMA },
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
    console.error('Reinforce error:', error);
    return fallbackReinforce();
  }
}

// Checagem leve de cada drill — só confirma se aplicou o padrão, igual ao
// recheckRewrite, mas com o contexto do drill (não da versão natural original).
export async function checkDrillAnswer({ skill, hint, answerText }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackRecheck();
  }

  const skillLabel = skill === 'speaking' ? 'fala' : 'escrita';
  const promptText = `Você é um coach de inglês checando só UMA coisa: se a resposta do aluno (${skillLabel}) aplicou corretamente a estrutura-alvo pedida.

Estrutura-alvo: ${hint}
Resposta do aluno: ${answerText}

Retorne "corrigido": true se aplicou a estrutura corretamente, false caso contrário. "comentario": frase curtíssima (até 80 caracteres), direta.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: RECHECK_SCHEMA },
      },
      messages: [{ role: 'user', content: promptText }],
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
    console.error('Drill check error:', error);
    return fallbackRecheck();
  }
}

// §7 — antes/depois: mesma pergunta do onboarding, respondida de novo a cada
// ~4 semanas. Só identifica padrões de erro no texto livre (sem cenário/
// restrição), pra comparar contra o snapshot mais antigo.
const SNAPSHOT_SCHEMA = {
  type: 'object',
  properties: {
    erros: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          trecho: { type: 'string' },
        },
        required: ['pattern', 'trecho'],
        additionalProperties: false,
      },
    },
  },
  required: ['erros'],
  additionalProperties: false,
};

function fallbackSnapshotAnalysis() {
  return { erros: [] };
}

export async function analyzeSnapshotErrors({ text }) {
  if (!process.env.ANTHROPIC_API_KEY || !text) {
    return fallbackSnapshotAnalysis();
  }

  const prompt = `Um aluno de inglês brasileiro escreveu este texto livre, respondendo "conte o que você fez ontem":

${text}

Identifique no máximo 2 padrões de erro recorrentes (não erros pontuais isolados). Para cada: "pattern" (descrição curta do padrão) e "trecho" (o trecho exato do texto onde aparece). Se não houver erro claro, retorne array vazio.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 250,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: SNAPSHOT_SCHEMA },
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
    console.error('Snapshot analysis error:', error);
    return fallbackSnapshotAnalysis();
  }
}

// §8 — recuperação ativa (testing effect): compara o palpite do aluno com a
// explicação real ANTES de revelá-la — nunca vira dado de erro formal, só
// log de reflexão (recall_reflections), sem afetar mastery.
const RECALL_COMPARE_SCHEMA = {
  type: 'object',
  properties: { comentario: { type: 'string' } },
  required: ['comentario'],
  additionalProperties: false,
};

function fallbackRecallComment() {
  return { comentario: 'Boa tentativa — dá uma olhada na explicação completa abaixo.' };
}

export async function compareRecallGuess({ guess, porque }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackRecallComment();
  }

  const prompt = `Um aluno de inglês tentou explicar, com as próprias palavras, por que uma regra funciona — ANTES de ver a explicação real.

Palpite do aluno: ${guess}
Explicação real: ${porque}

Em até 100 caracteres, diga de forma direta e gentil o que o aluno acertou ou errou no próprio raciocínio (não repita a explicação inteira, só comente o palpite).`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: RECALL_COMPARE_SCHEMA },
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
    console.error('Recall compare error:', error);
    return fallbackRecallComment();
  }
}
