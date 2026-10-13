import { PublicShell } from './Landing.jsx';

function Doc({ title, children }) {
  return (
    <PublicShell>
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">Draft - to be reviewed before launch.</p>
        <div className="mt-8 space-y-5 leading-relaxed text-ink/85 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
      </article>
    </PublicShell>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy policy">
      <p>Team Intelligent Squad runs IntelSquad. This policy explains what we collect and how we protect it, in line with India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account: full name, display name, mobile number, email and a password.</li>
        <li>Your PDS, comments, upvotes, slot bookings and any files you attach.</li>
        <li>Security records: login times, device type and IP address.</li>
      </ul>
      <h2>Who can see what</h2>
      <ul>
        <li>Other users only ever see your display name - never your mobile number or email.</li>
        <li>Public PDS and their comments are visible to logged-in users. Private PDS are visible only to you and the team.</li>
        <li>Only our admins can see your contact details, and only to contact you about your PDS.</li>
      </ul>
      <h2>How we protect it</h2>
      <ul>
        <li>Passwords are stored only as bcrypt hashes. Nobody, including the team, can read them.</li>
        <li>Your name, mobile number and email are encrypted with AES-256-GCM.</li>
        <li>A temporary password from the team must be changed the first time you log in with it.</li>
        <li>Files are kept in private storage and opened only through short-lived links.</li>
        <li>Team accounts use two-factor authentication, and admin actions are logged.</li>
      </ul>
      <h2>Your choices</h2>
      <ul>
        <li>Make any PDS public or private at any time.</li>
        <li>Download your data or delete your account from your profile. Deleting removes your personal data; public PDS and comments stay as &quot;Deleted user&quot;.</li>
      </ul>
      <p>Please do not put passwords, bank details or other sensitive information in a public PDS or comment.</p>
    </Doc>
  );
}

export function Terms() {
  return (
    <Doc title="Terms of use">
      <ul>
        <li>Share only problems and ideas you have the right to share. Do not post anything illegal, abusive or someone else&apos;s private data.</li>
        <li>Public PDS can be read and commented on by other users. Use Private if you do not want that.</li>
        <li>Comments must be helpful and respectful. We may hide comments and block accounts that break these rules.</li>
        <li>The team chooses which PDS to build. Slot dates are estimates and may move if earlier work runs late; you will be told when they do.</li>
        <li>Ownership, cost and delivery details of any project are agreed separately with the team before work starts.</li>
      </ul>
    </Doc>
  );
}
