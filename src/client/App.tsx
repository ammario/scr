import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppProps {
  children: ReactNode;
}

export default function App({ children }: AppProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[800px] w-full px-4 py-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary m-0">
              <Link to="/" className="text-inherit no-underline hover:text-inherit">
                s.cr
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground mt-0 mb-0">
              Send end-to-end encrypted, self-destructing notes.
            </p>
          </div>
          <nav className="flex flex-row gap-4 text-xs">
            <a target="_blank" href="https://github.com/ammario/scr?tab=readme-ov-file#scr" className="text-accent-light">
              About
            </a>
            <a target="_blank" href="https://github.com/ammario/scr" className="text-accent-light">
              Source
            </a>
          </nav>
        </header>

        <div className="w-full mt-6">
          {children}
        </div>
      </div>
    </main>
  );
}
