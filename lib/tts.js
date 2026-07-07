// Encapsula a Web Speech API (speechSynthesis) — usada pro play de frases,
// respeitando profiles.voice_accent (us/uk) e audio_speed (0.75/1.0).
export function speak(text, { accent = 'us', rate = 1.0 } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Web Speech API não suportada nesse navegador — o botão de play
    // simplesmente não faz nada, sem quebrar a tela.
  }
}
