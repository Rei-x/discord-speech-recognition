import {VoiceConnection} from 'discord.js';
import {VoiceMessage} from './bot/voiceMessage';

/**
* Emitted when bot joins a voice channel
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

