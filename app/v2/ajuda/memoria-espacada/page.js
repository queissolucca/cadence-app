import { HelpArticle } from '../../../../components/v2/HelpArticle';

export default function MemoriaEspacadaPage() {
  return (
    <HelpArticle title="Memória espaçada">
      <p>
        Toda frase que você erra (ou pratica de novo) entra numa fila de revisão com 4 estágios: <strong>hoje</strong>,{' '}
        <strong>amanhã</strong>, <strong>1 semana</strong> e <strong>1 mês</strong>.
      </p>
      <p>
        Você acerta uma revisão, ela avança pro próximo estágio — e só volta a te aparecer quando esse prazo vencer, não
        antes. Errar uma revisão zera o progresso dela: ela volta pro estágio &quot;hoje&quot; e recomeça o caminho.
      </p>
      <p>
        Uma frase só é considerada <strong>dominada</strong> depois de passar pela revisão de 1 mês com sucesso — ou
        seja, você precisa acertar a mesma frase em 4 momentos espaçados diferentes, não só uma vez.
      </p>
      <p>
        Por que isso importa: decorar uma coisa uma vez só não fixa nada. O cérebro esquece rápido. Revisar no momento
        certo — nem cedo demais (ainda lembra, é perda de tempo) nem tarde demais (já esqueceu, tem que aprender de
        novo) — é o que faz uma frase virar conhecimento de verdade, sem precisar repetir 50 vezes na mesma sessão.
      </p>
      <p>
        Por isso o app sempre mistura revisões vencidas com exercícios novos na mesma sessão — não tem uma tela
        separada de &quot;revisão&quot; pra você lembrar de abrir. Se está na hora certa, ela já aparece.
      </p>
    </HelpArticle>
  );
}
