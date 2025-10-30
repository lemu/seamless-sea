export default function NewsFeed() {
  return (
    <div className="m-6 space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-heading-2xl font-bold text-[var(--color-text-primary)]">
          News Feed
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Stay updated with the latest shipping industry news and market insights.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Market Updates
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Latest shipping market trends and analysis will appear here.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Industry News
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Breaking news and developments in the maritime industry.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6 bg-[var(--color-surface-primary)]">
          <h2 className="text-heading-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Regulatory Updates
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            Important regulatory changes and compliance requirements.
          </p>
        </div>
      </div>
    </div>
  );
}