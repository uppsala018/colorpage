import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("paint-by-numbers");

export default function PaintByNumbersPage() {
  return <UseCasePage slug="paint-by-numbers" />;
}
