import path from "path";

export default {
  normal: {
    path: path.resolve(__dirname, "fixtures/normal.wav"),
    text: "my name is",
  },
  vulgarism: {
    path: path.resolve(__dirname, "fixtures/vulgarism.wav"),
    text: "what the fuck are you doing right now",
  },
} as Record<string, { path: string; text: string }>;
