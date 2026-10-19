import jsQR from "jsqr";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { parseWorkoutRef } from "./workoutRef";

/** Render a QR code to RGBA pixels like a camera frame would show it: dark modules on white, with a quiet zone. */
function render(text: string, scale: number, quiet = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const size = (n + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.modules.get(x, y)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + quiet) * scale + dy) * size + (x + quiet) * scale + dx) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  return { data, size };
}

describe("QR round trip (what the coach page shows, what the in-app scanner reads)", () => {
  const link = "https://crossfit-timer-yaqbot.vercel.app/t?w=k7m2p9xq4r";

  it.each([2, 3, 6])("decodes a saved-workout link at %ipx per module", (scale) => {
    const { data, size } = render(link, scale);
    const result = jsQR(data, size, size);
    expect(result?.data).toBe(link);
    expect(parseWorkoutRef(result!.data)).toEqual({ kind: "saved", id: "k7m2p9xq4r" });
  });

  it("returns nothing for a blank frame", () => {
    const data = new Uint8ClampedArray(200 * 200 * 4).fill(255);
    expect(jsQR(data, 200, 200)).toBeNull();
  });

  it("decodes but then rejects a QR that is not a timer link", () => {
    const { data, size } = render("https://example.com/menu", 4);
    const result = jsQR(data, size, size);
    expect(result?.data).toBe("https://example.com/menu");
    expect(parseWorkoutRef(result!.data)).toBeNull();
  });
});
