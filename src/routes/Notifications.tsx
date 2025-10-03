function Notifications() {
  return (
    <div className="space-y-6 overflow-x-hidden max-w-full min-w-0" style={{ padding: 'var(--page-padding)' }}>
      {/* Header with Title */}
      <div className="flex items-center justify-between gap-4 min-w-0 overflow-hidden">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)] shrink-0">
          Notifications
        </h1>
      </div>

      <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          Notifications management will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default Notifications;
