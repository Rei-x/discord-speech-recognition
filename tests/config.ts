import { existsSync } from "fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const discordVariables = ["BOT_TOKEN", "TESTBOT_TOKEN", "GUILD_ID"] as const;

const config = {
  BOT_TOKEN: process.env.BOT_TOKEN ?? "",
  TESTBOT_TOKEN: process.env.TESTBOT_TOKEN ?? "",
  GUILD_ID: process.env.GUILD_ID ?? "",
  WITAI_KEY: process.env.WITAI_KEY ?? "",
};

/**
 * Tests that use real Discord bots are skipped when tokens aren't specified, check .env.example
 */
export const hasDiscordConfig = discordVariables.every((name) => config[name]);

export const hasWitaiConfig = Boolean(config.WITAI_KEY);

export default config;
