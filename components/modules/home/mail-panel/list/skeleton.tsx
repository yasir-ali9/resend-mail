import { cn } from "@/lib/utils";

const rows = [
  ["w-24", "w-2/3", "w-10"],
  ["w-32", "w-1/2", "w-12"],
  ["w-20", "w-3/4", "w-9"],
  ["w-28", "w-3/5", "w-11"],
  ["w-36", "w-1/2", "w-10"],
  ["w-24", "w-2/3", "w-12"],
  ["w-32", "w-3/5", "w-9"],
  ["w-20", "w-3/4", "w-11"],
] as const;

export function MailListSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading emails</span>
      <ul aria-hidden="true" className="motion-safe:animate-pulse">
        {rows.map(([senderWidth, subjectWidth, dateWidth], index) => (
          <li
            key={index}
            className="flex h-[52px] items-center border-b border-bd-30 px-1 sm:h-11 sm:pr-6 sm:pl-4"
          >
            <span className="hidden w-7 shrink-0 place-items-center sm:grid">
              <span className="size-3.5 rounded-sm bg-bk-50" />
            </span>
            <span className="mr-2 hidden w-7 shrink-0 place-items-center sm:grid">
              <span className="size-3.5 rounded-full bg-bk-50" />
            </span>
            <span className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(140px,220px)_minmax(180px,1fr)] sm:items-center sm:gap-4">
              <span
                className={cn(
                  "h-2.5 rounded-sm bg-bk-50",
                  senderWidth,
                )}
              />
              <span
                className={cn(
                  "h-2.5 rounded-sm bg-bk-50",
                  subjectWidth,
                )}
              />
            </span>
            <span className="hidden w-40 shrink-0 justify-end sm:flex">
              <span
                className={cn("h-2 rounded-sm bg-bk-50", dateWidth)}
              />
            </span>
            <span className="grid w-7 shrink-0 place-items-center sm:hidden">
              <span className="size-3.5 rounded-sm bg-bk-50" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
