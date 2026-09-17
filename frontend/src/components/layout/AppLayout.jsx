import { Outlet, useMatches } from 'react-router-dom';
import Sidebar, { SIDEBAR_OFFSET } from './Sidebar.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { PageMetaProvider, usePageMeta } from '../../context/PageMetaContext.jsx';

function AppLayoutContent() {
  const matches = useMatches();
  const current = [...matches].reverse().find((m) => m.handle?.title);
  const title = current?.handle?.title || 'DocFlow';
  const Icon = current?.handle?.icon;
  const { collapsed } = useSidebar();
  const { count } = usePageMeta();

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <Sidebar />
      <main className={`flex min-h-screen flex-col pt-16 transition-[padding] duration-150 ${collapsed ? SIDEBAR_OFFSET.collapsed : SIDEBAR_OFFSET.expanded}`}>
        <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">
          <div className="mb-1 flex items-center gap-3">
            {Icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                <Icon size={22} strokeWidth={2.25} />
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-semibold text-ink-900">{title}</h1>
              {count != null && (
                <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-accent-100 px-2 py-0.5 text-sm font-semibold text-accent-700">
                  {count}
                </span>
              )}
            </div>
          </div>
          <div className="mt-5">
            <Outlet />
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default function AppLayout() {
  return (
    <PageMetaProvider>
      <AppLayoutContent />
    </PageMetaProvider>
  );
}
