import { Card, CardContent } from "@rafal.lemieszewski/tide-ui";
import { Link } from "react-router";

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
}

function QuickActionCard({ icon, label, description, href }: QuickActionProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer flex-1 min-w-[140px]">
      <Link to={href} className="block h-full">
        <CardContent className="flex flex-col items-center text-center gap-2 p-4">
          <span className="text-[var(--color-text-brand-bold)] group-hover:scale-110 transition-transform">{icon}</span>
          <span className="text-body-sm font-medium text-[var(--color-text-primary)]">{label}</span>
          <span className="text-body-xs text-[var(--color-text-secondary)] hidden sm:block">{description}</span>
        </CardContent>
      </Link>
    </Card>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.61 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.61 7M12 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m22 7-9.17 9.17a2 2 0 0 1-2.83 0l-2.34-2.34a2 2 0 0 0-2.83 0L2 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 7h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AnchorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 8v14M6 11H3a9 9 0 0 0 18 0h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

const QUICK_ACTIONS: QuickActionProps[] = [
  {
    icon: <PlusIcon />,
    label: "New Fixture",
    description: "Start a new fixture",
    href: "/fixtures",
  },
  {
    icon: <ShipIcon />,
    label: "Active Fixtures",
    description: "View all fixtures",
    href: "/fixtures",
  },
  {
    icon: <TrendingIcon />,
    label: "Market Rates",
    description: "Freight market data",
    href: "/global-market/freight",
  },
  {
    icon: <AnchorIcon />,
    label: "Vessels",
    description: "Fleet overview",
    href: "/assets/vessels/overview",
  },
  {
    icon: <LayoutIcon />,
    label: "My Boards",
    description: "Custom dashboards",
    href: "/boards",
  },
];

export function QuickActions() {
  return (
    <section>
      <h2 className="text-heading-sm text-[var(--color-text-primary)] mb-4">Quick Actions</h2>
      <div className="flex flex-row gap-3 overflow-x-auto pb-1">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionCard key={action.href + action.label} {...action} />
        ))}
      </div>
    </section>
  );
}
