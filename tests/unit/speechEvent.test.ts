import { OpusEncoder } from "@discordjs/opus";
import type { VoiceConnection } from "@discordjs/voice";
import type { Client, User } from "discord.js";
import { EventEmitter, once } from "events";
import { Readable } from "stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addSpeechEvent,
  pcmToWav,
  SpeechEvents,
  VoiceMessage,
} from "../../src";

const voiceMock = vi.hoisted(() => ({
  getVoiceConnection: vi.fn(),
  entersState: vi.fn(),
}));

vi.mock("@discordjs/voice", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@discordjs/voice")>()),
  getVoiceConnection: voiceMock.getVoiceConnection,
  entersState: voiceMock.entersState,
}));

const GUILD_ID = "guild";
const CHANNEL_ID = "channel";
const FRAME_BYTES = 960 * 2 * 2;

const encoder = new OpusEncoder(48000, 2);

/** Opus packets with a sine wave, each one is 20ms long */
const createOpusPackets = (seconds: number): Buffer[] => {
  const packets: Buffer[] = [];
  for (let frame = 0; frame < seconds * 50; frame += 1) {
    const pcm = Buffer.alloc(FRAME_BYTES);
    for (let sample = 0; sample < 960; sample += 1) {
      const value = Math.round(
        Math.sin(((frame * 960 + sample) / 48000) * 2 * Math.PI * 440) * 8000,
      );
      pcm.writeInt16LE(value, sample * 4);
      pcm.writeInt16LE(value, sample * 4 + 2);
    }
    packets.push(encoder.encode(pcm));
  }
  return packets;
};

const createUser = (id: string, bot = false) => ({ id, bot }) as User;

const createClient = (users: User[] = [createUser("user")]) => {
  const client = new EventEmitter() as EventEmitter & {
    user: { id: string };
    users: { cache: Map<string, User>; fetch: ReturnType<typeof vi.fn> };
    channels: { cache: Map<string, unknown> };
  };
  client.user = { id: "bot" };
  client.users = {
    cache: new Map(users.map((user) => [user.id, user])),
    fetch: vi.fn(async () => {
      throw new Error("Unknown user");
    }),
  };
  client.channels = {
    cache: new Map([
      [CHANNEL_ID, { id: CHANNEL_ID, isVoiceBased: () => true, guild: {} }],
    ]),
  };
  return client;
};

const createConnection = () => {
  const streams: Readable[] = [];
  const speaking = Object.assign(new EventEmitter(), {
    users: new Map<string, number>(),
  });
  const connection = {
    joinConfig: { channelId: CHANNEL_ID, guildId: GUILD_ID, selfDeaf: false },
    rejoinAttempts: 0,
    rejoin: vi.fn(),
    destroy: vi.fn(),
    state: { status: "ready" },
    receiver: {
      speaking,
      subscribe: vi.fn(() => {
        const stream = new Readable({ objectMode: true, read() {} });
        streams.push(stream);
        return stream;
      }),
    },
  };
  const emitter = new EventEmitter();
  Object.assign(connection, {
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
  });
  return { connection, speaking, streams };
};

type FakeClient = ReturnType<typeof createClient>;
type FakeConnection = ReturnType<typeof createConnection>;

const emitVoiceStateUpdate = (client: FakeClient) =>
  client.emit("voiceStateUpdate", {}, { guild: { id: GUILD_ID } });

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Sets everything up to the point, where the bot listens on the voice channel */
const setup = async (
  options: Parameters<typeof addSpeechEvent>[1] = {},
  client = createClient(),
) => {
  const fake = createConnection();
  const recognize = vi.fn(
    async (_audio: Buffer, _options?: object, _context?: object) => "hello",
  );
  voiceMock.getVoiceConnection.mockReturnValue(fake.connection);
  voiceMock.entersState.mockResolvedValue(fake.connection);

  const speechOptions = addSpeechEvent(client as unknown as Client, {
    speechRecognition: recognize,
    ...options,
  });
  emitVoiceStateUpdate(client);
  await flush();

  const messages: VoiceMessage[] = [];
  client.on(SpeechEvents.speech, (message: VoiceMessage) =>
    messages.push(message),
  );
  const errors: Error[] = [];
  client.on(SpeechEvents.audioStreamError, (error: Error) =>
    errors.push(error),
  );

  return { client, ...fake, recognize, speechOptions, messages, errors };
};

const speak = (
  { speaking, streams }: Pick<FakeConnection, "speaking" | "streams">,
  packets: Buffer[],
  userId = "user",
) => {
  const streamsBefore = streams.length;
  speaking.emit("start", userId);
  const stream = streams.at(-1);
  if (streams.length === streamsBefore || !stream) return undefined;
  packets.forEach((packet) => stream.push(packet));
  stream.push(null);
  return stream;
};

