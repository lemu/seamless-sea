import React from "react";

function MailingList() {
  return (
    <div className="space-y-6 p-4">
      <div className="mb-6">
        <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">📮 Mailing List</h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Manage trading communications and mailing lists
        </p>
      </div>
      <div className="rounded-lg border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          Mailing list management will be implemented here.
        </p>
      </div>
    </div>
  );
}

export default MailingList;