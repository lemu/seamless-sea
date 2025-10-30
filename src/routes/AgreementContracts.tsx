export default function AgreementContracts() {
  return (
    <div className="m-6 space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
          Contracts
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Access and manage your charter party agreements and shipping contracts.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Active Contracts
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            View and manage your currently active charter party agreements.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Contract Templates
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Access standard contract templates and forms.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Contract History
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Browse through your historical contract database.
          </p>
        </div>
      </div>
    </div>
  );
}