import type { VerifiedSpot } from "../../_data/anilist-types";
import { placesApiKey, searchLocalDetours } from "../../_data/google-places";

export const runtime = "nodejs";

// 地域の寄り道は DB ではなく、Gemini（Google マップ グラウンディング）と Places API から取得する。
// 聖地の座標はクライアントの値を信用せず、DB の確認済み地点を再取得して使う。

type Input = { workId: string; region: string; spotIds: string[]; visitDate: string };

const requestTimes = new Map<string, number[]>();
const LIMIT_PER_MINUTE = 3;

function rateLimited(ip: string) {
  const now = Date.now();
  for (const [key, times] of requestTimes) {
    const recent = times.filter((time) => now - time < 60_000);
    if (recent.length) requestTimes.set(key, recent);
    else requestTimes.delete(key);
  }
  const times = requestTimes.get(ip) ?? [];
  if (times.length >= LIMIT_PER_MINUTE) return true;
  requestTimes.set(ip, [...times, now]);
  return false;
}

function validate(value: unknown): Input | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Input>;
  if (typeof item.workId !== "string" || !/^w_[a-z0-9]+$/.test(item.workId)) return null;
  if (typeof item.region !== "string" || item.region.length < 1 || item.region.length > 80) return null;
  if (!Array.isArray(item.spotIds) || item.spotIds.length < 1 || item.spotIds.length > 3 ||
    item.spotIds.some((id) => typeof id !== "string" || !/^p_[a-z0-9]+$/.test(id)) || new Set(item.spotIds).size !== item.spotIds.length) return null;
  if (typeof item.visitDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.visitDate)) return null;
  return item as Input;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "許可されていない送信元です。" }, { status: 403 });
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 2048) return Response.json({ error: "入力が大きすぎます。" }, { status: 413 });
    raw = JSON.parse(body);
  } catch { return Response.json({ error: "JSON形式で入力してください。" }, { status: 400 }); }
  const input = validate(raw);
  if (!input) return Response.json({ error: "作品・地域・聖地・訪問日を確認してください。" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return Response.json({ error: "寄り道の検索回数が多いため、少し待って再試行してください。" }, { status: 429 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: "作品DBの設定がありません。" }, { status: 503 });
  const placesKey = placesApiKey();
  if (!placesKey) return Response.json({ error: "寄り道の検索にはGoogle Places APIの設定が必要です。", detours: [] }, { status: 503 });

  try {
    const spotsUrl = new URL(`${url}/rest/v1/verified_seichi_spots`);
    spotsUrl.searchParams.set("select", "id,work_id,name,region,latitude,longitude");
    spotsUrl.searchParams.set("work_id", `eq.${input.workId}`);
    spotsUrl.searchParams.set("region", `eq.${input.region}`);
    spotsUrl.searchParams.set("id", `in.(${input.spotIds.join(",")})`);
    const spotsResponse = await fetch(spotsUrl, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(7000) });
    if (!spotsResponse.ok) throw new Error("spots unavailable");
    const spots = await spotsResponse.json() as VerifiedSpot[];
    if (!Array.isArray(spots) || spots.length !== input.spotIds.length || spots.some((spot) => !Number.isFinite(spot.latitude) || !Number.isFinite(spot.longitude)))
      return Response.json({ error: "選択した確認済み聖地を取得できません。" }, { status: 422 });
    const ordered = input.spotIds.map((id) => spots.find((spot) => spot.id === id)!);
    const result = await searchLocalDetours(ordered, input.region, input.visitDate, placesKey, process.env.GEMINI_API_KEY ?? "");
    return Response.json({ ...result, routable: Boolean(process.env.GOOGLE_ROUTES_API_KEY) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "寄り道候補を取得できませんでした。時間をおいて再試行してください。" }, { status: 503 });
  }
}
