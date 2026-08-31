import { HelpArticle } from '../../../../components/v2/HelpArticle';

export default function PrivacidadePage() {
  return (
    <HelpArticle title="Privacidade e dados">
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        Última atualização: agosto de 2026 · Documento em conformidade com a Lei nº 13.709/2018 (LGPD).
      </p>

      <p>
        A cadence (&quot;Controladora&quot;) trata dados pessoais do titular (&quot;Usuário&quot;) observando os princípios
        de finalidade, adequação, necessidade, transparência, segurança e prevenção previstos no art. 6º da LGPD. O
        tratamento restringe-se ao estritamente indispensável à prestação do serviço de aprendizagem de idioma,
        vedada qualquer utilização incompatível com as finalidades aqui declaradas.
      </p>

      <p><strong>1. Dados tratados e finalidade.</strong> São objeto de tratamento: (i) dados cadastrais (nome, quando
        informado, e endereço de e-mail), para autenticação e individualização da conta; (ii) as transcrições
        textuais das suas produções escritas e orais, para geração de correção pedagógica e composição dos itens de
        revisão; e (iii) metadados de uso (marcações temporais de sessão e progresso), para o cômputo de sequência
        (&quot;streak&quot;) e trilha. Não são coletados dados sensíveis na acepção do art. 5º, II, da LGPD.
      </p>

      <p><strong>2. Não retenção de áudio.</strong> O sinal de áudio das sessões de fala é processado de forma efêmera
        e em tempo real para fins exclusivos de transcrição, não sendo armazenado, gravado ou reproduzido em qualquer
        repositório persistente. Apenas a representação textual resultante é retida, nos termos do item 1.
      </p>

      <p><strong>3. Base legal.</strong> O tratamento fundamenta-se na execução de contrato do qual o Usuário é parte
        (art. 7º, V) e, subsidiariamente, no legítimo interesse da Controladora em aprimorar a qualidade do serviço
        (art. 7º, IX), sempre mediante avaliação de proporcionalidade e salvaguarda dos direitos e liberdades
        fundamentais do titular.
      </p>

      <p><strong>4. Operadores e transferência.</strong> A Controladora vale-se de operadores contratualmente
        vinculados a obrigações de confidencialidade e segurança: infraestrutura de hospedagem e borda (Vercel),
        banco de dados gerenciado (Supabase/PostgreSQL) e provedores de modelos de linguagem e de voz (Anthropic e
        ElevenLabs), acionados unicamente para gerar o retorno pedagógico. Eventuais transferências internacionais
        observam cláusulas contratuais e padrões de proteção compatíveis com o art. 33 da LGPD. Nenhum dado pessoal é
        comercializado, cedido ou compartilhado para fins publicitários de terceiros.
      </p>

      <p><strong>5. Medidas de segurança.</strong> Os dados trafegam exclusivamente sob canais cifrados (TLS 1.2 ou
        superior) e permanecem em repouso em ambiente gerenciado com criptografia. O isolamento lógico entre contas é
        garantido por políticas de segurança em nível de linha (<em>Row-Level Security</em>), de modo que cada
        registro é acessível somente ao respectivo titular autenticado; credenciais de acesso a serviços externos são
        mantidas server-side e jamais expostas ao cliente. Adotam-se, ainda, controles de autenticação de sessão e
        princípio do menor privilégio no acesso administrativo.
      </p>

      <p><strong>6. Retenção e finalização.</strong> Os dados são conservados enquanto vigente a relação de uso e
        pelo prazo necessário ao cumprimento de obrigações legais e regulatórias, findos os quais são eliminados ou
        anonimizados de forma irreversível, nos termos do art. 16 da LGPD.
      </p>

      <p><strong>7. Direitos do titular.</strong> São assegurados ao Usuário os direitos previstos no art. 18 da LGPD,
        incluídos a confirmação da existência de tratamento, o acesso, a correção, a portabilidade e a eliminação dos
        dados tratados com consentimento, exercitáveis mediante requisição à Controladora, que responderá nos prazos
        legais e observada a devida verificação de titularidade.
      </p>

      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        Em resumo, e sem prejuízo do rigor jurídico acima: coletamos o mínimo, não gravamos seu áudio, ciframos tudo
        em trânsito e em repouso, isolamos os dados de cada conta e não vendemos nada a ninguém.
      </p>
    </HelpArticle>
  );
}
