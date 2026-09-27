// 「うに」「酒」「和菓子」などのキーワードで、DBに登録した地元の店・施設（寄り道）を探し、
// 同じ地域に聖地がある作品を一緒に返す。

const CATEGORY_WORDS: Array<[RegExp, string]> = [
  [/^(食|食べ物|グルメ|ごはん|ご飯|料理|郷土料理)$/, "food"],
  [/^(買う|買い物|お土産|おみやげ|土産)$/, "shopping"],
  [/^(文化|歴史|伝統)$/, "culture"],
  [/^(体験)$/, "experience"],
];

type DetourRow = { id: string; name: string; region: string; category: string; local_relevance: string };

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 1 || q.length > 40) return Response.json({ error: "キーワードは1〜40文字で入力してください。" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: "地点DBの設定がありません。" }, { status: 503 });
  // PostgREST の or 条件を壊す記号は取り除く。
  const word = q.replace(/[,()*%\\"'.:]/g, " ").trim();
  const category = CATEGORY_WORDS.find(([pattern]) => pattern.test(q))?.[1];
  const conditions = [
    ...(word ? [`name.ilike.*${word}*`, `local_relevance.ilike.*${word}*`] : []),
    ...(category ? [`category.eq.${category}`] : []),
  ];
  if (!conditions.length) return Response.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });
  try {
    const headers = { apikey: key };
    const detoursUrl = new URL(`${url}/rest/v1/verified_local_detours`);
    detoursUrl.searchParams.set("select", "id,name,region,category,local_relevance");
    detoursUrl.searchParams.set("published", "eq.true");
    detoursUrl.searchParams.set("or", `(${conditions.join(",")})`);
    detoursUrl.searchParams.set("order", "name.asc");
    detoursUrl.searchParams.set("limit", "20");
    const detoursResponse = await fetch(detoursUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(7000) });
    if (!detoursResponse.ok) throw new Error("detours unavailable");
    const detours = await detoursResponse.json() as DetourRow[];
    if (!Array.isArray(detours)) throw new Error("invalid detours");
    if (!detours.length) return Response.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });

    const regions = [...new Set(detours.map((detour) => detour.region))];
    const spotsUrl = new URL(`${url}/rest/v1/verified_seichi_spots`);
    spotsUrl.searchParams.set("select", "work_id,region");
    spotsUrl.searchParams.set("published", "eq.true");
    spotsUrl.searchParams.set("region", `in.(${regions.map((region) => `"${region.replace(/"/g, "")}"`).join(",")})`);
    spotsUrl.searchParams.set("limit", "1000");
    const spotsResponse = await fetch(spotsUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(7000) });
    if (!spotsResponse.ok) throw new Error("spots unavailable");
    const spots = await spotsResponse.json() as Array<{ work_id: string; region: string }>;
    const workIds = [...new Set(spots.map((spot) => spot.work_id))];

    const titles = new Map<string, string>();
    if (workIds.length) {
      const worksUrl = new URL(`${url}/rest/v1/research_works`);
      worksUrl.searchParams.set("select", "id,title");
      worksUrl.searchParams.set("id", `in.(${workIds.join(",")})`);
      const worksResponse = await fetch(worksUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(7000) });
      if (worksResponse.ok) for (const work of await worksResponse.json() as Array<{ id: string; title: string }>) titles.set(work.id, work.title);
    }
    const results = detours.map((detour) => ({
      detour,
      works: [...new Set(spots.filter((spot) => spot.region === detour.region).map((spot) => spot.work_id))]
        .map((workId) => ({ workId, title: titles.get(workId) ?? workId })),
    }));
    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "寄り道を検索できませんでした。時間をおいて再試行してください。" }, { status: 503 });
  }
}
