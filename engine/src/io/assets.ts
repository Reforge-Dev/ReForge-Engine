import type { AssetStore } from "../types";

export type ImageLoader = (url: string) => Promise<HTMLImageElement>;

const SCHEME = /^([a-z][a-z0-9+.-]*:|\/)/i;

/** Join a game-relative path onto the asset base. Absolute urls and data urls pass through. */
export function resolveAsset(base: string, path: string): string {
  if (SCHEME.test(path)) return path;
  const head = base === "" ? "./" : base.endsWith("/") ? base : `${base}/`;
  const tail = path.startsWith("./") ? path.slice(2) : path;
  return head + tail;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`failed to load ${url}`));
    };
    img.src = url;
  });
}

/** Image cache keyed by resolved url. Failed urls are remembered so they are not retried every frame. */
export function createAssetStore(base = "./", loader: ImageLoader = loadImage): AssetStore {
  const loaded = new Map<string, HTMLImageElement>();
  const pending = new Map<string, Promise<boolean>>();

  function load(url: string): Promise<boolean> {
    const existing = pending.get(url);
    if (existing) return existing;
    const job = loader(url).then(
      (img) => {
        loaded.set(url, img);
        return true;
      },
      () => false,
    );
    pending.set(url, job);
    return job;
  }

  return {
    resolve: (path) => resolveAsset(base, path),
    async preload(paths) {
      const unique = [...new Set(paths)];
      const results = await Promise.all(unique.map((p) => load(resolveAsset(base, p))));
      return { failed: unique.filter((_, i) => results[i] === false) };
    },
    get: (path) => loaded.get(resolveAsset(base, path)) ?? null,
  };
}
