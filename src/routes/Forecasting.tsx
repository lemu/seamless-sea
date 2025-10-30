export default function Forecasting() {
  return (
    <div className="m-6 space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
          Forecasting
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Advanced forecasting tools for market trends, demand planning, and operational predictions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Market Forecasting
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Predict market trends, freight rates, and shipping demand patterns.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Demand Planning
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Analyze historical data to forecast cargo demand and capacity needs.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Route Optimization
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Forecast optimal routes based on weather, traffic, and cost predictions.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Fuel Cost Prediction
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Predict bunker fuel costs and optimize fuel consumption strategies.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Risk Assessment
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Forecast potential risks and disruptions in shipping operations.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Capacity Planning
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Forecast vessel capacity requirements and fleet optimization needs.
          </p>
        </div>
      </div>
    </div>
  );
}