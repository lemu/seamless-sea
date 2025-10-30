function Assets() {
  return (
    <div
      className="m-6 max-w-full min-w-0 space-y-6 overflow-x-hidden"
      style={{ padding: "var(--page-padding)" }}
    >
      {/* Header with Title */}
      <div className="flex min-w-0 items-center justify-between gap-4 overflow-hidden">
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
