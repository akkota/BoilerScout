import Image from "next/image";
import type { DiscoverOrganization, DiscoverVenue } from "@/types/discover";

type DiscoverEntity = DiscoverOrganization | DiscoverVenue;

interface DiscoverEntityCardProps {
  entity: DiscoverEntity;
}

export default function DiscoverEntityCard({ entity }: DiscoverEntityCardProps) {
  const isOrg = entity.type === "organization";
  const subtitle = isOrg
    ? entity.categories.filter((c) => c?.trim()).slice(0, 3).join(" · ")
    : entity.address?.trim();
  const reasons = (entity.reasons ?? []).filter((r) => r?.trim()).slice(0, 3);

  return (
    <article className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl p-5 flex flex-col gap-2">
      {entity.imageUrl?.trim() && (
        <div className="relative h-32 w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900">
          <Image
            src={entity.imageUrl}
            alt={`${entity.name} photo`}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
        {isOrg ? "Organization" : "Venue"}
      </p>
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-tight">
        {entity.name}
      </h3>
      {subtitle && (
        <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>
      )}
      {entity.description?.trim() && (
        <p className="text-sm text-stone-600 dark:text-stone-300 line-clamp-2">
          {entity.description}
        </p>
      )}
      {reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-1">
          {reasons.map((reason) => (
            <li
              key={reason}
              className="text-[11px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
      {entity.url?.trim() && (
        <a
          href={entity.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline mt-1 w-fit"
          onClick={(e) => e.stopPropagation()}
        >
          View details →
        </a>
      )}
    </article>
  );
}
