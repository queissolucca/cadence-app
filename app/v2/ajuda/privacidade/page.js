import Link from 'next/link';
import { HelpArticle } from '../../../../components/v2/HelpArticle';

export default function PrivacidadePage() {
  return (
    <HelpArticle title="Privacidade e dados">
      <p>O que a cadence guarda pra fazer o app funcionar:</p>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <li>Suas respostas de escrita e fala (como texto), pra corrigir e pra virarem frases de revisão.</li>
        <li>Os erros identificados nessas respostas, pra montar seu mapa de pontos fracos e seu progresso.</li>
        <li>Seu e-mail, nome (se você informou) e preferências de conta.</li>
      </ul>
      <p>
        <strong>Áudio não é armazenado — só a transcrição.</strong> Quando você fala num exercício, o navegador
        transcreve sua voz em texto na hora; é esse texto que chega pra correção e fica salvo. O áudio em si nunca sai
        do seu dispositivo nem é gravado em lugar nenhum.
      </p>
      <p>
        As correções passam pela API da Anthropic (Claude) só pra gerar o feedback — não guardamos histórico de
        conversa com a IA além do que já está descrito acima.
      </p>
      <p>
        <strong>Como excluir sua conta:</strong> ainda não temos um botão de autoatendimento pra isso. Manda uma
        mensagem pela{' '}
        <Link href="/v2/ajuda/feedback" style={{ color: 'var(--green-dark)', textDecoration: 'underline' }}>
          página de feedback
        </Link>{' '}
        pedindo a exclusão, com o e-mail da sua conta — a gente remove seus dados e confirma quando estiver feito.
      </p>
    </HelpArticle>
  );
}
