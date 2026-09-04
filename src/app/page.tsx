import Link from "next/link";
import {
  Zap,
  BarChart3,
  Calendar,
  Sparkles,
  Shield,
  Globe,
  ArrowRight,
  Check,
  Star,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Sparkles,
    title: "AI Content Studio",
    description:
      "Generate engaging posts, captions, and hashtags with advanced AI. Customize tone, length, and style for each platform.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "Schedule posts across all platforms with AI-recommended optimal posting times based on your audience analytics.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description:
      "Track engagement, reach, and growth across all platforms with comprehensive dashboards and exportable reports.",
  },
  {
    icon: Globe,
    title: "Multi-Platform",
    description:
      "Manage Twitter/X, Instagram, LinkedIn, Facebook, TikTok, and YouTube from one unified dashboard.",
  },
  {
    icon: Shield,
    title: "Team Collaboration",
    description:
      "Approval workflows, role-based access, and real-time collaboration for teams of any size.",
  },
  {
    icon: Zap,
    title: "Social Inbox",
    description:
      "Unified inbox for comments, mentions, and DMs. AI-powered response suggestions help you reply faster.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for individuals and small businesses",
    features: [
      "5 social accounts",
      "50 scheduled posts/month",
      "Basic analytics",
      "AI content suggestions",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing teams and agencies",
    features: [
      "20 social accounts",
      "Unlimited scheduled posts",
      "Advanced analytics & reports",
      "Full AI content studio",
      "Team collaboration (5 seats)",
      "Priority support",
      "Custom branding",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For large organizations",
    features: [
      "Unlimited social accounts",
      "Unlimited everything",
      "White-label reports",
      "AI content studio + fine-tuning",
      "Unlimited team members",
      "SSO & advanced security",
      "Dedicated account manager",
      "Custom integrations",
    ],
    popular: false,
  },
];

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "2M+", label: "Posts Managed" },
  { value: "98%", label: "Satisfaction" },
  { value: "50+", label: "Countries" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">SocialPilot AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Testimonials
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        <div className="container mx-auto px-4 py-24 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Star className="w-3 h-3 mr-1" />
              Trusted by 10,000+ brands
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Supercharge Your Social Media with{" "}
              <span className="gradient-text">AI Power</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create, schedule, and analyze content across all platforms from one
              intelligent dashboard. Let AI handle the heavy lifting while you
              focus on strategy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
          {/* Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="rounded-xl border bg-card p-2 shadow-2xl">
              <div className="rounded-lg bg-muted/50 aspect-[16/9] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Interactive Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-text">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Dominate Social
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools powered by AI to help you create better
              content, reach more people, and grow faster.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border p-6 hover:shadow-lg transition-all duration-300 bg-card"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include a 14-day
              trial.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 bg-card relative ${
                  plan.popular
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
                <div className="mt-6 mb-8">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Marketers Worldwide
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                quote:
                  "SocialPilot AI has completely transformed how we manage social media. The AI content suggestions are incredibly accurate.",
                author: "Jessica M.",
                role: "Marketing Director",
                company: "TechStart Inc.",
              },
              {
                quote:
                  "We save 15+ hours per week on content creation. The scheduling AI knows exactly when our audience is most active.",
                author: "David K.",
                role: "Social Media Manager",
                company: "GrowthBrand",
              },
              {
                quote:
                  "The analytics dashboard is a game-changer. We can finally prove ROI to stakeholders with beautiful, exportable reports.",
                author: "Maria L.",
                role: "CMO",
                company: "ScaleUp Agency",
              },
            ].map((t) => (
              <div key={t.author} className="rounded-xl border p-6 bg-card">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-sm mb-6">"{t.quote}"</p>
                <div>
                  <div className="font-semibold text-sm">{t.author}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.role}, {t.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Social Strategy?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join 10,000+ brands already using SocialPilot AI to grow their
            social presence.
          </p>
          <Link href="/register">
            <Button size="lg">
              Start Your Free Trial
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold">SocialPilot AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered social media management for modern teams.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 SocialPilot AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
