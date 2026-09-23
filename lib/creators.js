// "Para Creators" (aba Perfil): o formulário de quem cria conteúdo e quer
// falar com a gente. Regras num lugar só — o diálogo usa pra travar o botão e
// mostrar o erro do campo, a rota /api/creators usa pra não confiar no cliente.

export const NICHOS = [
  'Idiomas e educação',
  'Carreira e negócios',
  'Estudos e concursos',
  'Viagem',
  'Lifestyle',
  'Humor e entretenimento',
  'Fitness e esporte',
  'Moda e beleza',
  'Tecnologia',
  'Games',
  'Maternidade e família',
];
export const NICHO_OUTROS = 'Outros';

// Tira tudo que não é número — o telefone só aceita dígitos.
export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

// 9 dígitos → 91234-5678; 8 dígitos (fixo) → 1234-5678. Só pra exibir.
export function formatarNumero(v) {
  const d = soDigitos(v).slice(0, 9);
  if (d.length <= 4) return d;
  const corte = d.length === 9 ? 5 : 4;
  return `${d.slice(0, corte)}-${d.slice(corte)}`;
}

// Aceita com ou sem @ na frente e devolve sempre com um @ só.
export function normalizarInstagram(v) {
  const semArroba = String(v ?? '').trim().replace(/^@+/, '');
  return semArroba ? `@${semArroba}` : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Regra do Instagram: letras, números, ponto e underline, até 30 caracteres.
const INSTAGRAM_RE = /^@[A-Za-z0-9._]{1,30}$/;

// Devolve { campo: mensagem } — objeto vazio quando está tudo certo.
export function validarCreator({ email, ddd, telefone, instagram, nichos, outro } = {}) {
  const erros = {};
  const e = String(email ?? '').trim();
  if (!e) erros.email = 'Coloca seu e-mail.';
  else if (!EMAIL_RE.test(e)) erros.email = 'E-mail inválido — precisa ter @ e domínio (ex: nome@gmail.com).';

  const dddD = soDigitos(ddd);
  const telD = soDigitos(telefone);
  if (!dddD || !telD) erros.telefone = 'Coloca o DDD e o número.';
  else if (!/^[1-9][1-9]$/.test(dddD)) erros.telefone = 'DDD inválido — são 2 números (ex: 11).';
  else if (telD.length < 8 || telD.length > 9) erros.telefone = 'O número tem 8 ou 9 dígitos, sem o DDD.';

  const ig = normalizarInstagram(instagram);
  if (!ig) erros.instagram = 'Coloca seu @ do Instagram.';
  else if (!INSTAGRAM_RE.test(ig)) erros.instagram = '@ inválido — só letras, números, ponto e _.';

  const lista = Array.isArray(nichos) ? nichos : [];
  const validos = lista.filter((n) => NICHOS.includes(n) || n === NICHO_OUTROS);
  if (validos.length === 0) erros.nichos = 'Marca pelo menos um nicho.';
  else if (validos.includes(NICHO_OUTROS) && !String(outro ?? '').trim()) erros.nichos = 'Escreve qual é o seu nicho em "Outros".';

  return erros;
}

// Os dados já limpos, no formato que vai pro banco.
export function limparCreator({ email, ddd, telefone, instagram, nichos, outro } = {}) {
  const lista = (Array.isArray(nichos) ? nichos : []).filter((n) => NICHOS.includes(n) || n === NICHO_OUTROS);
  const temOutros = lista.includes(NICHO_OUTROS);
  return {
    email: String(email ?? '').trim().toLowerCase().slice(0, 200),
    ddd: soDigitos(ddd).slice(0, 2),
    telefone: soDigitos(telefone).slice(0, 9),
    instagram: normalizarInstagram(instagram).slice(0, 31),
    nichos: [...new Set(lista)],
    nicho_outro: temOutros ? String(outro ?? '').trim().slice(0, 200) : null,
  };
}
