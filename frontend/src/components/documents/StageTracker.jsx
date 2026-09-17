import { STAGE_ORDER, stageMeta } from '../../lib/status.js';

/**
 * The one deliberate visual signature in this app: a document's journey
 * through the pipeline rendered as a literal docflow track rather than a
 * generic numbered stepper, since "handing off phase to phase" is the
 * product's actual core mechanic, not just a progress indicator.
 */
export default function StageTracker({ stage }) {
  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex items-center">
      {STAGE_ORDER.map((s, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLive = s === 'LIVE';
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                  isCurrent
                    ? isLive
                      ? 'border-accent-600 bg-accent-600'
                      : 'border-accent-600 bg-paper-raised'
                    : isDone
                      ? 'border-accent-600 bg-accent-600'
                      : 'border-ink-200 bg-paper-raised'
                }`}
              >
                {(isDone || (isCurrent && isLive)) && <span className="h-2 w-2 rounded-full bg-paper-raised" />}
              </div>
              <span className={`text-[11px] font-medium ${isCurrent ? 'text-accent-700' : isDone ? 'text-ink-600' : 'text-ink-400'}`}>
                {stageMeta(s).label}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className={`mx-1.5 mb-4 h-0.5 flex-1 rounded-full ${i < currentIndex ? 'bg-accent-600' : 'bg-ink-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
