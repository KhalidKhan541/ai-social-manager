import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-purple-500/10">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">SocialPilot AI</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Manage all your social media with the power of AI
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Create engaging content, schedule posts, and analyze performance
            across every platform — all from one intelligent dashboard.
          </p>
          <div className="grid grid-cols-2 gap-6">
            {[
              { value: "10K+", label: "Active users" },
              { value: "2M+", label: "Posts managed" },
              { value: "98%", label: "Satisfaction" },
              { value: "50+", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold gradient-text">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
