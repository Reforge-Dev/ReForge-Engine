import { describe, expect, it } from "vitest";
import { createAssetStore, resolveAsset } from "./assets";

const fakeImage = (name: string): HTMLImageElement =>
  ({ src: name }) as unknown as HTMLImageElement;

describe("resolveAsset", () => {
  it("joins relative paths onto the base", () => {
    expect(resolveAsset("./", "assets/a.png")).toBe("./assets/a.png");
    expect(resolveAsset("./game", "./assets/a.png")).toBe("./game/assets/a.png");
    expect(resolveAsset("https://x.test/g/", "a.png")).toBe("https://x.test/g/a.png");
    expect(resolveAsset("", "a.png")).toBe("./a.png");
  });

  it("leaves absolute and data urls alone", () => {
    expect(resolveAsset("./", "https://x.test/a.png")).toBe("https://x.test/a.png");
    expect(resolveAsset("./", "/a.png")).toBe("/a.png");
    expect(resolveAsset("./", "data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });
});

describe("createAssetStore", () => {
  it("loads once per resolved url and serves get()", async () => {
    const urls: string[] = [];
    const store = createAssetStore("./base", (url) => {
      urls.push(url);
      return Promise.resolve(fakeImage(url));
    });
    const result = await store.preload(["a.png", "./a.png", "a.png"]);
    expect(result.failed).toEqual([]);
    expect(urls).toEqual(["./base/a.png"]);
    expect(store.get("a.png")?.src).toBe("./base/a.png");
    expect(store.get("missing.png")).toBeNull();
  });

  it("reports failures without rejecting and does not retry them", async () => {
    let calls = 0;
    const store = createAssetStore("./", (url) => {
      calls += 1;
      return url.endsWith("bad.png")
        ? Promise.reject(new Error("404"))
        : Promise.resolve(fakeImage(url));
    });
    const result = await store.preload(["ok.png", "bad.png"]);
    expect(result.failed).toEqual(["bad.png"]);
    expect(store.get("bad.png")).toBeNull();
    expect(store.get("ok.png")).not.toBeNull();
    await store.preload(["bad.png"]);
    expect(calls).toBe(2);
  });
});
