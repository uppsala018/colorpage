import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("free-coloring-page-generator");

export default function FreeColoringPageGeneratorPage() {
  return <UseCasePage slug="free-coloring-page-generator" />;
}
