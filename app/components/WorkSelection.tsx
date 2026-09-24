import { useState } from "react";
import type { Work } from "../types/work";

type WorkSelectionProps = {
  works: Work[];
  selectedWorkId: string | null;
  onSelectWork: (workId: string) => void;
};

// 全角・半角と英字の大文字・小文字をそろえて検索します。
function normalizeSearch(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

export default function WorkSelection({ works, selectedWorkId, onSelectWork }: WorkSelectionProps) {
  const [query, setQuery] = useState("");
  const visibleWorks = works.filter((work) => normalizeSearch(work.name).includes(normalizeSearch(query)));

  return (
    <section aria-labelledby="work-selection-title">
      <p className="mp-step">STEP 01 / 作品選択</p>
      <h1 id="work-selection-title" className="mp-title">どの作品を巡りますか？</h1>
      <p className="mp-description">巡りたい作品を1つ選んでください。対応地域もあわせて確認できます。</p>
      <aside className="mp-notice mt-6">
        <p className="font-bold">ダミーデータでの操作確認画面です</p>
        <p className="mt-1">掲載している作品・地域はすべて架空です。実際の対応作品・地域は未決定です。</p>
      </aside>
      <div className="mp-card mt-8">
        <label htmlFor="work-search" className="text-sm font-bold">作品名で検索</label>
        <input id="work-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例：ダミー作品A" aria-describedby="work-search-help"
          className="mp-input mt-2" />
        <p id="work-search-help" className="mt-2 text-xs leading-6 text-muted">現在はダミー作品名で検索できます。</p>
      </div>
      <div className="mb-3 mt-7 flex items-center justify-between gap-3">
        <h2 className="font-bold">登録済み作品 <span className="text-sm font-normal text-muted">（ダミー）</span></h2>
        <p role="status" className="mp-pill bg-accent-soft">{visibleWorks.length}件</p>
      </div>
      {visibleWorks.length > 0 ? (
        <ul className="grid gap-5 md:grid-cols-2">
          {visibleWorks.map((work) => {
            const isSelected = work.id === selectedWorkId;
            return (
              <li key={work.id}>
                <button type="button" aria-pressed={isSelected} onClick={() => onSelectWork(work.id)}
                  className={`flex h-full w-full items-center gap-4 rounded-card shadow-card border-2 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink sm:p-5 ${isSelected ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="mp-pill bg-coral-soft text-coral-ink">ダミーデータ</span>
                    <span className="mt-1 block break-words text-lg font-bold">{work.name}</span>
                    <span className="mt-2 block text-sm text-muted">対応地域：{work.region}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${isSelected ? "bg-brand text-foreground" : "bg-accent-soft text-foreground"}`}>{isSelected ? "✓ 選択中" : "選択する"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-card shadow-card border border-dashed border-line bg-surface p-6">
          <h3 className="font-bold">該当する登録作品がありません</h3>
          <p className="mt-2 text-sm leading-7 text-muted">作品名を確認するか、別の名前で検索してください。登録されていない作品は選択できません。現在の一覧はダミーデータのみです。</p>
          <button type="button" onClick={() => setQuery("")} className="mp-button-secondary mt-4">検索をクリアして一覧に戻る</button>
        </div>
      )}
    </section>
  );
}
