import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing.jsx';
import { Forgot, Login, SetPassword, Signup, Start } from './pages/public/Auth.jsx';
import { Privacy, Terms } from './pages/public/Legal.jsx';
import { Spinner } from './components/ui.jsx';

// The logged-in app and the team panel are code-split, so a phone opening the QR link
// downloads only the landing and sign-up code (PRD §15: under 2 s on 4G).
const AppShell = lazy(() => import('./pages/app/Shell.jsx'));
const Dashboard = lazy(() => import('./pages/app/Dashboard.jsx'));
const Community = lazy(() => import('./pages/app/Community.jsx'));
const PdsForm = lazy(() => import('./pages/app/PdsForm.jsx'));
const PdsView = lazy(() => import('./pages/app/PdsView.jsx'));
const MyPds = lazy(() => import('./pages/app/MyPds.jsx'));
const Notifications = lazy(() => import('./pages/app/Notifications.jsx'));
const Profile = lazy(() => import('./pages/app/Profile.jsx'));

const AdminLayout = lazy(() => import('./pages/admin/Layout.jsx'));
const SetupTwoFactor = lazy(() => import('./pages/admin/Layout.jsx').then((m) => ({ default: m.SetupTwoFactor })));
const Overview = lazy(() => import('./pages/admin/Overview.jsx'));
const PdsList = lazy(() => import('./pages/admin/PdsList.jsx'));
const PdsAdmin = lazy(() => import('./pages/admin/PdsAdmin.jsx'));
const Slots = lazy(() => import('./pages/admin/Slots.jsx'));
const Moderation = lazy(() => import('./pages/admin/Moderation.jsx'));
const Users = lazy(() => import('./pages/admin/Users.jsx'));
const QrCodes = lazy(() => import('./pages/admin/QrCodes.jsx'));
const Audit = lazy(() => import('./pages/admin/Audit.jsx'));
const Settings = lazy(() => import('./pages/admin/Settings.jsx'));

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
