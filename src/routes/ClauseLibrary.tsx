export default function ClauseLibrary() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
          Clause Library
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Browse and manage your comprehensive library of contract clauses and legal provisions.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Standard Clauses
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Access commonly used clauses for charter party agreements.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Custom Clauses
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Manage your organization's custom contract clauses.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Search & Filter
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Search through clauses by category, keywords, or usage context.
          </p>
        </div>
      </div>
    </div>
  );
}