export default function Recaps() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
          Recaps
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Manage fixture recaps and voyage summaries for your shipping operations.
        </p>
      </div>

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