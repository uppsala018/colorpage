import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("party-activities");

export default function PartyActivitiesPage() {
  return <UseCasePage slug="party-activities" />;
}
