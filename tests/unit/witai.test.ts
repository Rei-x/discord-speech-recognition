import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSpeechWithWitai } from "../../src";

const mockFetch = (body: string, init?: ResponseInit) => {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(body, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const chunk = (data: object) => JSON.stringify(data, null, 2);

describe("wit.ai", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns text from the last chunk of the response", async () => {
    mockFetch(
      [
        chunk({ text: "my" }),
        chunk({ text: "my name" }),
        chunk({
          entities: {},
          intents: [],
          is_final: true,
          text: "my name is",
        }),
      ].join("\r\n"),
    );

    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "key" }),
    ).resolves.toBe("my name is");
  });

  it("handles braces and quotes inside of the text", async () => {
    mockFetch(
      [
        chunk({ text: "a } b" }),
        chunk({ text: 'say "{hi}" \\ ok', nested: { a: { b: 1 } } }),
      ].join("\r\n"),
    );

    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "key" }),
    ).resolves.toBe('say "{hi}" \\ ok');
  });

  it("handles response without line breaks", async () => {
    mockFetch('{"text":"one"}{"text":"two"}');

    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "key" }),
    ).resolves.toBe("two");
  });

  it("returns empty string when nothing was recognized", async () => {
    mockFetch(chunk({ entities: {}, intents: [], is_final: true }));

    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "key" }),
    ).resolves.toBe("");
  });

  it("sends the key and audio format", async () => {
    const fetchMock = mockFetch(chunk({ text: "hi" }));
    await resolveSpeechWithWitai(Buffer.alloc(4), { key: "secret" });

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret");
    expect(headers.get("Content-Type")).toContain("rate=48k");
  });

  it("throws without the key", async () => {
    await expect(resolveSpeechWithWitai(Buffer.alloc(4))).rejects.toThrow(
      "wit.ai API key wasn't specified.",
    );
    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "" }),
    ).rejects.toThrow("wit.ai API key wasn't specified.");
  });

  it("throws on http error", async () => {
    mockFetch("{}", { status: 401 });

    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "key" }),
    ).rejects.toThrow("Api error, code: 401");
  });

  it("throws on invalid response", async () => {
    mockFetch("");
    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "key" }),
    ).rejects.toThrow("Invalid API response");

    mockFetch("{ not json }");
    await expect(
      resolveSpeechWithWitai(Buffer.alloc(4), { key: "key" }),
    ).rejects.toThrow("Invalid API response");
  });
});
