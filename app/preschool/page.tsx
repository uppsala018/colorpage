import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("preschool");

export default function PreschoolPage() {
  return <UseCasePage slug="preschool" />;
}
