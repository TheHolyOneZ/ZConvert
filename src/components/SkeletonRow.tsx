export default function SkeletonRow() {
  return (
    <div
      className="px-3 py-2.5 rounded-xl flex items-center gap-3"
      aria-hidden="true"
    >

      <div
        className="w-9 h-9 rounded-lg shrink-0 animate-pulse"
        style={{ background: "var(--color-panel-strong)" }}
      />


      <div className="flex-1 min-w-0">

        <div
          className="h-3 rounded-md w-3/5 mb-1.5 animate-pulse"
          style={{ background: "var(--color-panel-strong)" }}
        />

        <div
          className="h-2 rounded w-2/5 animate-pulse"
          style={{ background: "var(--color-panel-strong)" }}
        />

        <div className="flex gap-1 mt-1.5">
          <div
            className="w-12 h-4 rounded-md animate-pulse"
            style={{ background: "var(--color-panel-strong)" }}
          />
          <div
            className="w-12 h-4 rounded-md animate-pulse"
            style={{ background: "var(--color-panel-strong)" }}
          />
          <div
            className="w-10 h-4 rounded-md animate-pulse"
            style={{ background: "var(--color-panel-strong)" }}
          />
        </div>
      </div>
    </div>
  );
}
