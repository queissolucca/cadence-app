/* Não existia arquivo de configuração — o projeto rodava só com os padrões do
   Next. Duas coisas que valem a pena e não mudam comportamento nenhum:

   1. `optimizePackageImports` reescreve import de barril (`import { Eye } from
      'lucide-react'`) pra import do arquivo exato. Sem isso, o pacote inteiro
      entra no grafo e o tree-shaking tem que provar, arquivo por arquivo, o que
      dá pra jogar fora — o que ele não consegue fazer inteiro. A lista aqui é
      só dos pacotes que este app importa por barril.

   2. `productionBrowserSourceMaps` fica DESLIGADO (é o padrão, mas explícito
      pra ninguém ligar sem perceber): mapa de fonte em produção é download de
      megabytes pro navegador guardar sem usar.

   `poweredByHeader:false` é só um header a menos em toda resposta. */
const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@elevenlabs/react'],
  },
};

module.exports = nextConfig;
