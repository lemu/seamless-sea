export default function Calc() {
  return (
    <div className="m-6 space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
          Calc
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Perform shipping calculations, cost estimates, and freight analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Freight Calculator
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Calculate freight costs and shipping rates for various cargo types.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Bunker Calculator
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Estimate bunker fuel costs and consumption for voyage planning.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Port Calculator
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Calculate port charges, demurrage, and handling costs.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Distance Calculator
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Calculate sea distances and estimated transit times between ports.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Load Calculator
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Calculate cargo load distribution and weight optimization.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Currency Converter
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Convert currencies with real-time exchange rates.
          </p>
        </div>
      </div>
    </div>
  );
}