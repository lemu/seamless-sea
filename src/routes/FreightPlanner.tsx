function FreightPlanner() {
  return (
    <div className="m-6 flex flex-col gap-[var(--space-lg)]">
      {/* Header with Title */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)] shrink-0">
          Freight planner
        </h1>
      </div>

      <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          Freight planning functionality will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default FreightPlanner;
