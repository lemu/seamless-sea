import {
  TabsContent,
  Card,
  ActivityLog,
  ActivityLogItem,
  ActivityLogHeader,
  ActivityLogContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@rafal.lemieszewski/tide-ui";
import {
  FormattedActivityLogDescription,
  ActivityLogExpandableContent,
} from "./ActivityLogDescription";
import type { ActivityLogEntry } from "../types/activity";
import type { FixtureData } from "../routes/Fixtures";

export function FixtureSidebarActivity({
  fixture,
  allActivityLogs,
}: {
  fixture: FixtureData;
  allActivityLogs: ActivityLogEntry[];
}) {
  return (
    <TabsContent
      value="activity"
      className="mt-0 flex-1 overflow-y-auto bg-[var(--color-surface-base)]"
    >
      <div className="flex flex-col gap-4 px-6 py-6" style={{ minHeight: 200 }}>
            {/* Negotiation Card - Only show if fixture has negotiation */}
            {fixture.negotiation && (() => {
              const negotiationLogs = allActivityLogs.filter((log) => log.entityType === 'negotiation');

              if (negotiationLogs.length === 0) {
                return (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-body-md text-[var(--color-text-tertiary)]">
                      No history of activity yet
                    </p>
                  </div>
                );
              }

              return (
                <Card className="p-6">
                  <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                    Negotiation
                  </h3>
                  <ActivityLog separatorThreshold={86400000}>
                    {negotiationLogs.map((entry, index) => {
                      const userName = entry.user?.name || 'System';
                      const userInitials = userName === "System"
                        ? "S"
                        : userName.split(' ').map((n: string) => n[0]).join('');

                      const date = new Date(entry.timestamp);
                      const formattedTimestamp = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) + ' at ' + date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: false
                      });

                      const hasExpandable = entry.expandable?.data && entry.expandable.data.length > 0;

                      return (
                        <ActivityLogItem
                          key={index}
                          timestamp={entry.timestamp}
                          collapsible={hasExpandable}
                          defaultOpen={false}
                        >
                          <ActivityLogHeader asCollapsibleTrigger={hasExpandable}>
                            <Avatar size="xxs">
                              {entry.user?.avatarUrl ? (
                                <AvatarImage src={entry.user.avatarUrl} alt={userName} />
                              ) : null}
                              <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                            </Avatar>
                            <FormattedActivityLogDescription
                              entry={entry}
                              userName={userName}
                              formattedTimestamp={formattedTimestamp}
                            />
                          </ActivityLogHeader>
                          {hasExpandable && (
                            <ActivityLogContent>
                              <ActivityLogExpandableContent entry={entry} />
                            </ActivityLogContent>
                          )}
                        </ActivityLogItem>
                      );
                    })}
                  </ActivityLog>
                </Card>
              );
            })()}

            {/* Contract Card */}
            {(() => {
              const contractLogs = allActivityLogs.filter((log) => log.entityType === 'contract');

              if (contractLogs.length === 0) {
                return (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-body-md text-[var(--color-text-tertiary)]">
                      No history of activity yet
                    </p>
                  </div>
                );
              }

              return (
                <Card className="p-6">
                  <h3 className="mb-6 text-body-lg font-semibold text-[var(--color-text-primary)]">
                    Contract
                  </h3>
                  <ActivityLog separatorThreshold={86400000}>
                    {contractLogs.map((entry, index) => {
                      const userName = entry.user?.name || 'System';
                      const userInitials = userName === "System"
                        ? "S"
                        : userName.split(' ').map((n: string) => n[0]).join('');

                      const date = new Date(entry.timestamp);
                      const formattedTimestamp = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) + ' at ' + date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: false
                      });

                      const hasExpandable = entry.expandable?.data && entry.expandable.data.length > 0;

                      return (
                        <ActivityLogItem
                          key={index}
                          timestamp={entry.timestamp}
                          collapsible={hasExpandable}
                          defaultOpen={false}
                        >
                          <ActivityLogHeader asCollapsibleTrigger={hasExpandable}>
                            <Avatar size="xxs">
                              {entry.user?.avatarUrl ? (
                                <AvatarImage src={entry.user.avatarUrl} alt={userName} />
                              ) : null}
                              <AvatarFallback size="xxs">{userInitials}</AvatarFallback>
                            </Avatar>
                            <FormattedActivityLogDescription
                              entry={entry}
                              userName={userName}
                              formattedTimestamp={formattedTimestamp}
                            />
                          </ActivityLogHeader>
                          {hasExpandable && (
                            <ActivityLogContent>
                              <ActivityLogExpandableContent entry={entry} />
                            </ActivityLogContent>
                          )}
                        </ActivityLogItem>
                      );
                    })}
                  </ActivityLog>
                </Card>
              );
            })()}
      </div>
    </TabsContent>
  );
}
