import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { WorkspaceProvider } from '@/lib/workspace';
import { Loading, Shell } from '@/components/shared';
import { DogProfilePage, DogsPage } from '@/pages/dogs';
import { PathsPage } from '@/pages/paths';
import { JourneyPage } from '@/pages/journey';
import { MilestonesPage } from '@/pages/milestones';
import HandlerPage from '@/pages/handler';

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#f25a1b',
    colorForeground: '#2b1d16',
    colorMutedForeground: '#8a6f60',
    colorDanger: '#c0301f',
    colorBackground: '#fffdfa',
    colorInput: '#ffffff',
    colorInputForeground: '#2b1d16',
    colorNeutral: '#2b1d16',
    fontFamily: 'Nunito, sans-serif',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdfa] rounded-3xl w-[440px] max-w-full overflow-hidden border-2 border-[#f1ddcc] shadow-[0_4px_0_#f1ddcc]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#2b1d16] font-bold',
    headerSubtitle: 'text-[#8a6f60] font-semibold',
    socialButtonsBlockButtonText: 'text-[#2b1d16] font-bold',
    formFieldLabel: 'text-[#2b1d16] font-extrabold',
    footerActionLink: 'text-[#c9420c] font-extrabold',
    footerActionText: 'text-[#8a6f60] font-semibold',
    dividerText: 'text-[#8a6f60]',
    identityPreviewEditButton: 'text-[#c9420c]',
    formFieldSuccessText: 'text-[#17783f]',
    alertText: 'text-[#a42a1a]',
    logoBox: 'h-14',
    logoImage: 'h-14 w-14',
    formButtonPrimary: 'bg-[#f25a1b] hover:bg-[#c9420c] text-white font-extrabold rounded-2xl shadow-[0_4px_0_#c9420c]',
    formFieldInput: 'border-2 border-[#f1ddcc] rounded-xl bg-white text-[#2b1d16]',
    socialButtonsBlockButton: 'border-2 border-[#f1ddcc] rounded-xl bg-white',
  },
};

function AuthPage({ children }: { children: ReactNode }) {
  return <div className="auth-wrap"><div>{children}<Link href="/" className="back auth-back">Back to GoodBoy</Link></div></div>;
}
function SignInPage() {
  return <AuthPage><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthPage>;
}
function SignUpPage() {
  return <AuthPage><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthPage>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== userId) client.clear();
      prev.current = userId;
    });
  }, [addListener, client]);
  return null;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Loading />;
  return isSignedIn ? <Redirect to="/dogs" /> : <DogsPage />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AppRoutes() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/handler/:id" component={HandlerPage} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route><Shell><Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/dogs" component={DogsPage} />
      <Route path="/dogs/:dogId" component={DogProfilePage} />
      <Route path="/paths" component={PathsPage} />
      <Route path="/journey/:pathId" component={JourneyPage} />
      <Route path="/milestones" component={MilestonesPage} />
      <Route component={NotFound} />
    </Switch></Shell></Route>
  </Switch></RoutedErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={basePath || '/'}
      localization={{
        signIn: { start: { title: 'Sign in to GoodBoy', subtitle: 'Keep your training records private' } },
        signUp: { start: { title: 'Create your GoodBoy account', subtitle: 'Save paths, upload videos and share with handlers' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <WorkspaceProvider>
        <TooltipProvider><AppRoutes /><Toaster /></TooltipProvider>
      </WorkspaceProvider>
    </ClerkProvider>
  );
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter></QueryClientProvider>;
}

export default App;
