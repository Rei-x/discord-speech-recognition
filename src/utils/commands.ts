import { Message } from "discord.js";

export function exit(msg: Message) {
  // Use optional chaining when we upgrade to Node 14.
  if (
    !(
      msg &&
      msg.guild &&
      msg.guild.voice &&
      msg.guild.voice.channel &&
      msg.guild.voice.connection
    )
  ) {
    return;
  }

  const {
    channel: voiceChannel,
    connection: conn,
  } = msg.guild.voice;
  const dispatcher = conn.play(__dirname + '/../sounds/badumtss.mp3', {
    volume: 0.45,
  });
  dispatcher.on('finish', () => {
    voiceChannel.leave();
    console.log(`\nSTOPPED RECORDING\n`);
  });
};
