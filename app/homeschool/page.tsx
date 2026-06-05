import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("homeschool");

export default function HomeschoolPage() {
  return <UseCasePage slug="homeschool" />;
}
