import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
        <div className="h-14 w-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Page Not Found</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The requested page or record could not be found.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/">
            <Button className="w-full text-xs">Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
