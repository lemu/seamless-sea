export default function Agreements() {
  return (
    <div className="m-6 space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Recaps
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            View and manage fixture recaps and voyage summaries.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Contracts
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Access your charter party agreements and contracts.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Clause Library
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Browse and manage your library of contract clauses.
          </p>
        </div>
      </div>
    </div>
  );
}