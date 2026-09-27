"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchedWork, VerifiedDetour, VerifiedLeg, VerifiedSpot } from "../_data/anilist-types";
import { isKnownClosed, type VerifiedCourse } from "../_data/real-planner";
import { displayVersion } from "../_data/work-genres";
import GoogleSpotMap from "./google-spot-map";

type ApiLeg = VerifiedLeg & { source: "google-routes" | "registered"; walkingMeters: number | null; fareYen: number | null };
type ApiCourse = Omit<VerifiedCourse, "legs"> & { legs: ApiLeg[] };
type ItineraryResult = { course: ApiCourse; recommendation: { id: string; reason: string; source: "gemini" | "rule" }; source: "google-routes" | "registered" | "mixed"; status: "fits" | "over" | "needs-check"; stayMinutes: Record<string, number>; costs: { transitYen: number | null; admissionYen: number | null; foodExperienceYen: number | null }; notices: string[] };

const MAX_SPOTS = 3;
const MAX_DETOURS = 2;
const LONG_WALK_METERS = 3000;
const DURATION_OPTIONS = [60, 90, 120, 150, 180, 210, 240, 300, 360, 420, 480, 600, 720];

function embedUrl(spot: VerifiedSpot) {
  const padding = 0.008;
  const params = new URLSearchParams({
    bbox: `${spot.longitude - padding},${spot.latitude - padding},${spot.longitude + padding},${spot.latitude + padding}`,
    layer: "mapnik",
    marker: `${spot.latitude},${spot.longitude}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

function point(spot: VerifiedSpot) {
  return `${spot.latitude},${spot.longitude}`;
}

function mapsUrl(spot: VerifiedSpot) {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: point(spot) })}`;
}

function directionsUrl(from: VerifiedSpot, to: VerifiedSpot, mode: VerifiedLeg["mode"]) {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: point(from), destination: point(to), travelmode: mode })}`;
}

function walkingRouteUrl(stops: VerifiedSpot[]) {
  const params = new URLSearchParams({ api: "1", origin: point(stops[0]), destination: point(stops[stops.length - 1]), travelmode: "walking" });
  if (stops.length > 2) params.set("waypoints", stops.slice(1, -1).map(point).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

function todayInJapan() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short" }).format(parsed);
}

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes}分`;
  return minutes ? `${hours}時間${minutes}分` : `${hours}時間`;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters / 10) * 10}m`;
}

function formatYen(value: number | null) {
  return value === null ? "不明" : value === 0 ? "0円" : `${value.toLocaleString()}円`;
}

export default function VerifiedSpotMap({ work, spots, region, onBack }: {
  work: MatchedWork;
  spots: VerifiedSpot[];
  region: string;
  onBack: () => void;
}) {
  const regionSpots = useMemo(() => spots.filter((spot) => spot.region === region), [spots, region]);
  const [activeId, setActiveId] = useState(regionSpots[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState(regionSpots.map((spot) => spot.id).slice(0, MAX_SPOTS));
  const [visitDate, setVisitDate] = useState(todayInJapan);
  const [availableMinutes, setAvailableMinutes] = useState(180);
  const [stayMinutes, setStayMinutes] = useState<Record<string, number>>({});
  const [detours, setDetours] = useState<VerifiedDetour[]>([]);
  const [detoursError, setDetoursError] = useState("");
  const [selectedDetourIds, setSelectedDetourIds] = useState<string[]>([]);
  const [result, setResult] = useState<ItineraryResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const requestVersion = useRef(0);
  const resultRef = useRef<HTMLElement | null>(null);
  const version = displayVersion(work.version);

  const active = regionSpots.find((spot) => spot.id === activeId) ?? regionSpots[0];
  const selectedSpots = regionSpots.filter((spot) => selectedIds.includes(spot.id));
  const selectedDetours = detours.filter((spot) => selectedDetourIds.includes(spot.id));
  const closedSpots = visitDate ? [...selectedSpots, ...selectedDetours].filter((spot) => isKnownClosed(spot, visitDate)) : [];
  const stayOf = (spot: VerifiedSpot) => stayMinutes[spot.id] ?? spot.stay_minutes;
  const invalidStays = [...selectedSpots, ...selectedDetours].filter((spot) => !Number.isInteger(stayOf(spot)) || stayOf(spot) < 5 || stayOf(spot) > 180);

  const problems: string[] = [];
  if (!selectedSpots.length) problems.push("巡る地点を1件以上選んでください。");
  if (!visitDate) problems.push("訪問日を選んでください。");
  else if (visitDate < todayInJapan()) problems.push("訪問日は今日以降の日付にしてください。");
  if (closedSpots.length) problems.push(`${closedSpots.map((spot) => spot.name).join("、")}は選んだ日が休業日です。日付か地点を変えてください。`);
  if (invalidStays.length) problems.push("滞在時間は5〜180分の範囲で入力してください。");
  const canCreate = problems.length === 0 && !creating;

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/detours?region=${encodeURIComponent(region)}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "寄り道候補を取得できません。");
      setDetours(Array.isArray(data.detours) ? data.detours : []);
    }).catch((error) => { if (!controller.signal.aborted) setDetoursError(error instanceof Error ? error.message : "寄り道候補を取得できません。"); });
    return () => controller.abort();
  }, [region]);

  function invalidateResult() {
    requestVersion.current++;
    setCreating(false);
    setResult(null);
    setCreateError("");
  }

  async function createCourse(detourIds = selectedDetourIds) {
    if (problems.length) return;
    const current = ++requestVersion.current;
    setCreating(true);
    setCreateError("");
    try {
      const response = await fetch("/api/itinerary", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: work.id, region, spotIds: selectedIds, detourIds, visitDate, availableMinutes, stayMinutes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "コースを作成できませんでした。");
      if (current === requestVersion.current) setResult(data as ItineraryResult);
    } catch (error) {
      if (current === requestVersion.current) {
        setResult(null);
        setCreateError(error instanceof Error ? error.message : "コースを作成できませんでした。時間をおいて再度お試しください。");
      }
    } finally { if (current === requestVersion.current) setCreating(false); }
  }

  function toggleSpot(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id)
      : current.length < MAX_SPOTS ? [...current, id] : current);
    invalidateResult();
  }

  function toggleDetour(id: string) {
    const next = selectedDetourIds.includes(id) ? selectedDetourIds.filter((item) => item !== id) : [...selectedDetourIds, id];
    if (next.length > MAX_DETOURS || next.length + selectedIds.length > 5) return;
    setSelectedDetourIds(next);
    if (result) void createCourse(next);
    else invalidateResult();
  }

  const statusView = result ? {
    fits: { label: "時間内に収まる目安です", className: "is-good", detail: `指定した${formatMinutes(availableMinutes)}に対して、約${formatMinutes(availableMinutes - result.course.totalMinutes)}の余裕があります。` },
    "needs-check": { label: "時間内に収まる目安です", className: "is-caution", detail: `余裕は約${formatMinutes(Math.max(0, availableMinutes - result.course.totalMinutes))}です。下の「出発前に確認してください」に確認が必要な項目があります。` },
    over: { label: "指定した時間を超えそうです", className: "is-over", detail: `約${formatMinutes(result.course.totalMinutes - availableMinutes)}超える目安です。地点を減らすか、周遊時間を延ばしてください。` },
  }[result.status] : null;
  const allWalking = Boolean(result && result.course.legs.length && result.course.legs.every((leg) => leg.mode === "walking"));
  const hasDetourInCourse = Boolean(result?.course.stops.some((spot) => spot.kind === "detour"));

  return (
    <section className="screen-section verified-map-screen">
      <button type="button" className="text-back" onClick={onBack}>← 作品一覧へ戻る</button>
      <div className="section-heading"><div>
        <p className="page-kicker"><span>{region}</span>{version ? <span>{version}</span> : null}<span className="ready-badge">地図・所要時間あり</span></p>
        <h1>{work.title}</h1>
        <p>聖地{regionSpots.length}件から、巡る地点を最大{MAX_SPOTS}件選んでコースを作れます。</p>
      </div></div>

      {active ? <div className="verified-map-layout">
        <div className="verified-map-frame"><GoogleSpotMap spots={regionSpots} activeId={active.id} onSelect={setActiveId} fallback={<><iframe title={`${active.name}の地図`} src={embedUrl(active)} loading="lazy" referrerPolicy="no-referrer" /><small>地図 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small></>} /></div>
        <ol className="verified-spot-list" aria-label="聖地の一覧">{regionSpots.map((spot, index) => {
          const checked = selectedIds.includes(spot.id);
          const disabled = !checked && selectedIds.length >= MAX_SPOTS;
          return <li key={spot.id} className={`${active.id === spot.id ? "is-active" : ""}${checked ? " is-selected" : ""}`}>
            <button type="button" className="spot-heading" onClick={() => setActiveId(spot.id)} aria-pressed={active.id === spot.id} aria-label={`${spot.name}を地図の中心に表示`}>
              <span className="stop-number" aria-hidden="true">{index + 1}</span><strong>{spot.name}</strong>
            </button>
            {spot.relationship_note ? <p className="spot-relation">{spot.relationship_note}</p> : null}
            <label className={`verified-select${disabled ? " is-disabled" : ""}`}><input type="checkbox" checked={checked} onChange={() => toggleSpot(spot.id)} disabled={disabled} /> コースに含める</label>
            <details className="detail-disclosure spot-disclosure"><summary>訪問時の注意・出典</summary><div className="disclosure-body">
              <p>{spot.access_note}</p>
              {spot.entrance_note ? <p>入口・集合場所：{spot.entrance_note}</p> : null}
              {spot.source_checked_at ? <p>出典確認日：{spot.source_checked_at}</p> : null}
              <div className="disclosure-links"><a href={mapsUrl(spot)} target="_blank" rel="noreferrer">Googleマップで開く ↗</a><a href={spot.source_url} target="_blank" rel="noreferrer">作品との関係の出典 ↗</a>{spot.coordinate_source_url ? <a href={spot.coordinate_source_url} target="_blank" rel="noreferrer">位置の出典 ↗</a> : null}{spot.official_url ? <a href={spot.official_url} target="_blank" rel="noreferrer">公式情報 ↗</a> : null}</div>
              <p className="field-hint">ピンは施設・駅舎の中心付近で、作品と同じ撮影場所とは限りません。</p>
            </div></details>
          </li>;
        })}</ol>
      </div> : <p role="status">この地域には地図に表示できる聖地がありません。</p>}
      {selectedIds.length >= MAX_SPOTS && regionSpots.length > MAX_SPOTS ? <p className="field-hint">一度に巡れるのは{MAX_SPOTS}件までです。入れ替えるときは、選択中の地点のチェックを外してください。</p> : null}

      <section className="verified-course-form" aria-labelledby="plan-form-heading">
        <h2 id="plan-form-heading">コースを作る</h2>
        <p className="form-lead">訪問日と使える時間から、選んだ地点を巡る順番と移動時間の目安を調べます。</p>
        <div className="verified-course-fields">
          <label>訪問日<input type="date" min={todayInJapan()} value={visitDate} onChange={(event) => { setVisitDate(event.target.value); invalidateResult(); }} />{visitDate ? <span className="field-hint">{formatDate(visitDate)}</span> : null}</label>
          <label>現地で使える時間<select value={availableMinutes} onChange={(event) => { setAvailableMinutes(Number(event.target.value)); invalidateResult(); }}>{DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{formatMinutes(minutes)}</option>)}</select><span className="field-hint">最初の地点に着いてから、最後の地点を出るまで</span></label>
        </div>
        {selectedSpots.length ? <details className="detail-disclosure stay-disclosure"><summary>各地点の滞在時間を変える</summary><div className="verified-course-fields">{selectedSpots.map((spot) => <label key={spot.id}>{spot.name}<span className="input-with-unit"><input type="number" inputMode="numeric" min="5" max="180" step="5" value={Number.isFinite(stayOf(spot)) ? stayOf(spot) : ""} onChange={(event) => { setStayMinutes((current) => ({ ...current, [spot.id]: event.target.value === "" ? Number.NaN : Number(event.target.value) })); invalidateResult(); }} />分</span></label>)}</div></details> : null}
        <button className="primary-button" type="button" disabled={!canCreate} aria-describedby={problems.length ? "plan-problems" : undefined} onClick={() => void createCourse()}>{creating ? "経路を調べています…" : "この条件でコースを作る"}</button>
        {problems.length ? <ul id="plan-problems" className="form-problems">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
        {createError ? <p className="inline-error" role="alert">{createError}</p> : null}
      </section>

      {result && statusView ? <section ref={resultRef} className="verified-course-result" aria-live="polite" aria-labelledby="result-heading">
        <h2 id="result-heading">{formatDate(visitDate)}のコース案</h2>
        <div className={`status-card ${statusView.className}`}>
          <strong>{statusView.label}{result.status === "needs-check" ? <span className="status-tag">要確認あり</span> : null}</strong>
          <p>現地での所要時間は<b>約{formatMinutes(result.course.totalMinutes)}</b>です。{statusView.detail}</p>
        </div>

        <ol className="course-stops">{result.course.stops.map((spot, index) => {
          const leg = result.course.legs[index];
          const next = result.course.stops[index + 1];
          const longWalk = leg?.mode === "walking" && leg.walkingMeters !== null && leg.walkingMeters > LONG_WALK_METERS;
          return <li key={spot.id}>
            <span className="stop-number" aria-hidden="true">{index + 1}</span>
            <div className="course-stop-body">
              <strong>{spot.name}</strong>
              <span className="stop-meta">{spot.kind === "detour" ? "地域の寄り道" : "作品の聖地"}・滞在 約{result.stayMinutes[spot.id] ?? spot.stay_minutes}分</span>
              {spot.access_note ? <details className="detail-disclosure stop-disclosure"><summary>訪問時の注意</summary><p>{spot.access_note}</p>{spot.notes ? <p className="field-hint">{spot.notes}</p> : null}</details> : null}
              {leg && next ? <div className={`verified-leg${longWalk ? " is-long" : ""}`}>
                <span><b>{leg.mode === "walking" ? "徒歩" : "電車・バス"} 約{formatMinutes(leg.minutes)}</b>{leg.walkingMeters ? `（徒歩 約${formatDistance(leg.walkingMeters)}）` : ""}{leg.fareYen ? `・運賃 約${leg.fareYen.toLocaleString()}円` : ""}</span>
                {longWalk ? <span className="leg-warning">歩く距離が長い区間です。バスやタクシーも含めてGoogleマップで確認してください。</span> : null}
                <a href={directionsUrl(spot, next, leg.mode)} target="_blank" rel="noreferrer">この区間の経路をGoogleマップで見る ↗</a>
                {leg.source === "registered" ? <a href={leg.source_url} target="_blank" rel="noreferrer">移動時間の出典 ↗</a> : null}
              </div> : null}
            </div>
          </li>;
        })}</ol>
        {allWalking && result.course.stops.length > 1 ? <a className="secondary-button" href={walkingRouteUrl(result.course.stops)} target="_blank" rel="noreferrer">この順番でGoogleマップを開く ↗</a> : null}

        <div className="departure-check">
          <h3>出発前に確認してください</h3>
          <ul>
            <li>各地点の当日の営業・立入条件を、公式情報で確認する。</li>
            <li>Googleマップで訪問日時を指定して、実際の経路と便を確認する。</li>
            <li>最初の地点までの移動と、最後の地点からの帰り道は含んでいません。</li>
            {result.notices.map((notice) => <li key={notice}>{notice}</li>)}
          </ul>
        </div>

        <details className="detail-disclosure result-disclosure"><summary>時間の内訳と費用の目安</summary><div className="disclosure-body">
          <dl className="breakdown">
            <div><dt>各地点での滞在</dt><dd>{formatMinutes(result.course.stayMinutes)}</dd></div>
            <div><dt>地点間の移動</dt><dd>{formatMinutes(result.course.moveMinutes)}</dd></div>
            <div><dt>余裕時間</dt><dd>{formatMinutes(result.course.bufferMinutes)}</dd></div>
            <div className="breakdown-total"><dt>合計</dt><dd>{formatMinutes(result.course.totalMinutes)}</dd></div>
          </dl>
          <dl className="breakdown">
            <div><dt>地点間の運賃</dt><dd>{formatYen(result.costs.transitYen)}</dd></div>
            <div><dt>施設の入場料</dt><dd>{formatYen(result.costs.admissionYen)}</dd></div>
            <div><dt>寄り道の飲食・体験</dt><dd>{hasDetourInCourse ? formatYen(result.costs.foodExperienceYen) : "寄り道なし"}</dd></div>
          </dl>
          <p className="field-hint">「不明」の費用は0円として扱っていません。移動時間は{result.source === "registered" ? "登録済みの区間データ" : "Google Routesの代表時刻"}による概算です。</p>
        </div></details>
      </section> : null}

      {result && (detours.length > 0 || selectedDetourIds.length > 0) ? <section className="verified-detours" aria-labelledby="detour-heading">
        <h2 id="detour-heading">地域の寄り道を足す</h2>
        <p>最大{MAX_DETOURS}件まで追加できます。選ぶとコースを作り直します。</p>
        {detoursError ? <p role="status" className="inline-error">{detoursError}</p> : null}
        <div className="verified-detour-list">{detours.map((spot) => {
          const closed = Boolean(visitDate && isKnownClosed(spot, visitDate));
          const checked = selectedDetourIds.includes(spot.id);
          return <div key={spot.id} className="verified-detour-item">
            <input id={`detour-${spot.id}`} type="checkbox" checked={checked} disabled={creating || (!checked && (closed || selectedDetourIds.length >= MAX_DETOURS || selectedIds.length + selectedDetourIds.length >= 5))} onChange={() => toggleDetour(spot.id)} />
            <span><label htmlFor={`detour-${spot.id}`}><strong>{spot.name}</strong></label><small>{spot.category}・滞在 約{spot.stay_minutes}分</small>{closed ? <small className="detour-closed">選んだ日は休業日です</small> : null}<details className="detail-disclosure"><summary>詳しく見る</summary><p>{spot.local_relevance}</p><a href={spot.source_url} target="_blank" rel="noreferrer">出典 ↗</a></details></span>
          </div>;
        })}</div>
      </section> : null}
    </section>
  );
}
