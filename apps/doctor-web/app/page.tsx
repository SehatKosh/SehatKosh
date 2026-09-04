import { redirect } from "next/navigation";

// Root route — immediately send to Doctor queue.
// Adding new roles? Update this to a role-select landing or keep redirect.
export default function RootPage() {
  redirect("/doctor/queue");
}
