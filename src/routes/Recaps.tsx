export default function Recaps() {
  return (
    <div className="m-6 space-y-6 p-6">
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Recent Recaps
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            View your most recent fixture recaps and voyage summaries.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Search Recaps
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Search through your historical recap database.
          </p>
        </div>
      </div>
    </div>
  );
}