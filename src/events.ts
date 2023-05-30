export enum SpeechEvents {
  /**
   * Emitted when someone ends talking in channel
   * <hr>
   *
   * Example usage:
   * ```javascript
   * client.on("speech", (msg) => {
   *   msg.author.send(msg.content);
   * });
   * ```
   * @event
   */
  speech = "speech",
  /**
   * Emitted when error occurs during processing audio stream. Usually when someone tries to talk using web version of discord. See https://github.com/discordjs/opus/issues/49
   * @param error
   * @event
   */
  audioStreamError = "audioStreamError",
  /**
   * Emitted when bot joins a voice channel and has not started speech recognition in it
   * @event
   */
  voiceJoin = "voiceJoin",
}
