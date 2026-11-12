const BYTES_PER_SAMPLE = 2;
const SAMPLE_RATE = 48000;

/**
 * Convert 16-bit little-endian stereo PCM to mono by averaging both channels
 * @param input Buffer of stereo audio
 * @returns Buffer of mono audio
 */
export function convertStereoToMono(input: Buffer): Buffer {
  const frames = Math.floor(input.length / (BYTES_PER_SAMPLE * 2));
  const output = Buffer.allocUnsafe(frames * BYTES_PER_SAMPLE);
  for (let frame = 0; frame < frames; frame += 1) {
    const offset = frame * BYTES_PER_SAMPLE * 2;
    const left = input.readInt16LE(offset);
    const right = input.readInt16LE(offset + BYTES_PER_SAMPLE);
    output.writeInt16LE((left + right) >> 1, frame * BYTES_PER_SAMPLE);
  }
  return output;
}

/**
 * @param buffer 16-bit mono PCM audio with 48kHz sample rate
 * @returns Duration in seconds
 */
export function getDurationFromMonoBuffer(buffer: Buffer): number {
  return buffer.length / SAMPLE_RATE / BYTES_PER_SAMPLE;
}

/**
 * Wraps raw 16-bit PCM audio in a WAV container
 */
export function encodeWav(
  pcm: Buffer,
  { sampleRate, channels }: { sampleRate: number; channels: number },
): Buffer {
  const header = Buffer.alloc(44);
  const blockAlign = channels * BYTES_PER_SAMPLE;

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/**
 * Converts audio that speech recognition function receives (PCM mono 16-bit with 48kHz sample rate) to .wav file.
 * Most of speech recognition services accept .wav files, but not raw audio.
 */
export function pcmToWav(audioBuffer: Buffer): Buffer {
  return encodeWav(audioBuffer, { sampleRate: SAMPLE_RATE, channels: 1 });
}
