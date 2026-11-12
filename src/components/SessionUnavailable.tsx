import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";

export function SessionUnavailable() {
  return (
    <Shell>
      <div role="alert" className="mx-auto max-w-[700px] px-6 py-16">
        <h1 className="text-2xl mb-3">This session isn't available.</h1>
        <p className="text-muted-foreground mb-6">It may belong to another account.</p>
        <Link to="/sessions" className="underline underline-offset-4">Go to My sessions</Link>
      </div>
    </Shell>
  );
}
