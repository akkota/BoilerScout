import DiscoverEntityCard from "@/components/DiscoverEntityCard";
import type { DiscoverOrganization, DiscoverVenue } from "@/types/discover";

interface DiscoverGroupsProps {
  organizations: DiscoverOrganization[];
  venues: DiscoverVenue[];
  isLoading?: boolean;
  query?: string;
}

export default function DiscoverGroups({
  organizations,
  venues,
  isLoading = false,
  query = "",
}: DiscoverGroupsProps) {
  const showOrgs = organizations.length > 0;
  const showVenues = venues.length > 0;

  if (!showOrgs && !showVenues) {
    if (isLoading || !query.trim()) return null;
    return null;
  }

  return (
    <div className="space-y-8" aria-busy={isLoading}>
      {showOrgs && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold tracking-[0.14em] uppercase text-stone-500 dark:text-stone-400">
            Organizations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizations.map((org) => (
              <DiscoverEntityCard key={org.id} entity={org} />
            ))}
          </div>
        </section>
      )}

      {showVenues && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold tracking-[0.14em] uppercase text-stone-500 dark:text-stone-400">
            Venues
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((venue) => (
              <DiscoverEntityCard key={venue.id} entity={venue} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
