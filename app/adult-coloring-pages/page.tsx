import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("adult-coloring-pages");

export default function AdultColoringPagesPage() {
  return <UseCasePage slug="adult-coloring-pages" />;
}
