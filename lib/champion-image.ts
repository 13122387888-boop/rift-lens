import catalog from "./champion-roles.json";

export function championPortraitPath(id: string): string | null {
  return /^\d+$/.test(id) && Object.hasOwn(catalog.champions, id)
    ? "./champions/" + id + ".png"
    : null;
}

const images = new Map<string, Promise<HTMLImageElement | null>>();
export function loadChampionPortrait(id: string): Promise<HTMLImageElement | null> {
  const path = championPortraitPath(id);
  if (!path) return Promise.resolve(null);
  const cached = images.get(id);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    const finish = (value: HTMLImageElement | null) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 15000);
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    // These assets are served beside the app, including on the Pages subpath.
    img.crossOrigin = "anonymous";
    img.src = path;
  });
  images.set(id, pending);
  if (images.size > 48) images.delete(images.keys().next().value!);
  void pending.then((value) => {
    if (!value && images.get(id) === pending) images.delete(id);
  });
  return pending;
}
