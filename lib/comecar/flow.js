import * as A from '../../components/comecar/screens/abertura';
import * as P from '../../components/comecar/screens/perfil';
import * as X from '../../components/comecar/screens/app';
import { Voce } from '../../components/comecar/screens/voce';

/* A ordem é o fluxo. `bare` esconde a trilha de pontos do topo (telas de
   abertura e de espera), `tab` liga a barra inferior do app. */
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
