import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("sunday-school");

export default function SundaySchoolPage() {
  return <UseCasePage slug="sunday-school" />;
}
