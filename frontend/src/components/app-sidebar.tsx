'use client';

import { Badge } from '@astryxdesign/core/Badge';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { usePathname, useSearchParams } from 'next/navigation';

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDashboard = pathname === '/';
  const isCompanyDetail = pathname.startsWith('/companies/');
  const isHighConviction = searchParams.get('conviction') === 'HIGH_CONVICTION';

  return (
    <SideNav
      className="app-sidebar"
      header={
        <SideNavHeading
          superheading="Investment research"
          heading="Thesis Lab"
          subheading="Private workspace"
          headingHref="/"
        />
      }
      topContent={
        <SideNavItem
          label="Add company"
          href="/#company-search"
          isSelected={false}
        />
      }
      collapsible={{ buttonLabel: 'Collapse navigation' }}
    >
      <SideNavSection title="Research">
        <SideNavItem label="Overview" href="/" isSelected={isDashboard && !isHighConviction} />
        <SideNavItem label="Tracked companies" href="/#tracked-companies" isSelected={isCompanyDetail} />
        <SideNavItem label="Search universe" href="/#company-search" isSelected={false} />
      </SideNavSection>

      <SideNavSection title="Shortcuts">
        <SideNavItem
          label="High conviction"
          href="/?conviction=HIGH_CONVICTION"
          isSelected={isHighConviction}
          endContent={<Badge label="View" variant="neutral" />}
        />
      </SideNavSection>

      <SideNavSection title="Coming into focus">
        <SideNavItem label="Research notes" isDisabled />
      </SideNavSection>

      <div className="app-sidebar-footer">
        <p className="eyebrow">Data sources</p>
        <p className="mt-2 text-xs leading-5 text-muted">SEC EDGAR · Finnhub · Alpha Vantage</p>
        <p className="mt-3 text-[0.68rem] leading-4 text-muted">A calm place to earn conviction.</p>
      </div>
    </SideNav>
  );
}
