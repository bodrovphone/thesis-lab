'use client';

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
  const conviction = searchParams.get('conviction');

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
      collapsible={{ buttonLabel: 'Collapse navigation' }}
    >
      <SideNavSection title="Workspace">
        <SideNavItem label="Overview" href="/" isSelected={isDashboard && !conviction} />
      </SideNavSection>

      <SideNavSection title="Quick filters">
        <SideNavItem label="Watching" href="/?conviction=WATCHING" isSelected={conviction === 'WATCHING'} />
        <SideNavItem label="Building conviction" href="/?conviction=BUILDING_CONVICTION" isSelected={conviction === 'BUILDING_CONVICTION'} />
        <SideNavItem label="High conviction" href="/?conviction=HIGH_CONVICTION" isSelected={conviction === 'HIGH_CONVICTION'} />
      </SideNavSection>
    </SideNav>
  );
}
