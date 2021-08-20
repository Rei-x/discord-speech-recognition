import { AnyARecord } from "dns";
import dotenv from "dotenv";

dotenv.config();

class EnvError extends Error {
  constructor(envVariableName: string) {
    super(`${envVariableName} wasn't specified in environmental variables.`);
  }
}

const getConfigObject = (variables: Array<string>) => {
  const config: Record<string, string> = {};
  variables.forEach((variable) => {
    const value = process.env[variable];
    if (!value) throw new EnvError(variable);
    config[variable] = value;
  });
  return config;
};

const config = getConfigObject([
  "BOT_TOKEN",
  "TESTBOT_TOKEN",
  "GUILD_ID",
  "WITAI_KEY",
]);

export default config;
