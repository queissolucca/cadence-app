'use client';

import dynamic from 'next/dynamic';
import * as A from '../../components/comecar/screens/abertura';
import * as P from '../../components/comecar/screens/perfil';

/* A ordem é o fluxo. `bare` esconde a trilha de pontos do topo (telas de
   abertura e de espera), `tab` liga a barra inferior do app.

   ---------------------------------------------------------------------------
   POR QUE AS TELAS DO FIM SÃO CARREGADAS SEPARADO

   Este arquivo é a lista de TODAS as 33 telas, e era importado de uma vez. Uma
   dessas telas é a de criar conta, que puxa `lib/comecar/conta.js` → o cliente
   do Supabase. Resultado: quem abria cadenceenglish.app baixava e executava o
   SDK do Supabase inteiro — ~55 kB comprimidos, ~190 kB de JavaScript pra
   interpretar — antes de ver o "Oi, eu sou a Cady". Pra uma tela que está 27
   toques à frente, e que muita gente nunca chega a abrir.

   Agora `screens/app` (da primeira lição em diante) e `screens/voce` descem num
   pedaço próprio, e o splash não espera por eles.

   `ssr:false` porque estas telas nunca aparecem na resposta HTML: a única tela
   no HTML é o splash — a navegação das 33 é por estado, no cliente.

   E o pedaço é AQUECIDO no primeiro momento de ociosidade (ver `aquecer` no
   fim). Sem isso, o code-split teria trocado "lento no começo" por "trava no
   meio", que é pior: ninguém repara em 200ms na abertura, todo mundo repara num
   botão que não responde. Do jeito que está, o download acontece enquanto a
   pessoa lê a primeira tela. */

const CAMINHOS = {
  app: () => import('../../components/comecar/screens/app'),
  voce: () => import('../../components/comecar/screens/voce'),
};

// Envelope preto do tamanho da tela: se o pedaço ainda estiver descendo, o
// fundo continua sendo o fundo, sem pulo de layout nem flash branco.
const Espera = () => <div className="scr" aria-busy="true" />;

const tardia = (modulo, nome) => dynamic(
  () => CAMINHOS[modulo]().then((m) => ({ default: m[nome] })),
  { ssr: false, loading: Espera },
);

const X = {
  LicaoBrief: tardia('app', 'LicaoBrief'),
  LicaoChat: tardia('app', 'LicaoChat'),
  LicaoFala: tardia('app', 'LicaoFala'),
  LicaoFim: tardia('app', 'LicaoFim'),
  Plano: tardia('app', 'Plano'),
  Compromisso: tardia('app', 'Compromisso'),
  ConstelacaoTela: tardia('app', 'ConstelacaoTela'),
  Tonalidade: tardia('app', 'Tonalidade'),
  Conta: tardia('app', 'Conta'),
  Paywall: tardia('app', 'Paywall'),
  Home: tardia('app', 'Home'),
  Login: tardia('app', 'Login'),
};
const Voce = tardia('voce', 'Voce');

