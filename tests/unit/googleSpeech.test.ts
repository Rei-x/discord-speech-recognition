import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSpeechWithGoogleSpeechV2 } from "../../src";

const mockFetch = (body: string, init?: ResponseInit) => {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(body, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const transcript = (text: string) =>
  JSON.stringify({
    result: [{ alternative: [{ transcript: text, confidence: 0.9 }] }],
    result_index: 0,
  });

describe("Google Speech V2", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns transcript from the response", async () => {
    mockFetch(`{"result":[]}\n${transcript("hello world")}\n`);

    await expect(
      resolveSpeechWithGoogleSpeechV2(Buffer.alloc(4)),
    ).resolves.toBe("hello world");
  });

  it("returns empty string when nothing was recognized", async () => {
    mockFetch(`{"result":[]}\n`);
    await expect(
      resolveSpeechWithGoogleSpeechV2(Buffer.alloc(4)),
    ).resolves.toBe("");

    mockFetch("");
    await expect(
      resolveSpeechWithGoogleSpeechV2(Buffer.alloc(4)),
    ).resolves.toBe("");
  });

  it("throws on http error", async () => {
    mockFetch("Bad Request", { status: 400, statusText: "Bad Request" });

    await expect(
      resolveSpeechWithGoogleSpeechV2(Buffer.alloc(4)),
    ).rejects.toThrow("Google speech api error: 400 Bad Request");
  });

  it("throws on invalid response", async () => {
    mockFetch("<html>not a json</html>");

    await expect(
      resolveSpeechWithGoogleSpeechV2(Buffer.alloc(4)),
    ).rejects.toThrow("Google speech api error: failed to parse response");
  });

  it("uses defaults", async () => {
    const fetchMock = mockFetch(transcript("hi"));
    await resolveSpeechWithGoogleSpeechV2(Buffer.alloc(4));

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("lang")).toBe("en-US");
    expect(url.searchParams.get("pFilter")).toBe("1");
    expect(url.searchParams.get("output")).toBe("json");
    expect(url.searchParams.get("key")).toBeTruthy();
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });

  it("passes options to the api", async () => {
    const fetchMock = mockFetch(transcript("cześć"));
    await resolveSpeechWithGoogleSpeechV2(Buffer.alloc(4), {
      lang: "pl-PL",
      key: "my key&more",
      profanityFilter: false,
    });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("lang")).toBe("pl-PL");
    expect(url.searchParams.get("key")).toBe("my key&more");
    expect(url.searchParams.get("pFilter")).toBe("0");
  });
});
