/**
 * One shared footer, used in two places: here at the bottom of
 * AppLayout's content column (every authenticated page), and again
 * inside AuthShell for the signed-out pages (login, register, ...),
 * which render entirely outside AppLayout and so would otherwise have
 * no footer at all. `edgeToEdge` controls only the outer border/spacing
 * treatment so it can sit flush in either context; the copyright line
 * itself never changes.
 */
export default function Footer({ edgeToEdge = true }) {
  const year = new Date().getFullYear();

  return (
    <footer className={edgeToEdge ? 'border-t border-ink-200/70' : ''}>
      <div
        className={`flex flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row ${
          edgeToEdge ? 'mx-auto max-w-6xl px-8 py-5' : 'py-4'
        }`}
      >
        <p>© {year} DocFlow. All rights reserved.</p>
        <p className="flex items-center gap-3">
          <span>Every document, live from every author.</span>
        </p>
      </div>
    </footer>
  );
}