export const SCREENS = [
  { id: 'splash',       grp: 'Abertura',        name: 'Splash',              bare: true,  C: A.Splash },
  { id: 'idioma',       grp: 'Abertura',        name: 'Vitrine de idiomas',  bare: true,  C: A.Idioma },
  { id: 'proposta',     grp: 'Abertura',        name: 'Proposta de valor',                C: A.Proposta },
  { id: 'social',       grp: 'Abertura',        name: 'Prova social',                     C: A.Social },
  { id: 'audio',        grp: 'Setup',           name: 'Preferência de áudio',             C: A.Audio },
  { id: 'nivel',        grp: 'Diagnóstico',     name: 'Autoavaliação',                    C: A.Nivel },
  { id: 'fala',         grp: 'Diagnóstico',     name: 'Teste de fala',                    C: A.Fala },
  { id: 'feedback',     grp: 'Diagnóstico',     name: 'Feedback da fala',                 C: A.Feedback },
  { id: 'conquista1',   grp: 'Diagnóstico',     name: 'Primeiro ponto',                   C: A.Conquista1 },
  { id: 'objetivo',     grp: 'Perfil',          name: 'Objetivo',                         C: P.Objetivo },
  { id: 'bloqueio',     grp: 'Perfil',          name: 'Maior bloqueio',                   C: P.Bloqueio },
  { id: 'hoje',         grp: 'Perfil',          name: 'Fala hoje',                        C: P.Hoje },
  { id: 'prazo',        grp: 'Perfil',          name: 'Prazo desejado',                   C: P.Prazo },
  { id: 'horario',      grp: 'Rotina',          name: 'Horário',                          C: P.Horario },
  { id: 'minutos',      grp: 'Rotina',          name: 'Minutos por dia',                  C: P.Minutos },
  { id: 'temas',        grp: 'Rotina',          name: 'Temas',                            C: P.Temas },
  { id: 'projecao',     grp: 'Projeção',        name: 'Projeção',                         C: P.Projecao },
  { id: 'gerando',      grp: 'Projeção',        name: 'Gerando plano',       bare: true,  C: P.Gerando },
  { id: 'diagnostico',  grp: 'Projeção',        name: 'Diagnóstico',                      C: P.Diagnostico },
  { id: 'licao-brief',  grp: 'Primeira lição',  name: 'Briefing',                         C: X.LicaoBrief },
  { id: 'licao-chat',   grp: 'Primeira lição',  name: 'Diálogo',                          C: X.LicaoChat },
  { id: 'licao-fala',   grp: 'Primeira lição',  name: 'Sua vez (mic)',                    C: X.LicaoFala },
  { id: 'licao-fim',    grp: 'Primeira lição',  name: 'Lição concluída',                  C: X.LicaoFim },
  { id: 'plano',        grp: 'Plano',           name: 'Plano pronto',                     C: X.Plano },
  { id: 'compromisso',  grp: 'Compromisso',     name: 'Compromisso',                      C: X.Compromisso },
  { id: 'constelacao',  grp: 'Compromisso',     name: 'Constelação',                      C: X.ConstelacaoTela },
  { id: 'tonalidade',   grp: 'Tom',             name: 'Tonalidade',                       C: X.Tonalidade },
  { id: 'conta',        grp: 'Tom',             name: 'Criar conta',         bare: true,  C: X.Conta },
  { id: 'paywall',      grp: 'Tom',             name: 'Plano trimestral',                 C: X.Paywall },
  { id: 'home',         grp: 'App',             name: 'Home',                tab: true,   C: X.Home },
  { id: 'perfil',       grp: 'App',             name: 'Perfil e ajustes',    tab: true,   C: Voce },
  { id: 'login',        grp: 'App',             name: 'Login',               bare: true,  C: X.Login },
];

export const acharTela = id => SCREENS.find(s => s.id === id) || SCREENS[0];
export const ORDEM = SCREENS.map(s => s.id);

export const TABS = [
  ['Hoje', 'home'], ['Praticar', 'licao-brief'],
  ['Progresso', 'constelacao'], ['Você', 'perfil'],
];

/* Puxa o pedaço tardio na primeira folga da thread principal — depois de a
   primeira tela já ter pintado, e antes de alguém precisar dela.

   `requestIdleCallback` é o certo (só roda quando não há nada na fila); o
   Safari ainda não o tem, e lá um timer curto faz o mesmo papel bem o
   suficiente. */
if (typeof window !== 'undefined') {
  const ocioso = (fn, teto) => (typeof requestIdleCallback === 'function'
    ? requestIdleCallback(fn, { timeout: teto })
    : setTimeout(fn, teto));

  ocioso(() => {
    // Primeiro as telas: a falta delas seria visível (tela em branco por um
    // instante ao avançar).
    Promise.all([CAMINHOS.app(), CAMINHOS.voce()])
      // Depois o SDK do Supabase, que só a tela de conta usa. Fica pra segunda
      // folga de propósito: é o pedaço mais gordo e o mais tarde no fluxo.
      .then(() => ocioso(() => import('./conta').then((m) => m.aquecerConta()), 4000));
  }, 2500);
}
