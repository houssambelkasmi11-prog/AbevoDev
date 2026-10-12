import { Hero } from "@/components/marketing/hero/hero";
import { ChooseIntelligence, FeatureStage, FinalCTA, HowItWorks, IntroSection } from "@/components/marketing/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <IntroSection />
      <FeatureStage />
      <HowItWorks />
      <ChooseIntelligence />
      <FinalCTA />
    </>
  );
}
