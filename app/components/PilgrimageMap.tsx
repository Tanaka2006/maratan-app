import type { Work } from "../types/work";
import type { Spot } from "../types/spot";

type PilgrimageMapProps = {
  work: Work;
  spots: Spot[];
  selectedSpotIds: string[];
  onToggleSpot: (spotId: string) => void;
  onBack: () => void;
};

export default function PilgrimageMap({ work, spots, selectedSpotIds, onToggleSpot, onBack }: PilgrimageMapProps) {
  const atLimit = selectedSpotIds.length >= 3;

  return (
    <section aria-labelledby="map-title">
      <button type="button" onClick={onBack} className="mp-button-secondary mb-6">← 作品選択に戻る</button>
      <p className="mp-step">STEP 02 / 聖地マップ</p>
      <h1 id="map-title" className="mp-title">行きたい聖地を選ぼう</h1>
      <p className="mp-description">行きたい聖地を1〜3か所選んでください。</p>
      <p className="mt-5 font-bold">{work.name}</p>
      <p className="mt-1 text-sm text-muted">対応地域：{work.region}</p>
      <aside className="mp-notice mt-6">
        地点・作品との関係・滞在目安・注意事項は、すべてダミーデータです。実際の訪問には使えません。
      </aside>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-8">
      {/* Google Maps導入時は、この仮エリアを地図コンポーネントに置き換えます。 */}
      <div aria-label="仮の地図エリア" className="lg:sticky lg:top-6 lg:min-h-[36rem] flex min-h-64 flex-col items-center justify-center rounded-card border-2 border-dashed border-brand/25 bg-brand-soft p-6 text-center">
        <span aria-hidden="true" className="mb-3 rounded-full bg-accent px-5 py-3 text-2xl">📍</span>
        <p className="font-bold">地図の表示予定エリア</p>
        <p className="mt-2 text-sm leading-6 text-muted">現在は地図未接続です。<br />聖地一覧から選択してください。</p>
      </div>

      <div className="min-w-0">
      <div className="sticky top-0 z-10 rounded-control border border-line bg-background p-4 shadow-card">
        <p role="status" aria-atomic="true" className="font-bold">選択中：{selectedSpotIds.length} / 3か所</p>
        <p id="spot-selection-help" className="mt-1 text-sm text-muted">
          {atLimit ? "3か所選択しています。変更するときは選択中の地点を外してください。" : "行きたい聖地を1〜3か所選んでください。"}
        </p>
      </div>
      <h2 className="mb-3 mt-6 font-bold">聖地一覧（ダミー）</h2>
      {spots.length === 0 && <p className="rounded-card bg-surface p-5 text-muted">この作品には、まだ聖地が登録されていません。</p>}
      <ul className="space-y-4">
        {spots.map((spot) => {
          const selected = selectedSpotIds.includes(spot.id);
          return (
            <li key={spot.id} className={`rounded-card border-2 p-5 shadow-card ${selected ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}>
              <h3 className="text-lg font-bold">{spot.name}</h3>
              <dl className="mt-4 space-y-3 text-sm leading-6">
                <div><dt className="font-bold">作品との関係</dt><dd className="text-muted">{spot.relationship}</dd></div>
                <div><dt className="font-bold">滞在目安</dt><dd className="text-muted">{spot.suggestedStayMinutes}分（ダミー）</dd></div>
                <div><dt className="font-bold">注意事項</dt><dd className="text-muted">{spot.notes}</dd></div>
                <div><dt className="font-bold">根拠URL</dt><dd>{spot.sourceUrl ? <a href={spot.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-ink underline underline-offset-4">根拠ページを開く（別タブ）</a> : <span className="text-muted">未登録（架空の地点のため根拠ページはありません）</span>}</dd></div>
              </dl>
              <button type="button" aria-pressed={selected} aria-label={`${spot.name}を${selected ? "選択から外す" : "選択する"}`} aria-describedby="spot-selection-help" disabled={!selected && atLimit} onClick={() => onToggleSpot(spot.id)} className={`mt-5 min-h-12 w-full rounded-control px-4 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "bg-brand text-foreground" : "border border-line bg-accent-soft text-foreground"}`}>
                {selected ? "✓ 選択中・外す" : "この聖地を選ぶ"}
              </button>
            </li>
          );
        })}
      </ul>
      </div>
      </div>
      <p className="mt-6 text-sm leading-6 text-muted">1〜3か所選ぶと、日時や滞在時間の条件入力へ進めます。</p>
    </section>
  );
}
