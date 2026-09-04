"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Check,
  Download,
  Receipt,
  Calendar,
  AlertCircle,
  Zap,
  Star,
  ArrowRight,
  Shield,
} from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: 29,
    features: [
      "5 social accounts",
      "50 scheduled posts/month",
      "Basic analytics",
      "AI content suggestions",
    ],
    current: false,
  },
  {
    name: "Professional",
    price: 79,
    features: [
      "20 social accounts",
      "Unlimited scheduled posts",
      "Advanced analytics",
      "Full AI content studio",
      "Team collaboration (5 seats)",
    ],
    current: true,
  },
  {
    name: "Enterprise",
    price: 199,
    features: [
      "Unlimited social accounts",
      "Unlimited everything",
      "White-label reports",
      "Custom integrations",
      "Dedicated account manager",
    ],
    current: false,
  },
];

const invoices = [
  {
    id: "INV-001",
    date: "Jan 1, 2025",
    amount: "$79.00",
    status: "paid",
    plan: "Professional",
  },
  {
    id: "INV-002",
    date: "Dec 1, 2024",
    amount: "$79.00",
    status: "paid",
    plan: "Professional",
  },
  {
    id: "INV-003",
    date: "Nov 1, 2024",
    amount: "$79.00",
    status: "paid",
    plan: "Professional",
  },
  {
    id: "INV-004",
    date: "Oct 1, 2024",
    amount: "$29.00",
    status: "paid",
    plan: "Starter",
  },
];

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Manage your plan, payment methods, and invoices
        </p>
      </div>

      {/* Current Plan */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-2">Current Plan</Badge>
              <h2 className="text-2xl font-bold">Professional</h2>
              <p className="text-muted-foreground mt-1">
                $79/month · Billed monthly
              </p>
            </div>
            <Button variant="outline">Manage Plan</Button>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Social Accounts</span>
              <span className="font-medium">14 / 20</span>
            </div>
            <Progress value={70} className="h-2" />

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Posts This Month</span>
              <span className="font-medium">89 / Unlimited</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Team Members</span>
              <span className="font-medium">3 / 5</span>
            </div>
            <Progress value={60} className="h-2" />
          </div>

          <div className="mt-4 pt-4 border-t flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Next billing date: February 1, 2025
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment">Payment Method</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6 mt-6">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={`text-sm ${
                billingCycle === "monthly"
                  ? "font-medium"
                  : "text-muted-foreground"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingCycle(
                  billingCycle === "monthly" ? "yearly" : "monthly"
                )
              }
              className="w-12 h-6 rounded-full bg-primary relative transition-colors"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  billingCycle === "yearly"
                    ? "translate-x-6"
                    : "translate-x-0.5"
                }`}
              />
            </button>
            <span
              className={`text-sm ${
                billingCycle === "yearly"
                  ? "font-medium"
                  : "text-muted-foreground"
              }`}
            >
              Yearly{" "}
              <Badge variant="secondary" className="ml-1 text-[10px]">
                Save 20%
              </Badge>
            </span>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.current
                    ? "border-primary shadow-md ring-2 ring-primary/20"
                    : ""
                }`}
              >
                {plan.current && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Current
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-bold">
                      $
                      {billingCycle === "yearly"
                        ? Math.round(plan.price * 0.8)
                        : plan.price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.current ? "outline" : "default"}
                    className="w-full"
                    disabled={plan.current}
                  >
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Invoice History</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1.5" />
                  Download All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.date} · {invoice.plan}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">
                        {invoice.amount}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-[10px]"
                      >
                        Paid
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <p className="text-sm font-medium">Visa ending in 4242</p>
                    <p className="text-xs text-muted-foreground">
                      Expires 12/2026
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-1.5" />
                Add Payment Method
              </Button>

              <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your payment information is securely processed by Stripe. We
                  never store your full card number.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
