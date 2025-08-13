import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Label,
  Checkbox,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
} from "@rafal.lemieszewski/tide-ui";
import { TodoDemo } from "./components/TodoDemo";
import { ConvexStatus } from "./components/ConvexStatus";

function App() {
  const [email, setEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [notifications, setNotifications] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)] p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">
            🚀 Tide UI + Vite + Tailwind v4
          </h1>
          <p className="text-body-lg mx-auto max-w-2xl text-[var(--color-text-secondary)]">
            A comprehensive React component library demonstration using Vite,
            TypeScript, and Tailwind CSS v4. All components are fully functional
            with your design system tokens.
          </p>
          <div className="flex justify-center gap-3">
            <Badge intent="brand" appearance="solid">
              Vite
            </Badge>
            <Badge intent="success" appearance="solid">
              TypeScript
            </Badge>
            <Badge intent="warning" appearance="solid">
              Tailwind v4
            </Badge>
            <Badge intent="destructive" appearance="solid">
              React
            </Badge>
          </div>
        </div>

        {/* Button Showcase */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-lg">Button Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-heading-sm mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="primary">Primary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-heading-sm mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-heading-sm mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Button icon="plus" iconPosition="left">
                  Add Item
                </Button>
                <Button icon="arrow-right" iconPosition="right">
                  Next
                </Button>
                <Button icon="settings" />
                <Button icon="download" iconPosition="left" variant="primary">
                  Download
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-heading-sm mb-3">States</h3>
              <div className="flex flex-wrap gap-3">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button variant="primary" loading>
                  Processing
                </Button>
                <Button variant="destructive" loading>
                  Deleting
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Components */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-lg">Form Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Your company name"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-heading-sm">Preferences</h4>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    />
                    <Label htmlFor="terms">Accept terms and conditions</Label>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications">Email notifications</Label>
                    <Switch
                      id="notifications"
                      checked={notifications}
                      onCheckedChange={setNotifications}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="newsletter" />
                    <Label htmlFor="newsletter">Subscribe to newsletter</Label>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end space-x-3">
              <Button variant="ghost">Cancel</Button>
              <Button variant="primary" disabled={!acceptTerms}>
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-lg">Tabs Component</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-heading-md">Project Overview</h3>
                  <p className="text-body-md text-[var(--color-text-secondary)]">
                    Here's a comprehensive overview of your project metrics and
                    current status.
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-heading-lg text-[var(--color-text-brand)]">
                            1,234
                          </div>
                          <p className="text-body-sm text-[var(--color-text-secondary)]">
                            Total Users
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-heading-lg text-[var(--color-text-success)]">
                            98.5%
                          </div>
                          <p className="text-body-sm text-[var(--color-text-secondary)]">
                            Uptime
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-heading-lg text-[var(--color-text-warning)]">
                            $12.5k
                          </div>
                          <p className="text-body-sm text-[var(--color-text-secondary)]">
                            Revenue
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-heading-md">Analytics Dashboard</h3>
                  <p className="text-body-md text-[var(--color-text-secondary)]">
                    Detailed analytics and insights about your application
                    performance.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-heading-md">Reports</h3>
                  <p className="text-body-md text-[var(--color-text-secondary)]">
                    Generate and download comprehensive reports for your data.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-heading-md">Settings</h3>
                  <p className="text-body-md text-[var(--color-text-secondary)]">
                    Configure your application settings and preferences.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Badge Showcase */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-lg">Badge Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-heading-sm mb-3">Solid Appearance</h3>
              <div className="flex flex-wrap gap-3">
                <Badge intent="neutral" appearance="solid">
                  Neutral
                </Badge>
                <Badge intent="brand" appearance="solid">
                  Brand
                </Badge>
                <Badge intent="success" appearance="solid">
                  Success
                </Badge>
                <Badge intent="warning" appearance="solid">
                  Warning
                </Badge>
                <Badge intent="destructive" appearance="solid">
                  Error
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="text-heading-sm mb-3">Subtle Appearance</h3>
              <div className="flex flex-wrap gap-3">
                <Badge intent="neutral" appearance="subtle">
                  Neutral
                </Badge>
                <Badge intent="brand" appearance="subtle">
                  Brand
                </Badge>
                <Badge intent="success" appearance="subtle">
                  Success
                </Badge>
                <Badge intent="warning" appearance="subtle">
                  Warning
                </Badge>
                <Badge intent="destructive" appearance="subtle">
                  Error
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="text-heading-sm mb-3">Outline Appearance</h3>
              <div className="flex flex-wrap gap-3">
                <Badge intent="neutral" appearance="outline">
                  Neutral
                </Badge>
                <Badge intent="brand" appearance="outline">
                  Brand
                </Badge>
                <Badge intent="success" appearance="outline">
                  Success
                </Badge>
                <Badge intent="warning" appearance="outline">
                  Warning
                </Badge>
                <Badge intent="destructive" appearance="outline">
                  Error
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Convex Database Demo */}
        <ConvexStatus />
        <TodoDemo />

        {/* Footer */}
        <div className="py-8 text-center">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Built with ❤️ using Tide UI, Vite, React, TypeScript, Tailwind CSS v4, and Convex
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
