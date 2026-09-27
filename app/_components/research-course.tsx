"use client";

import { useEffect, useRef, useState } from "react";
import type { VerifiedDetour } from "../_data/anilist-types";
import { DETOUR_CATEGORY_LABELS, insertDetours, openingHoursTextFor } from "../_data/local-detours";
import { isKnownClosed } from "../_data/real-planner";
import type { ResearchWork } from "../_data/research-works";
import type { ResearchSpot } from "../_data/research-spots";
import { displayVersion } from "../_data/work-genres";

const MAX_STOPS = 3;
const MAX_DETOURS = 2;

type Anchor = { id: string; latitude: number; longitude: number; placeId: string; mapsUri: string | null };
type DetourState = { status: "idle" | "loading" | "ready" | "error"; message?: string; unlocated?: string[] };
/** 経路リンクに渡す1地点。聖地は名称で、位置を特定できた地点と寄り道は Place ID も渡す。 */
type RoutePoint = { id: string; name: string; query: string; placeId: string | null; detour: VerifiedDetour | null };

function todayInJapan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function pointDirectionsUrl(from: RoutePoint, to: RoutePoint) {
  const params = new URLSearchParams({ api: "1", origin: from.query, destination: to.query });
  if (from.placeId) params.set("origin_place_id", from.placeId);
  if (to.placeId) params.set("destination_place_id", to.placeId);
  return `https://www.google.com/maps/dir/?${params}`;
}

