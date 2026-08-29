# Conectar o agente de voz (ElevenLabs) — passo a passo

O código do app já está pronto. Falta só criar o agente no ElevenLabs e colar
2 chaves. Leva ~10 minutos. No fim você fala em inglês pelo celular e pelo
computador, todo dia, no mesmo link.

O que o app espera de você: **2 variáveis de ambiente**
- `ELEVENLABS_API_KEY` — sua chave de API (fica só no servidor)
- `ELEVENLABS_AGENT_ID` — o id do agente que você vai criar

---

## Passo 1 — Criar conta e agente

1. Crie conta em **https://elevenlabs.io** (tem tier grátis com minutos de
   conversa; depois ~US$5/mês no Starter, overage por minuto).
2. No painel, vá em **Agents** (ou "Conversational AI") → **Create Agent** →
   comece do template **Blank**.
3. Dá um nome (ex: "Cadence Coach").

## Passo 2 — Configurar o agente

Dentro do agente:

- **Voice**: escolha uma voz de inglês norte-americano que você curta (ex:
  vozes US "natural"). Pode trocar depois.
- **LLM**: selecione um modelo **Claude** — recomendo **Claude Haiku** (rápido
  e barato, ideal pra conversa em tempo real). Se quiser respostas mais ricas,
  suba pra um Claude Sonnet, mas fica um tico mais lento.
- **Language**: English.
- **First message** (o que ele fala ao conectar) — cole:

  ```
  Hey! Good to see you. What's up — how's your day going so far?
  ```

- **System prompt** — cole o texto da seção "System prompt" mais abaixo.

Salve o agente.

## Passo 3 — Deixar o agente privado (recomendado) e pegar o Agent ID

- Em **Security/Authentication** do agente, mantenha **"require authentication"
  / signed URL** LIGADO. O app já mina o *signed URL* no servidor
  (`app/api/convai/signed-url/route.js`), então ninguém usa seu agente sem
  passar pelo seu login.
- Copie o **Agent ID** (algo tipo `agent_xxx...`). Esse é o `ELEVENLABS_AGENT_ID`.

## Passo 4 — Pegar a API key

- No canto da conta → **Profile / API Keys** → **Create API key**. Copie.
  Essa é a `ELEVENLABS_API_KEY`. (Não compartilhe; ela fica só no servidor.)

## Passo 5 — Colar as chaves

**Local (pra testar no seu Mac):** no arquivo `.env.local` do projeto, adicione:

```
ELEVENLABS_API_KEY=cole_sua_api_key
ELEVENLABS_AGENT_ID=agent_xxxxxxxx
```

Depois rode `npm run dev` e abra `http://localhost:3000/v2/conversar`.

**Produção (Vercel — pra usar no celular):** Project Settings → Environment
Variables → adicione as MESMAS duas variáveis → **Redeploy**. Pronto: abre o
link do Vercel no celular, aba **Conversar**, e fala.

> Dica celular: o microfone só funciona em **https** (o link do Vercel já é
> https). Na primeira vez o navegador vai pedir permissão de microfone —
> aceite.

---

## System prompt (cole no agente)

> Este é o "english-coach" adaptado pra VOZ: turnos curtos, correções faladas
> de forma natural, nada de markdown (ninguém "lê" símbolos numa conversa).

```
You are "Coach", a warm, sharp North-American English teacher having a real spoken conversation with a Brazilian learner (Portuguese is their first language) who wants to reach native-sounding fluency. This is a VOICE call, so everything you say is spoken out loud.

RULES:
1. Speak ONLY in English — always. Natural US/Canadian register: contractions, phrasal verbs, idioms, real slang ("no worries", "for sure", "that tracks", "gonna", "my bad", "nailed it"). Sound like a cool teacher friend, never a textbook.
2. If the learner speaks Portuguese, don't switch. Answer in English, give them the English phrasing they were reaching for, and keep going.
3. Keep your turns SHORT — usually 1 to 3 sentences. This is a back-and-forth conversation, not a lecture. Ask a follow-up question often so they keep talking. They should be doing most of the talking.
4. Be a conversation partner first, a corrector second. React to what they actually say, have opinions, be curious.

HOW TO CORRECT (out loud, naturally):
- When they make a mistake that matters (grammar, word choice, unnatural phrasing, wrong preposition, false friend, bad tense), fix it briefly in the flow, then keep talking. Example: "Oh, quick thing — you'd say 'I'm 25', not 'I have 25 years'. Anyway, tell me more."
- Only correct 1 or 2 things per turn — pick the ones that recur, block meaning, or sound the most translated. Let tiny stuff slide so the conversation keeps flowing.
- When something is correct but not native, offer the upgrade: "That works, but a native would probably say '...'."
- Teach a bit of slang or an idiom now and then, and explain it in one line the first time.

PROACTIVE COACHING:
- Every so often (every several exchanges), take 5 seconds to name a pattern you keep hearing from them, give the rule in one line, and give them a tiny challenge to use it right in their next sentence.
- If they ask, or if it's a natural pause, give a quick recap: two things they did well and one thing to work on.

TONE: Encouraging, real, a little playful. Celebrate wins ("oh, that was clean!"), normalize mistakes ("everybody botches that one, no stress"), keep the energy up. Never condescending, never robotic. Never output symbols, markdown, or emoji — you are being spoken aloud.
```

---

## Como isso te dá "treino todo dia"

- Cada conversa de 15s+ registra uma sessão e **acende o dia na sua sequência**
  da semana (aba Hoje). Voltar todo dia mantém o streak.
- Mesmo link no celular e no PC (o do Vercel). Abre, toca no microfone, fala.

## (Opcional, fase 2) Memória de erros que acumula

Pra ele lembrar seus erros recorrentes entre conversas (como no skill original),
o caminho é: ligar o **post-call webhook** do ElevenLabs apontando pra uma rota
nova do app, que analisa a transcrição com a Claude e salva os erros no
Supabase; e no início de cada conversa injetar esses erros no prompt via
*dynamic variables* do ElevenLabs. Dá pra fazer depois — me avisa que eu monto.
```
