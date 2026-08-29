export type Variant = { bit_rate?: number; content_type: string; url: string };
export type Media = { media_key: string; type: "video" | "animated_gif" | "photo"; variants?: Variant[]; preview_image_url?: string };
export type Tweet = { id: string; text: string; created_at?: string; attachments?: { media_keys?: string[] } };
export type BookmarksResponse = {
  data?: Tweet[];
  includes?: { media?: Media[] };
  meta?: { result_count?: number; next_token?: string };
  errors?: unknown[];
};
export type Video = { key: string; url: string; bitRate: number };
export type Item = {
  postId: string; text: string; postedAt: string | null; postUrl: string;
  previewUrl: string | null; hasVideoMedia: boolean; videos: Video[];
};

export function selectVariant(variants: Variant[] | undefined): Variant | null {
  const mp4 = (variants ?? []).filter((v) => v.content_type === "video/mp4");
  if (mp4.length === 0) return null;
  return mp4.reduce((best, v) => ((v.bit_rate ?? 0) > (best.bit_rate ?? 0) ? v : best));
}

export function parseBookmarks(res: BookmarksResponse): Item[] {
  const media = new Map((res.includes?.media ?? []).map((m) => [m.media_key, m]));
  return (res.data ?? []).map((t) => {
    const vids = (t.attachments?.media_keys ?? [])
      .map((k) => media.get(k))
      .filter((m): m is Media => !!m && (m.type === "video" || m.type === "animated_gif"));
    const videos = vids.flatMap((m, i) => {
      const v = selectVariant(m.variants);
      if (!v) return [];
      const key = vids.length > 1 ? `${t.id}-${i + 1}.mp4` : `${t.id}.mp4`;
      return [{ key, url: v.url, bitRate: v.bit_rate ?? 0 }];
    });
    return {
      postId: t.id, text: t.text, postedAt: t.created_at ?? null,
      postUrl: `https://x.com/i/status/${t.id}`,
      previewUrl: vids[0]?.preview_image_url ?? null,
      hasVideoMedia: vids.length > 0, videos,
    };
  });
}
