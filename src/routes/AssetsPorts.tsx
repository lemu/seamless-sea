import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Tabs, TabsList, TabsTrigger, Button } from "@rafal.lemieszewski/tide-ui";
import { useHeaderTabs, useHeaderActions } from "../hooks";

function AssetsPorts() {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("overview"));

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="overview">Overview</TabsTrigger>
          <TabsTrigger size="s" value="list">Ports list</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
    [tab, setTab]
  );

  useHeaderTabs(headerTabs);

  const headerActions = useMemo(() => <Button variant="default">Export</Button>, []);
  useHeaderActions(headerActions);

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      <div className="rounded-l border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-text-secondary">
          {tab === "overview"
            ? "Ports overview will be displayed here."
            : "Ports list will be displayed here."}
        </p>
      </div>
    </div>
  );
}

export default AssetsPorts;
