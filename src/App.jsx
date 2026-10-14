import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing.jsx';
import { Forgot, Login, SetPassword, Signup, Start } from './pages/public/Auth.jsx';
import { Privacy, Terms } from './pages/public/Legal.jsx';
import { Spinner } from './components/ui.jsx';
import { adminPages, appPages } from './lib/routes.js';

// The logged-in app and the team panel are code-split, so a phone opening the QR link
// downloads only the landing and sign-up code (PRD §15: under 2 s on 4G). Once inside,
// the shells prefetch the rest of their pages in the background (lib/routes.js).
const AppShell = lazy(appPages.Shell);
const Dashboard = lazy(appPages.Dashboard);
const Community = lazy(appPages.Community);
const PdsForm = lazy(appPages.PdsForm);
const PdsView = lazy(appPages.PdsView);
const MyPds = lazy(appPages.MyPds);
const Notifications = lazy(appPages.Notifications);
const Profile = lazy(appPages.Profile);

const AdminLayout = lazy(adminPages.Layout);
const SetupTwoFactor = lazy(() => adminPages.Layout().then((m) => ({ default: m.SetupTwoFactor })));
const Overview = lazy(adminPages.Overview);
const PdsList = lazy(adminPages.PdsList);
const PdsAdmin = lazy(adminPages.PdsAdmin);
const Slots = lazy(adminPages.Slots);
const Moderation = lazy(adminPages.Moderation);
const Users = lazy(adminPages.Users);
const QrCodes = lazy(adminPages.QrCodes);
const Audit = lazy(adminPages.Audit);
const Settings = lazy(adminPages.Settings);

export default function App() {
  return (
    <Suspense fallback={<Spinner className="min-h-dvh" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Start />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/community" element={<Community />} />
          <Route path="/my" element={<MyPds />} />
          <Route path="/pds/new" element={<PdsForm />} />
          <Route path="/pds/:code" element={<PdsView />} />
          <Route path="/pds/:code/edit" element={<PdsForm />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="/admin/is/login" element={<Login team />} />
        <Route path="/admin/setup-2fa" element={<SetupTwoFactor />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="pds" element={<PdsList />} />
          <Route path="pds/:code" element={<PdsAdmin />} />
          <Route path="slots" element={<Slots />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="users" element={<Users />} />
          <Route path="qr" element={<QrCodes />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* v1 links */}
        <Route path="/submit" element={<Navigate to="/start" replace />} />
        <Route path="/verify" element={<Navigate to="/dashboard" replace />} />
        <Route path="/reset-password" element={<Navigate to="/forgot" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