describe("speech event", () => {
  beforeEach(() => {
    voiceMock.getVoiceConnection.mockReset();
    voiceMock.entersState.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits voice message when user stops speaking", async () => {
    const context = await setup();

    speak(context, createOpusPackets(2));
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    expect(message).toBeInstanceOf(VoiceMessage);
    expect(message.content).toBe("hello");
    expect(message.error).toBeUndefined();
    expect(message.author.id).toBe("user");
    expect(message.duration).toBeCloseTo(2, 1);
    expect(message.connection).toBe(context.connection);
  });

  it("passes mono audio and options to speech recognition function", async () => {
    const context = await setup({ lang: "pl-PL" });

    speak(context, createOpusPackets(2));
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    const [audio, options] = context.recognize.mock.calls[0];
    expect(audio.length).toBe(2 * 48000 * 2);
    expect(options).toBe(context.speechOptions);
    expect(context.speechOptions.lang).toBe("pl-PL");
    expect(message.audioBuffer).toBe(audio);
  });

  it("saves audio with the same duration as the voice message", async () => {
    const context = await setup();

    speak(context, createOpusPackets(2));
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    const wavFile = message.toWav();
    const channels = wavFile.readUInt16LE(22);
    const byteRate = wavFile.readUInt32LE(28);
    expect(channels).toBe(1);
    expect((wavFile.length - 44) / byteRate).toBeCloseTo(message.duration, 5);
  });

  it("attaches speech recognition only once per connection", async () => {
    const client = createClient();
    const fake = createConnection();
    let makeReady = () => {};
    voiceMock.getVoiceConnection.mockReturnValue(fake.connection);
    voiceMock.entersState.mockReturnValue(
      new Promise<void>((resolve) => {
        makeReady = resolve;
      }),
    );
    const voiceJoin = vi.fn();
    client.on(SpeechEvents.voiceJoin, voiceJoin);

    addSpeechEvent(client as unknown as Client);
    // Voice state updates received before the connection is ready
    emitVoiceStateUpdate(client);
    emitVoiceStateUpdate(client);
    emitVoiceStateUpdate(client);
    makeReady();
    await flush();
    emitVoiceStateUpdate(client);
    await flush();

    expect(voiceJoin).toHaveBeenCalledTimes(1);
    expect(voiceJoin).toHaveBeenCalledWith(fake.connection);
    expect(fake.speaking.listenerCount("start")).toBe(1);
  });

  it("doesn't emit duplicates when speaking starts multiple times", async () => {
    const context = await setup();

    context.speaking.emit("start", "user");
    context.speaking.emit("start", "user");
    context.speaking.emit("start", "user");
    const stream = context.streams[0];
    createOpusPackets(2).forEach((packet) => stream.push(packet));
    stream.push(null);
    await flush();
    await flush();

    expect(context.connection.receiver.subscribe).toHaveBeenCalledTimes(1);
    expect(context.messages).toHaveLength(1);
  });

  it("listens to the same user again after voice message ends", async () => {
    const context = await setup();

    speak(context, createOpusPackets(2));
    await once(context.client, SpeechEvents.speech);
    speak(context, createOpusPackets(2));
    await once(context.client, SpeechEvents.speech);

    expect(context.connection.receiver.subscribe).toHaveBeenCalledTimes(2);
    expect(context.messages).toHaveLength(2);
  });

  it("listens to multiple users at the same time", async () => {
    const context = await setup(
      {},
      createClient([createUser("first"), createUser("second")]),
    );

    speak(context, createOpusPackets(2), "first");
    speak(context, createOpusPackets(1.5), "second");
    await flush();
    await flush();

    expect(context.messages.map((message) => message.author.id).sort()).toEqual(
      ["first", "second"],
    );
  });

  it("skips packets that can't be decoded", async () => {
    const context = await setup();
    const packets = createOpusPackets(2);
    // Opus packet with invalid length code
    packets.splice(10, 0, Buffer.from([0xff, 0xff, 0xff]));

    speak(context, packets);
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    expect(message.duration).toBeCloseTo(2, 1);
    expect(context.errors).toHaveLength(0);
  });

  it("keeps working when audio stream is destroyed", async () => {
    const context = await setup();

    context.speaking.emit("start", "user");
    createOpusPackets(2).forEach((packet) => context.streams[0].push(packet));
    await flush();
    context.streams[0].destroy();
    await flush();

    // Audio received before the stream was destroyed isn't lost
    expect(context.messages).toHaveLength(1);

    speak(context, createOpusPackets(2));
    await flush();
    expect(context.connection.receiver.subscribe).toHaveBeenCalledTimes(2);
    expect(context.messages).toHaveLength(2);
  });

  it("emits audioStreamError when audio stream fails", async () => {
    const context = await setup();

    context.speaking.emit("start", "user");
    context.streams[0].destroy(new Error("Stream failed"));
    await flush();

    expect(context.errors.map((error) => error.message)).toEqual([
      "Stream failed",
    ]);
    expect(context.messages).toHaveLength(0);

    speak(context, createOpusPackets(2));
    await flush();
    expect(context.messages).toHaveLength(1);
  });

  it("sets error when speech recognition fails", async () => {
    const context = await setup();
    context.recognize.mockRejectedValueOnce(new Error("Api is down"));

    speak(context, createOpusPackets(2));
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    expect(message.content).toBeUndefined();
    expect(message.error?.message).toBe("Api is down");
  });

  it("ignores too short voice messages", async () => {
    const context = await setup();

    speak(context, createOpusPackets(0.5));
    await flush();
    expect(context.messages).toHaveLength(0);

    context.speechOptions.minimalVoiceMessageDuration = 0.2;
    speak(context, createOpusPackets(0.5));
    await flush();
    expect(context.messages).toHaveLength(1);
  });

  it("splits too long speech into multiple voice messages", async () => {
    const context = await setup({ maximalVoiceMessageDuration: 2 });

    // User transmits without any pause, so `start` is emitted only once
    context.speaking.users.set("user", Date.now());
    context.speaking.emit("start", "user");
    createOpusPackets(2.5).forEach((packet) => context.streams[0].push(packet));
    await flush();

    expect(context.messages).toHaveLength(1);
    expect(context.messages[0].duration).toBeCloseTo(2, 1);
    expect(context.streams[0].destroyed).toBe(true);
    expect(context.streams).toHaveLength(2);

    createOpusPackets(1.5).forEach((packet) => context.streams[1].push(packet));
    context.speaking.users.delete("user");
    context.streams[1].push(null);
    await flush();

    expect(context.messages).toHaveLength(2);
    expect(context.messages[1].duration).toBeCloseTo(1.5, 1);
    expect(context.streams).toHaveLength(2);
  });

  it("keeps listening to user that never stops transmitting", async () => {
    const context = await setup();

    context.speaking.users.set("user", Date.now());
    context.speaking.emit("start", "user");
    createOpusPackets(2).forEach((packet) => context.streams[0].push(packet));
    // Stream ends after silence, but packets are still coming
    context.streams[0].push(null);
    await flush();

    expect(context.messages).toHaveLength(1);
    expect(context.streams).toHaveLength(2);

    createOpusPackets(2).forEach((packet) => context.streams[1].push(packet));
    context.speaking.users.delete("user");
    context.streams[1].push(null);
    await flush();

    expect(context.messages).toHaveLength(2);
  });

  it("doesn't listen on destroyed connection", async () => {
    const context = await setup();

    context.speaking.users.set("user", Date.now());
    context.speaking.emit("start", "user");
    context.connection.state.status = "destroyed";
    context.streams[0].destroy();
    await flush();

    expect(context.streams).toHaveLength(1);
  });

  it("ignores bots by default", async () => {
    const context = await setup(
      {},
      createClient([createUser("bot", true), createUser("user")]),
    );

    expect(speak(context, createOpusPackets(2), "bot")).toBeUndefined();
    await flush();
    expect(context.messages).toHaveLength(0);

    context.speechOptions.ignoreBots = false;
    speak(context, createOpusPackets(2), "bot");
    await flush();
    expect(context.messages).toHaveLength(1);
  });

  it("uses shouldProcessSpeech to filter users", async () => {
    const shouldProcessSpeech = vi.fn((user: User) => user.id === "allowed");
    const context = await setup(
      { shouldProcessSpeech },
      createClient([createUser("allowed"), createUser("denied")]),
    );

    expect(speak(context, createOpusPackets(2), "denied")).toBeUndefined();
    speak(context, createOpusPackets(2), "allowed");
    await flush();

    expect(shouldProcessSpeech).toHaveBeenCalledTimes(2);
    expect(context.messages.map((message) => message.author.id)).toEqual([
      "allowed",
    ]);
  });

  it("doesn't listen when bot is deafened", async () => {
    const context = await setup();
    context.connection.joinConfig.selfDeaf = true;

    expect(speak(context, createOpusPackets(2))).toBeUndefined();
    await flush();

    expect(context.messages).toHaveLength(0);
  });

  it("fetches user that isn't cached", async () => {
    const client = createClient([]);
    client.users.fetch.mockResolvedValue(createUser("stranger"));
    const context = await setup({}, client);

    speak(context, createOpusPackets(2), "stranger");
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    expect(client.users.fetch).toHaveBeenCalledWith("stranger");
    expect(message.author.id).toBe("stranger");
  });

  it("applies filters to fetched user", async () => {
    const client = createClient([]);
    client.users.fetch.mockResolvedValue(createUser("bot", true));
    const context = await setup({}, client);

    speak(context, createOpusPackets(2), "bot");
    await flush();

    expect(client.users.fetch).toHaveBeenCalled();
    expect(context.messages).toHaveLength(0);
  });

  it("ignores speech of user that can't be fetched", async () => {
    const context = await setup({}, createClient([]));

    speak(context, createOpusPackets(2), "ghost");
    await flush();

    expect(context.messages).toHaveLength(0);
    expect(context.errors).toHaveLength(0);
  });

  it("retries when connection doesn't become ready", async () => {
    const unhandledRejection = vi.fn();
    process.on("unhandledRejection", unhandledRejection);
    const client = createClient();
    const fake = createConnection();
    voiceMock.getVoiceConnection.mockReturnValue(fake.connection);
    voiceMock.entersState.mockRejectedValueOnce(new Error("Timed out"));
    voiceMock.entersState.mockResolvedValue(fake.connection);

    addSpeechEvent(client as unknown as Client);
    emitVoiceStateUpdate(client);
    await flush();
    expect(fake.speaking.listenerCount("start")).toBe(0);

    emitVoiceStateUpdate(client);
    await flush();
    process.off("unhandledRejection", unhandledRejection);

    expect(fake.speaking.listenerCount("start")).toBe(1);
    expect(unhandledRejection).not.toHaveBeenCalled();
  });

  it("doesn't rejoin the channel when bot gets disconnected", async () => {
    const context = await setup();

    (context.connection as unknown as VoiceConnection).emit(
      "disconnected",
      {},
      {},
    );
    await flush();

    expect(context.connection.rejoin).not.toHaveBeenCalled();
    expect(context.connection.destroy).not.toHaveBeenCalled();
  });

  it("passes the connection to shouldProcessSpeech", async () => {
    const shouldProcessSpeech = vi.fn(
      (_user: User, connection: VoiceConnection) =>
        connection.joinConfig.guildId === "other guild",
    );
    const context = await setup({ shouldProcessSpeech });

    expect(speak(context, createOpusPackets(2))).toBeUndefined();
    expect(shouldProcessSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user" }),
      context.connection,
    );

    context.connection.joinConfig.guildId = "other guild";
    speak(context, createOpusPackets(2));
    await flush();
    expect(context.messages).toHaveLength(1);
  });

  it("tells speech recognition function who spoke and where", async () => {
    const context = await setup();

    speak(context, createOpusPackets(2));
    await once(context.client, SpeechEvents.speech);

    expect(context.recognize.mock.calls[0][2]).toEqual({
      user: expect.objectContaining({ id: "user" }),
      connection: context.connection,
    });
  });

  it("emits audio without content when speech recognition is turned off", async () => {
    const context = await setup({ speechRecognition: undefined });

    speak(context, createOpusPackets(2));
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    expect(message.content).toBeUndefined();
    expect(message.error).toBeUndefined();
    expect(message.audioBuffer.length).toBe(2 * 48000 * 2);
    expect(pcmToWav(message.audioBuffer).equals(message.toWav())).toBe(true);
  });

  it("sets the time when user started speaking", async () => {
    const context = await setup();
    const before = Date.now();

    speak(context, createOpusPackets(2));
    const [message] = (await once(context.client, SpeechEvents.speech)) as [
      VoiceMessage,
    ];

    expect(message.startTimestamp).toBeGreaterThanOrEqual(before);
    expect(message.startTimestamp).toBeLessThanOrEqual(Date.now());
  });

  it("finds connection that uses id of the bot as the group", async () => {
    const client = createClient();
    const fake = createConnection();
    voiceMock.getVoiceConnection.mockImplementation(
      (_guildId: string, group?: string) =>
        group === "bot" ? fake.connection : undefined,
    );
    voiceMock.entersState.mockResolvedValue(fake.connection);

    addSpeechEvent(client as unknown as Client);
    emitVoiceStateUpdate(client);
    await flush();

    expect(fake.speaking.listenerCount("start")).toBe(1);
  });

  it("does nothing when there is no voice connection", async () => {
    const client = createClient();
    voiceMock.getVoiceConnection.mockReturnValue(undefined);
    const voiceJoin = vi.fn();
    client.on(SpeechEvents.voiceJoin, voiceJoin);

    addSpeechEvent(client as unknown as Client, { group: "music" });
    emitVoiceStateUpdate(client);

    expect(voiceMock.getVoiceConnection).toHaveBeenCalledWith(
      GUILD_ID,
      "music",
    );
    expect(voiceJoin).not.toHaveBeenCalled();
  });
});
