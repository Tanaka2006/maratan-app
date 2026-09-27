"use client";

import { useState } from "react";
import { DETOUR_CATEGORY_LABELS, type DetourCategory } from "../_data/local-detours";

type Result = { detour: { id: string; name: string; region: string; category: string; local_relevance: string }; works: Array<{ workId: string; title: string }> };

/** 「うに」「酒」「和菓子」などで地元の店・施設を探し、同じ地域の聖地のコースへ進む。 */
export default function DetourSearch({ onOpen, openingKey }: { onOpen: (workId: string, region: string) => void; openingKey: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || q.length > 40) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/detours/search?${new URLSearchParams({ q })}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "検索できませんでした。");
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (fetchError) {
      setResults(null);
      setError(fetchError instanceof Error ? fetchError.message : "検索できませんでした。");
    } finally { setLoading(false); }
  }

  return <section className="detour-search-section" aria-labelledby="detour-search-heading">
    <form className="search-field detour-search-form" onSubmit={search} role="search">
      <label htmlFor="detour-search" className="sr-only">食・お店・施設を探す</label>
      <input id="detour-search" type="search" enterKeyHint="search" autoComplete="off" maxLength={40} placeholder="例：うに／酒／和菓子" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button type="submit" disabled={loading || !query.trim()}>{loading ? "検索中…" : "探す"}</button>
    </form>
    <h2 id="detour-search-heading" className="sr-only">食・お店・施設の検索結果</h2>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    {results && !results.length ? <p className="search-empty" role="status">見つかりませんでした。別の言葉で試してください。</p> : null}
    {results?.length ? <div className="research-grid">{results.map(({ detour, works }) => (
      <article className="research-card detour-result" key={detour.id}>
        <p className="work-version"><span className={`detour-badge is-${detour.category}`}>{DETOUR_CATEGORY_LABELS[detour.category as DetourCategory] ?? "地域の店"}</span>{detour.region}</p>
        <h3>{detour.name}</h3>
        {detour.local_relevance ? <p className="detour-result-text">{detour.local_relevance}</p> : null}
        {works.length ? <div className="region-buttons">{works.map((work) => (
          <button type="button" key={work.workId} disabled={Boolean(openingKey)} onClick={() => onOpen(work.workId, detour.region)}>
            <span className="region-name">この近くの聖地：{work.title}</span>
            <span className="region-meta">{openingKey === `${work.workId}/${detour.region}` ? "読み込み中…" : <span aria-hidden="true" className="region-arrow">→</span>}</span>
          </button>
        ))}</div> : <p className="field-hint">この地域の聖地はまだ登録されていません。</p>}
      </article>
    ))}</div> : null}
  </section>;
}
