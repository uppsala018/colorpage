import { UseCasePage } from "@/components/use-case-page";
import { createUseCaseMetadata } from "@/lib/site-config";

export const metadata = createUseCaseMetadata("teacher");

export default function TeacherPage() {
  return <UseCasePage slug="teacher" />;
}
