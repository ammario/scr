import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import dayjs from "dayjs";

import App from "../App";
import Home from "../pages/Home";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import NoteView from "../components/NoteView";
import DecryptedFileCard from "../components/DecryptedFileCard";
import CreatedNoteBox from "../components/CreatedNoteBox";

const meta: Meta = {
  title: "App",
  decorators: [(Story) => <App><Story /></App>],
};

export default meta;
type Story = StoryObj;

// ============================================================================
// HELPERS
// ============================================================================

const expiresIn = (hours: number) => dayjs().add(hours, "hours").toISOString();
const mockBlob = (content = "secret content") => new Blob([content], { type: "text/plain" });

// Created note view (post-creation state)
function CreatedNote({
  noteUrl,
  cleartext,
  destroyAfterRead = false,
  expiresAt,
  file,
}: {
  noteUrl: string;
  cleartext: string;
  destroyAfterRead?: boolean;
  expiresAt?: string;
  file?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl">
      <div className="space-y-8">
        <CreatedNoteBox noteUrl={noteUrl} />
        <div className="pt-6 space-y-3">
          <div className="text-xs text-muted-foreground tracking-wide uppercase">Preview</div>
          <NoteView
            destroyAfterRead={destroyAfterRead}
            expiresAt={expiresAt ?? expiresIn(24)}
            cleartext={cleartext}
            file={file}
            isPreview
          />
        </div>
      </div>
    </div>
  );
}

// View note page wrapper
function ViewNotePage({
  error,
  loading,
  note,
  file,
}: {
  error?: string;
  loading?: number;
  note?: { destroyAfterRead: boolean; expiresAt: string; cleartext?: string };
  file?: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(!!note?.cleartext);

  return (
    <div className="space-y-4 w-full max-w-3xl">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {loading !== undefined && loading < 1 && <Progress value={loading * 100} />}
      {note && !error && (
        <NoteView
          destroyAfterRead={note.destroyAfterRead}
          expiresAt={note.expiresAt}
          cleartext={revealed ? note.cleartext : undefined}
          onRead={() => setRevealed(true)}
          file={file}
          onReply={() => alert("Reply")}
        />
      )}
    </div>
  );
}

// ============================================================================
// HOME PAGE - Uses actual Home component
// ============================================================================

export const HomeCreateForm: Story = {
  name: "Home / Create Form",
  render: () => <Home />,
};

// ============================================================================
// NOTE CREATED STATES
// ============================================================================

export const CreatedBasic: Story = {
  name: "Created / Basic",
  render: () => (
    <CreatedNote
      noteUrl="https://s.cr/abc123#encryption-key-here"
      cleartext="Here are the credentials you requested."
    />
  ),
};

export const CreatedDestroyAfterRead: Story = {
  name: "Created / Destroy After Read",
  render: () => (
    <CreatedNote
      noteUrl="https://s.cr/xyz789#key"
      cleartext="One-time password: correct-horse-battery-staple"
      destroyAfterRead
    />
  ),
};

export const CreatedWithFile: Story = {
  name: "Created / With File",
  render: () => (
    <CreatedNote
      noteUrl="https://s.cr/file456#key"
      cleartext="Here's the config file."
      file={<DecryptedFileCard name="config.env" blob={mockBlob("DB_URL=...")} />}
    />
  ),
};

export const CreatedMultiline: Story = {
  name: "Created / Multiline",
  render: () => (
    <CreatedNote
      noteUrl="https://s.cr/multi#key"
      cleartext={`Server: prod.example.com
User: admin
Password: super-secret

SSH Key: ssh-rsa AAAA...`}
      expiresAt={expiresIn(168)}
    />
  ),
};

// ============================================================================
// VIEW NOTE STATES
// ============================================================================

export const ViewLoading: Story = {
  name: "View / Loading",
  render: () => <ViewNotePage loading={0.65} />,
};

export const ViewErrorNotFound: Story = {
  name: "View / Not Found",
  render: () => <ViewNotePage error="This note doesn't exist." />,
};

export const ViewErrorDecryption: Story = {
  name: "View / Decryption Failed",
  render: () => <ViewNotePage error="Decryption failed. Your URL is probably malformed." />,
};

export const ViewStandard: Story = {
  name: "View / Standard Note",
  render: () => (
    <ViewNotePage
      note={{
        destroyAfterRead: false,
        expiresAt: expiresIn(24),
        cleartext: "API_KEY=sk-prod-abc123\nAPI_SECRET=super-secret-value",
      }}
    />
  ),
};

export const ViewExpiringSoon: Story = {
  name: "View / Expiring Soon",
  render: () => (
    <ViewNotePage
      note={{
        destroyAfterRead: false,
        expiresAt: expiresIn(1),
        cleartext: "Quick! This expires in an hour.",
      }}
    />
  ),
};

export const ViewDestroyInterstitial: Story = {
  name: "View / Destroy After Read (Interstitial)",
  render: () => (
    <ViewNotePage
      note={{
        destroyAfterRead: true,
        expiresAt: expiresIn(24),
      }}
    />
  ),
};

export const ViewDestroyRevealed: Story = {
  name: "View / Destroy After Read (Revealed)",
  render: () => {
    const Revealed = () => (
      <div className="space-y-4 w-full max-w-3xl">
        <NoteView
          destroyAfterRead
          expiresAt={expiresIn(24)}
          cleartext="🔐 This is your one-time password: hunter2"
          onReply={() => alert("Reply")}
        />
      </div>
    );
    return <Revealed />;
  },
};

export const ViewWithFile: Story = {
  name: "View / With File",
  render: () => (
    <ViewNotePage
      note={{
        destroyAfterRead: false,
        expiresAt: expiresIn(24),
        cleartext: "Attached is the SSH key.",
      }}
      file={<DecryptedFileCard name="id_rsa" blob={mockBlob("-----BEGIN PRIVATE KEY-----")} />}
    />
  ),
};

export const ViewFileOnly: Story = {
  name: "View / File Only",
  render: () => (
    <ViewNotePage
      note={{
        destroyAfterRead: false,
        expiresAt: expiresIn(24),
        cleartext: "",
      }}
      file={<DecryptedFileCard name="document.pdf" blob={mockBlob("PDF content")} />}
    />
  ),
};