function pointRouteUrl(points: RoutePoint[]) {
  const first = points[0];
  const last = points[points.length - 1];
  const params = new URLSearchParams({ api: "1", origin: first.query, destination: last.query });
  if (first.placeId) params.set("origin_place_id", first.placeId);
  if (last.placeId) params.set("destination_place_id", last.placeId);
  const middle = points.slice(1, -1);
  if (middle.length) {
    params.set("waypoints", middle.map((point) => point.query).join("|"));
    if (middle.every((point) => point.placeId)) params.set("waypoint_place_ids", middle.map((point) => point.placeId).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params}`;
}

function placeQuery(spot: ResearchSpot) {
  return `${spot.region.replace("・", " ")} ${spot.name}`;
}

function placeUrl(spot: ResearchSpot) {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: placeQuery(spot) })}`;
}

function spotNotes(spot: ResearchSpot) {
  const notes: string[] = [];
  if (spot.granularity !== "地点") notes.push(`${spot.granularity}単位の候補です。正確な場所は出典で確認してください。`);
  if (spot.sourceStage.startsWith("推しワク")) notes.push("紹介サイトの掲載情報です。現地の状況は未確認です。");
  else if (spot.sourceStage !== "本文記載確認") notes.push("掲載情報を確認中の地点です。");
  return notes;
}

function SpotLinks({ spot }: { spot: ResearchSpot }) {
  return <div className="spot-links">
    <a href={placeUrl(spot)} target="_blank" rel="noreferrer">Googleマップで場所を見る ↗</a>
    <a href={spot.sourceUrl} target="_blank" rel="noreferrer">出典 ↗</a>
    {spot.listingUrl ? <a href={spot.listingUrl} target="_blank" rel="noreferrer">推しワク掲載ページ ↗</a> : null}
  </div>;
}

export default function ResearchCourse({ work, region, onBack }: { work: ResearchWork; region: string; onBack: () => void }) {
  const [spots, setSpots] = useState<ResearchSpot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [visitDate, setVisitDate] = useState(todayInJapan);
  const [detours, setDetours] = useState<VerifiedDetour[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [detourState, setDetourState] = useState<DetourState>({ status: "idle" });
  const [selectedDetourIds, setSelectedDetourIds] = useState<string[]>([]);
  const detourKey = useRef("");
  const version = displayVersion(work.version);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/research-spots?workId=${encodeURIComponent(work.id)}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("地点を取得できませんでした。");
      const data = await response.json();
      const matching = (Array.isArray(data.spots) ? data.spots : []).filter((spot: ResearchSpot) => spot.region === region);
      setSpots(matching);
      setSelectedIds(matching.slice(0, MAX_STOPS).map((spot: ResearchSpot) => spot.id));
      setError("");
      setLoading(false);
    }).catch(() => { if (!controller.signal.aborted) { setError("地点を取得できませんでした。通信状況を確認して、もう一度お試しください。"); setLoading(false); } });
    return () => controller.abort();
  }, [work.id, region, attempt]);

  function resetDetours() {
    detourKey.current = "";
    setDetours([]);
    setAnchors([]);
    setSelectedDetourIds([]);
    setDetourState({ status: "idle" });
  }

  function toggleSpot(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < MAX_STOPS ? [...current, id] : current);
    resetDetours();
  }

  // 選んだ地点の間・前後で、地域の食・文化にふれられる寄り道を Gemini と Google マップから探す。
  async function searchDetours() {
    const key = selectedIds.join(",");
    detourKey.current = key;
    setDetourState({ status: "loading" });
    try {
      const response = await fetch("/api/detours", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: work.id, region, researchSpotIds: selectedIds, visitDate }) });
      const data = await response.json();
      if (detourKey.current !== key) return;
      if (!response.ok) throw new Error(data.error || "寄り道候補を取得できませんでした。");
      setDetours(Array.isArray(data.detours) ? data.detours : []);
      setAnchors(Array.isArray(data.anchors) ? data.anchors : []);
      setSelectedDetourIds([]);
      setDetourState({ status: "ready", unlocated: Array.isArray(data.unlocated) ? data.unlocated : [] });
    } catch (fetchError) {
      if (detourKey.current !== key) return;
      detourKey.current = "";
      setDetourState({ status: "error", message: fetchError instanceof Error ? fetchError.message : "寄り道候補を取得できませんでした。" });
    }
  }

  function toggleDetour(id: string) {
    setSelectedDetourIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < MAX_DETOURS ? [...current, id] : current);
  }

  function moveSpot(id: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }

  const ordered = selectedIds.map((id) => spots.find((spot) => spot.id === id)).filter((spot): spot is ResearchSpot => Boolean(spot));
  const selectedDetours = detours.filter((spot) => selectedDetourIds.includes(spot.id));
  const points: RoutePoint[] = insertDetours(ordered.map((spot) => spot.id), selectedDetours).flatMap((id): RoutePoint[] => {
    const spot = ordered.find((item) => item.id === id);
    if (spot) return [{ id, name: spot.name, query: placeQuery(spot), placeId: anchors.find((anchor) => anchor.id === id)?.placeId ?? null, detour: null }];
    const detour = detours.find((item) => item.id === id);
    return detour ? [{ id, name: detour.name, query: detour.name, placeId: detour.place_id, detour }] : [];
  });
  const firstFood = detours.find((spot) => spot.category === "food" && !isKnownClosed(spot, visitDate));
  const firstCulture = detours.find((spot) => spot.category !== "food" && !isKnownClosed(spot, visitDate));
  const recommended = [firstFood, firstCulture].filter((spot): spot is VerifiedDetour => Boolean(spot)).map((spot) => spot.id);
  const single = spots.length === 1 ? spots[0] : null;

  return <section className="screen-section research-course-screen">
    <button className="text-back" type="button" onClick={onBack}>← 作品一覧へ戻る</button>
    <div className="section-heading"><div>
      <p className="page-kicker"><span>{region}</span>{version ? <span>{version}</span> : null}</p>
      <h1>{work.title}</h1>
      <p>{single ? "この地域で掲載している地点です。" : `この地域の掲載地点は${spots.length || work.region_counts[region] || ""}件です。巡りたい地点を選ぶと、訪問順の案を作れます。`}</p>
    </div></div>

    {loading ? <p className="loading-note" role="status">地点を読み込んでいます…</p> : null}
    {error ? <div className="inline-error" role="alert"><p>{error}</p><button className="text-button" type="button" onClick={() => { setError(""); setLoading(true); setAttempt((value) => value + 1); }}>再読み込み</button></div> : null}

    {!loading && !error && single ? <article className="research-single">
      <h2>{single.name}</h2>
      {spotNotes(single).map((note) => <p className="research-source-warning" key={note}>{note}</p>)}
      <SpotLinks spot={single} />
    </article> : null}

    {!loading && !error && spots.length > 1 ? <div className="research-course-layout">
      <section aria-labelledby="choose-heading">
        <h2 id="choose-heading">巡る地点を選ぶ <small>{selectedIds.length}／最大{MAX_STOPS}件</small></h2>
        <div className="research-course-grid">{spots.map((spot) => {
          const checked = selectedIds.includes(spot.id);
          const disabled = !checked && selectedIds.length >= MAX_STOPS;
          return <article className={`research-course-spot${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`} key={spot.id}>
            <label><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSpot(spot.id)} /><span><strong>{spot.name}</strong>{spotNotes(spot).map((note) => <small key={note}>{note}</small>)}</span></label>
            <SpotLinks spot={spot} />
          </article>;
        })}</div>
        {selectedIds.length >= MAX_STOPS ? <p className="field-hint">一度に巡れるのは{MAX_STOPS}件までです。入れ替えるときは、選択中の地点のチェックを外してください。</p> : null}
      </section>

      <section className="research-course-result" aria-labelledby="plan-heading" aria-live="polite">
        <h2 id="plan-heading">訪問順の案</h2>
        {ordered.length ? <>
          <ol>{points.map((point, index) => {
            const seichiIndex = ordered.findIndex((spot) => spot.id === point.id);
            return <li key={point.id} className={point.detour ? "is-detour" : undefined}>
              <div className="plan-stop">
                <span className="stop-number" aria-hidden="true">{index + 1}</span>
                <span className="plan-stop-name"><strong>{point.name}</strong>{point.detour ? <small>{DETOUR_CATEGORY_LABELS[point.detour.category]}・地域の寄り道</small> : null}</span>
                {point.detour ? <div className="order-buttons"><button type="button" onClick={() => toggleDetour(point.id)} aria-label={`${point.name}をコースから外す`}>✕</button></div>
                  : ordered.length > 1 ? <div className="order-buttons">
                    <button type="button" onClick={() => moveSpot(point.id, -1)} disabled={seichiIndex === 0} aria-label={`${point.name}を一つ前へ`}>↑</button>
                    <button type="button" onClick={() => moveSpot(point.id, 1)} disabled={seichiIndex === ordered.length - 1} aria-label={`${point.name}を一つ後へ`}>↓</button>
                  </div> : null}
              </div>
              {points[index + 1] ? <a className="plan-leg" href={pointDirectionsUrl(point, points[index + 1])} target="_blank" rel="noreferrer">次の地点までの経路をGoogleマップで見る ↗</a> : null}
            </li>;
          })}</ol>
          {points.length > 1 ? <a className="primary-button" href={pointRouteUrl(points)} target="_blank" rel="noreferrer">この順番でGoogleマップを開く ↗</a> : null}
          <p className="field-hint">↑↓で聖地の順番を入れ替えられます。寄り道は聖地の間・前後の寄りやすい位置に入ります。移動時間と営業状況は判定していないため、Googleマップで訪問日時を指定して確認してください。</p>

          <div className="research-detours" aria-busy={detourState.status === "loading"}>
            <p className="detour-kicker">聖地のあいだで、まちにふれる</p>
            <h3>地域の食と文化の寄り道</h3>
            {detourState.status !== "ready" ? <>
              <label className="research-date">訪問日<input type="date" min={todayInJapan()} value={visitDate} onChange={(event) => setVisitDate(event.target.value)} /></label>
              <button className="secondary-button" type="button" disabled={detourState.status === "loading" || !visitDate} onClick={() => void searchDetours()}>{detourState.status === "loading" ? "寄り道を探しています…" : "この地点の間・前後で寄れるお店や施設を探す"}</button>
            </> : null}
            {detourState.status === "error" ? <p className="inline-error" role="alert">{detourState.message}</p> : null}
            {detourState.status === "ready" && detourState.unlocated?.length ? <p className="field-hint">{detourState.unlocated.map((id) => ordered.find((spot) => spot.id === id)?.name).filter(Boolean).join("、")}は位置を特定できなかったため、寄り道探しの基準から外しました。</p> : null}
            {detourState.status === "ready" && !detours.length ? <p className="field-hint" role="status">今回は条件に合う寄り道を見つけられませんでした。Googleマップで周辺のお店も探してみてください。</p> : null}
            {detourState.status === "ready" && recommended.length && !selectedDetourIds.length ? <button className="secondary-button" type="button" onClick={() => setSelectedDetourIds(recommended.slice(0, MAX_DETOURS))}>おすすめの寄り道{Math.min(recommended.length, MAX_DETOURS)}件をコースに入れる</button> : null}
            {detours.length ? <ul className="verified-detour-list">{detours.map((spot) => {
              const checked = selectedDetourIds.includes(spot.id);
              const closed = isKnownClosed(spot, visitDate);
              const hours = openingHoursTextFor(spot.weekday_hours, visitDate);
              return <li key={spot.id} className={`verified-detour-item${checked ? " is-selected" : ""}`}>
                <input id={`rdetour-${spot.id}`} type="checkbox" checked={checked} disabled={!checked && (closed || selectedDetourIds.length >= MAX_DETOURS)} onChange={() => toggleDetour(spot.id)} />
                <span>
                  <label htmlFor={`rdetour-${spot.id}`}><span className={`detour-badge is-${spot.category}`}>{DETOUR_CATEGORY_LABELS[spot.category]}</span><strong>{spot.name}</strong></label>
                  {spot.local_feature ? <span className="detour-feature">{spot.local_feature}</span> : null}
                  {spot.detour_reason ? <span className="detour-reason">{spot.detour_reason}</span> : null}
                  {spot.slot_label ? <small>{spot.slot_label}</small> : null}
                  {closed ? <small className="detour-closed">Googleマップでは、選んだ日の曜日は営業時間がありません</small> : null}
                  {hours ? <small>営業時間（Googleマップ）：{hours}</small> : null}
                  <span className="detour-links"><a href={spot.maps_uri ?? `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: spot.name, query_place_id: spot.place_id })}`} target="_blank" rel="noreferrer">Googleマップで見る ↗</a>{spot.official_url ? <a href={spot.official_url} target="_blank" rel="noreferrer">公式サイト ↗</a> : null}</span>
                </span>
              </li>;
            })}</ul> : null}
            {detours.length ? <p className="field-hint detour-attribution">紹介文はAIがGoogleマップの情報をもとに作成したもので、作品との関係を示すものではありません。店舗情報の出典：Google マップ。聖地の位置はGoogleマップの検索による推定です。</p> : null}
          </div>
        </> : <p className="field-hint">巡りたい地点にチェックを入れてください。</p>}
      </section>
    </div> : null}

    {!loading && !error ? <p className="caution-note"><strong>出発前に</strong>正確な位置・営業状況・立入の可否は公式情報で確認してください。学校・住宅地・施設の敷地には許可なく入らないでください。</p> : null}
  </section>;
}
