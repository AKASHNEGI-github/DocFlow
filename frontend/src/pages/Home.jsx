import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe2 } from 'lucide-react';
import { liveApi } from '../api/live.api.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import FilterPanel, { DEFAULT_FILTERS } from '../components/ui/FilterPanel.jsx';
import { formatDate } from '../lib/date.js';
import { sortRows } from '../lib/sort.js';
import { useToast } from '../context/ToastContext.jsx';

// Same reasoning as Live.jsx: document_live only tracks publishedAt.
const HOME_SORT_FIELDS = { name: 'title', created: 'publishedAt' };

export default function Home() {
  const [docs, setDocs] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const toast = useToast();

  useEffect(() => {
    liveApi.feed().then(setDocs).catch((err) => toast(err.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (docs === null) return <p className="text-sm text-ink-500">Loading…</p>;

  const filtered = sortRows(
    docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.category.toLowerCase().includes(query.toLowerCase())),
    filters.sort,
    HOME_SORT_FIELDS,
  );

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-ink-500">Every document currently live, from every author.</p>

      {docs.length === 0 ? (
        <EmptyState icon={Globe2} title="Nothing published yet" description="Live documents from every author will show up here." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchBar value={query} onChange={setQuery} placeholder="Search by title or category…" />
            <FilterPanel value={filters} onChange={setFilters} withStatus={false} sortFields={HOME_SORT_FIELDS} />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Globe2} title="No matches" description="Try a different search or clear the filter." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doc) => (
                <Link
                  key={doc.documentId}
                  to={`/read/${doc.documentId}`}
                  className="flex min-w-0 flex-col items-start rounded-xl border border-ink-200/70 bg-paper-raised p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="mb-2 inline-flex items-center rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700">
                    {doc.category}
                  </span>
                  <h3 className="w-full font-display text-base font-semibold leading-snug text-ink-900">{doc.title}</h3>
                  {/*
                    A plain <div>, not a <p>: doc.content is arbitrary rich
                    HTML from the editor and very likely already contains
                    its own block-level tags. A <p> cannot legally contain
                    another <p> - the browser silently auto-closes the
                    outer one at the first inner block tag, which is what
                    broke line-clamp/overflow-hidden here originally.

                    w-full + min-w-0 fix a second, separate overflow: this
                    card is a column flex container with items-start (so
                    the badge pill above can hug its own content instead of
                    stretching full width). That same items-start also let
                    THIS div shrink-wrap to its content's unwrapped
                    max-content width rather than the card's actual width -
                    line-clamp then had no stable box to clip against, so
                    the last visible line ran past the card edge instead of
                    being cut off inside it. Forcing the full width back
                    gives line-clamp-2 a real boundary to clip within.
                  */}
                  <div
                    className="docflow-content mt-1.5 line-clamp-2 w-full min-w-0 overflow-hidden break-words text-sm text-ink-500"
                    dangerouslySetInnerHTML={{ __html: doc.content }}
                  />
                  <div className="mt-4 flex w-full items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-400">
                    <span>{doc.author?.fullName}</span>
                    <span className="font-mono">
                      V{doc.versionNo} · {formatDate(doc.publishedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
