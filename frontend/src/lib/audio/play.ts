// Plays Zoha's pre-recorded Bangla clips in order: public/audio/<clip_id>.mp3 (manifest: docs/action-cards.md §4).
// No TTS. A missing clip is skipped and reported, so the app works before every clip is recorded.
// Android blocks autoplay: playback always starts from a tap (the Listen button), which unlocks audio.

let current: { audio: HTMLAudioElement; done: (ok: boolean) => void } | null = null;
let token = 0;

export function stopAudio() {
  token++;
  if (current) {
    current.audio.pause();
    current.done(true);
    current = null;
  }
}

/** Resolves with the ids that could not be played. */
export async function playClips(ids: string[], onClip?: (id: string | null) => void): Promise<string[]> {
  stopAudio();
  const my = ++token;
  const missing: string[] = [];
  for (const id of ids) {
    if (my !== token) break;
    onClip?.(id);
    const ok = await new Promise<boolean>((resolve) => {
      const audio = new Audio(`/audio/${id}.mp3`);
      current = { audio, done: resolve };
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
    if (!ok && my === token) missing.push(id);
  }
  if (my === token) {
    current = null;
    onClip?.(null);
  }
  return missing;
}
