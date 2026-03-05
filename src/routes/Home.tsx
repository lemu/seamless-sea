import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AttentionSection } from "../components/home/AttentionSection";
import { QuickActions } from "../components/home/QuickActions";
import { MarketPulse } from "../components/home/MarketPulse";
import { BreakingNews } from "../components/home/BreakingNews";
import { DealCelebration } from "../components/home/DealCelebration";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function GreetingHeader() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const attentionData = useQuery(api.home.getAttentionItems);

  const firstName = currentUser?.name?.split(" ")[0] ?? null;
  const totalCount = attentionData
    ? attentionData.pendingApprovals.count +
      attentionData.onSubs.count +
      attentionData.drafts.count +
      attentionData.activeNegotiations.count
    : null;

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-heading-lg text-[var(--color-text-primary)]">
        {getGreeting()}{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="text-body-sm text-[var(--color-text-secondary)]">{formatTodayDate()}</p>
      {totalCount != null && totalCount > 0 && (
        <p className="text-body-sm text-[var(--color-text-brand-bold)]">
          {totalCount} item{totalCount !== 1 ? "s" : ""} need{totalCount === 1 ? "s" : ""} your attention
        </p>
      )}
      {totalCount === 0 && (
        <p className="text-body-sm text-[var(--color-text-secondary)]">
          Everything looks great — nothing needs your attention right now.
        </p>
      )}
    </div>
  );
}

function Home() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-6 flex flex-col gap-[var(--space-l)]">
      <GreetingHeader />
      <DealCelebration />
      <QuickActions />
      <AttentionSection />
      <BreakingNews />
      <MarketPulse />
    </div>
  );
}

export default Home;
