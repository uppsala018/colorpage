import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("parents");

export default function ParentsPage() {
  return <UseCasePage slug="parents" />;
}
