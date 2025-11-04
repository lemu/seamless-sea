function Assets() {
  return (
    <div className="m-6 flex flex-col gap-[var(--space-lg)]">
      {/* Header with Title */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-heading-lg shrink-0 font-bold text-[var(--color-text-primary)]">
          Assets
        </h1>
      </div>

      <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          Asset management tools will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default Assets;
