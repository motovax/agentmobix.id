import { describe, expect, test } from "bun:test";
import { isAndroidDevice } from "../src/lib/pwa";

describe("deteksi perangkat Android untuk kartu instalasi", () => {
  test("mendeteksi Chrome Android", () => {
    expect(
      isAndroidDevice(
        "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/136 Mobile Safari/537.36",
      ),
    ).toBe(true);
  });

  test("tidak menampilkan fallback Android pada iPhone", () => {
    expect(
      isAndroidDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});
