import { Card, CardContent, CardHeader, CardTitle, Badge } from "@rafal.lemieszewski/tide-ui";

function About() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4 text-center">
        <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">
          About Seamless Sea
        </h1>
        <p className="text-body-lg mx-auto max-w-2xl text-[var(--color-text-secondary)]">
          Learn more about our technology stack and the tools that power this application.
        </p>
      </div>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-lg">Technology Stack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            
            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Frontend Framework
                <Badge intent="brand" appearance="solid">Core</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>React 19</strong> - The latest version of React with improved performance and new features.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Routing Solution
                <Badge intent="success" appearance="solid">New</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>React Router 7</strong> - Modern client-side routing in library mode for maximum flexibility.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Build Tool
                <Badge intent="warning" appearance="solid">Fast</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>Vite 6</strong> - Lightning-fast build tool with Hot Module Replacement.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Styling
                <Badge intent="destructive" appearance="solid">v4</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>Tailwind CSS v4</strong> - Next-generation utility-first CSS framework.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Component Library
                <Badge intent="neutral" appearance="solid">UI</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>Tide UI</strong> - Custom React component library with design system tokens.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Database
                <Badge intent="brand" appearance="solid">Real-time</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>Convex</strong> - Modern backend-as-a-service with real-time updates.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Language
                <Badge intent="success" appearance="solid">Type Safe</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>TypeScript</strong> - Strongly typed JavaScript for better development experience.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Code Quality
                <Badge intent="warning" appearance="solid">Linting</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>ESLint</strong> - Code linting and formatting for consistent code style.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-heading-sm flex items-center gap-2">
                Deployment
                <Badge intent="destructive" appearance="solid">Cloud</Badge>
              </h3>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                <strong>Vercel</strong> - Modern deployment platform with edge functions.
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-lg">Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-heading-sm">⚡ Fast Development</h4>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                Hot Module Replacement with Vite for instant feedback during development.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-heading-sm">🎨 Modern Design</h4>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                Beautiful UI components with Tide UI and Tailwind CSS v4.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-heading-sm">🔄 Real-time Updates</h4>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                Live data synchronization with Convex database integration.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-heading-sm">🛡️ Type Safety</h4>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                Full TypeScript support for better developer experience and fewer bugs.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-heading-sm">🚀 Modern Routing</h4>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                React Router 7 in library mode for flexible client-side navigation.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-heading-sm">📱 Responsive Design</h4>
              <p className="text-body-md text-[var(--color-text-secondary)]">
                Mobile-first design that works perfectly on all device sizes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-lg">Version Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-heading-md text-[var(--color-text-brand)]">v7.8.1</div>
              <p className="text-body-sm text-[var(--color-text-secondary)]">React Router</p>
            </div>
            <div className="text-center">
              <div className="text-heading-md text-[var(--color-text-success)]">v19.1.1</div>
              <p className="text-body-sm text-[var(--color-text-secondary)]">React</p>
            </div>
            <div className="text-center">
              <div className="text-heading-md text-[var(--color-text-warning)]">v6.3.5</div>
              <p className="text-body-sm text-[var(--color-text-secondary)]">Vite</p>
            </div>
            <div className="text-center">
              <div className="text-heading-md text-[var(--color-text-destructive)]">v4.1.11</div>
              <p className="text-body-sm text-[var(--color-text-secondary)]">Tailwind CSS</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default About;