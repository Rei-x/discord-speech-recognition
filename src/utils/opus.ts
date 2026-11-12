import prism from "prism-media";
import type { TransformCallback } from "stream";

/**
 * Decodes opus packets from Discord to 16-bit stereo PCM with 48kHz sample rate.
 *
 * Uses whichever opus library is installed: `@discordjs/opus` or `opusscript`.
 * Packets that can't be decoded are skipped instead of crashing the process.
 */
export class OpusDecodingStream extends prism.opus.Decoder {
  constructor() {
    super({ rate: 48000, channels: 2, frameSize: 960 });
  }

  override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    let isDone = false;
    // The decoder reports corrupted packet as an error, which would destroy the stream
    const done = () => {
      if (isDone) return;
      isDone = true;
      callback();
    };
    try {
      super._transform(chunk, encoding, done);
    } catch {
      done();
    }
  }
}

/**
 * Throws a readable error when no opus library is installed, so users find out
 * when they set the bot up and not when someone starts talking.
 */
export function assertOpusLibraryInstalled(): void {
  try {
    new OpusDecodingStream().destroy();
  } catch (error) {
    throw new Error(
      "discord-speech-recognition needs an opus library to decode voice. Install one of them: `npm install @discordjs/opus` or `npm install opusscript`.",
      { cause: error },
    );
  }
}
