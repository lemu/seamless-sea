import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Tabs, TabsList, TabsTrigger, Button } from "@rafal.lemieszewski/tide-ui";
import { useHeaderTabs, useHeaderActions } from "../hooks";
import { Upload } from "lucide-react";

function GlobalMarketSupply() {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("fleet"));

  const headerTabs = useMemo(
    () => (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList size="s">
          <TabsTrigger size="s" value="fleet">Fleet</TabsTrigger>
          <TabsTrigger size="s" value="speed-bunker">Speed & bunker</TabsTrigger>
          <TabsTrigger size="s" value="utilization">Utilization</TabsTrigger>
          <TabsTrigger size="s" value="emissions">Emissions</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
    [tab, setTab]
  );

  useHeaderTabs(headerTabs);

  const headerActions = useMemo(
    () => (
      <Button variant="default" icon={Upload} iconPosition="left">
        Export
      </Button>
    ),
    []
  );

  useHeaderActions(headerActions);

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      <div className="rounded-l border border-[var(--color-border-primary-subtle)] p-6">
        <p className="text-body-md text-text-secondary">
          Supply analytics will be displayed here.
        </p>
      </div>
    </div>
  );
}

export default GlobalMarketSupply;
