// Versão do Cadence — mostrada na aba Ajustes. Fonte única: bump aqui a cada
// deploy.
//
// Regras de bump:
//   • ajuste pequeno de feature  -> 3ª casa   (1.6.0 -> 1.6.1 -> 1.6.2 …)
//   • nova aba / nova feature     -> 2ª casa   (1.6.x -> 1.7.0)
//   • a 2ª casa NÃO passa de 9: ao virar de 1.9 pra "1.10", vira 2.1
//     (pula 1.10 e 2.0). Ex: 1.9.3 -> (nova feature) 2.1.0
export const APP_VERSION = '2.7.0';
