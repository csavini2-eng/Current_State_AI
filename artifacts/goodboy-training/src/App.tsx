import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { GuestWorkspaceProvider } from '@/lib/workspace';
import { Shell } from '@/components/shared';
import { DogProfilePage, DogsPage } from '@/pages/dogs';
import { PathsPage } from '@/pages/paths';
import { JourneyPage } from '@/pages/journey';
import { MilestonesPage } from '@/pages/milestones';
import HandlerPage from '@/pages/handler';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function AppRoutes() {
  return <RoutedErrorBoundary><Switch>
    {/* Existing capability links still use the access-controlled API, never guest records. */}
    <Route path="/handler/:id" component={HandlerPage} />
    <Route path="/sign-in/*?"><Redirect to="/" /></Route>
    <Route path="/sign-up/*?"><Redirect to="/" /></Route>
    <Route><Shell><Switch>
      <Route path="/" component={DogsPage} />
      <Route path="/dogs" component={DogsPage} />
      <Route path="/dogs/:dogId" component={DogProfilePage} />
      <Route path="/paths" component={PathsPage} />
      <Route path="/journey/:pathId" component={JourneyPage} />
      <Route path="/milestones" component={MilestonesPage} />
      <Route component={NotFound} />
    </Switch></Shell></Route>
  </Switch></RoutedErrorBoundary>;
}
export default function App() {
  // The public demo deliberately has no Clerk provider/key dependency and never loads
  // private workspaces, even if this browser has an existing authenticated session.
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}>
    <GuestWorkspaceProvider><TooltipProvider><AppRoutes /><Toaster /></TooltipProvider></GuestWorkspaceProvider>
  </WouterRouter></QueryClientProvider>;
}
