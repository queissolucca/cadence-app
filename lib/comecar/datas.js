/* No protótipo "hoje" era uma data fixa cravada no código. Num site de verdade
   ela precisa ser a data de quem está lendo — senão a meta do plano nasce
   vencida no dia seguinte. */
export const addDias = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

export const fmt = d => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

/* Quanto tempo até "solto", por minuto/dia. Mais minutos, menos dias. */
export const metaDias = min => ({ 5: 78, 10: 52, 20: 34, 30: 26 }[min] || 60);
