import { Client } from "discord.js";
import { EventEmitter } from "events";

export default class Waiter extends EventEmitter {
  bots: Client[];

  readyBots: Set<string>;

  callback: CallableFunction | undefined;

  constructor(botsArray: Client[]) {
    super();
    this.bots = botsArray;
    this.readyBots = new Set();
  }

  waitForBots(callback: CallableFunction): void {
    this.callback = callback;
    this.bots.forEach((client) => {
      client.on("ready", () => {
        this.setReady(client);
      });
    });
  }

  /**
   * @private
   * @param client
   */
  setReady(client: Client): void {
    if (!client.user) return;
    const numberOfReadyClients = this.readyBots.add(client.user.username).size;

    if (this.callback && numberOfReadyClients === this.bots.length) {
      this.callback();
    }
  }
}
