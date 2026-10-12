import { PageContainer, PageHeader } from "@/components/app/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer>
      <PageHeader index="10" label="Settings" title="Settings" description="Your account, your intelligence providers and the personalities that teach you." />
      <SettingsTabs />
      <div className="mt-8">{children}</div>
    </PageContainer>
  );
}
