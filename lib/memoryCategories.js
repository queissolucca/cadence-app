// Categorias da memória do usuário, sem nenhuma dependência de servidor.
//
// Isto morava só no lib/memory.js, que importa o SDK da Anthropic no topo — ou
// seja, qualquer componente de cliente que quisesse os rótulos teria que arrastar
// o SDK inteiro pro bundle. A saída até aqui foi copiar a lista à mão em cada
// tela (o MemoriesDialog tinha a própria cópia), o que dá em rótulos que
// divergem em silêncio. Agora é um arquivo só, importável dos dois lados; o
// lib/memory.js re-exporta pra não quebrar quem já importava de lá.

export const CATEGORIES = [
  'location', 'work', 'hobbies', 'relationships', 'family',
  'finance', 'health', 'goals', 'preferences', 'other',
];

export const CATEGORY_LABELS = {
  location: 'Onde mora',
  work: 'Trabalho & carreira',
  hobbies: 'Hobbies & interesses',
  relationships: 'Relacionamentos',
  family: 'Família',
  finance: 'Finanças',
  health: 'Saúde & bem-estar',
  goals: 'Objetivos',
  preferences: 'Gostos & preferências',
  other: 'Outros',
};

// Ordem de exibição — diferente da ordem de CATEGORIES, que existe só pra
// validar o que chega na API.
export const CATEGORY_ORDER = [
  'location', 'work', 'hobbies', 'preferences', 'relationships',
  'family', 'goals', 'finance', 'health', 'other',
];

// Do rótulo de volta pra chave — a nova interface guarda a memória agrupada por
// nome legível, então precisa do caminho inverso na hora de mandar pro banco.
export const CATEGORY_BY_LABEL = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([k, v]) => [v, k]),
);
