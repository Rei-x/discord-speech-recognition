import {VoiceConnection} from 'discord.js';
import {VoiceMessage} from './bot/voiceMessage';

/**
* Emitted when bot joins a voice channel
* <hr>
*
* Example usage:
* ```javascript
* client.on('voiceJoin', (connection) => {
*   connection.play('audio.mp3');
* });
* ```
* @asMemberOf DiscordSR
* @event
*/
export declare function voiceJoin(connection: VoiceConnection): void;

/**
 * Emitted when someone ends talking in channel
 * @asMemberOf DiscordSR
 * @param voiceMessage
 * @event
 */
export declare function speech(voiceMessage: VoiceMessage): void;

