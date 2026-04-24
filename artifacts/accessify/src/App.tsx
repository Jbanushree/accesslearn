import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AccessibilityProvider } from "@/lib/accessibility-provider";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Library from "@/pages/library";
import Upload from "@/pages/upload";
import DocumentDetail from "@/pages/document-detail";
import Shared from "@/pages/shared";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/library" component={Library} />
      <Route path="/upload" component={Upload} />
      <Route path="/document/:id" component={DocumentDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function isSharedRoute() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return window.location.pathname.startsWith(`${base}/shared/`);
}

function App() {
  const sharedView = isSharedRoute();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="accessify-theme">
        <AccessibilityProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              {sharedView ? (
                <Switch>
                  <Route path="/shared/:token" component={Shared} />
                  <Route component={NotFound} />
                </Switch>
              ) : (
                <Layout>
                  <Router />
                </Layout>
              )}
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
