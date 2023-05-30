import dotenv from "dotenv";

dotenv.config();

class EnvError extends Error {
  constructor(envVariableName: string) {
    super(`${envVariableName} wasn't specified in environmental variables.`);
  }
}

const getConfigObject = <T extends string>(variables: Array<T>) => {
  const config: Record<string, string> = {};
  variables.forEach((variable) => {
    const value = process.env[variable];
    if (!value) throw new EnvError(variable);
    config[variable] = value;
  });
  return config as Record<T, string>;
};

export default getConfigObject([
  "BOT_TOKEN",
  "TESTBOT_TOKEN",
  "GUILD_ID",
  "WITAI_KEY",
]);
