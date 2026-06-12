/**
 * app/(tabs)/clients/visits/[id].tsx — Visit detail (Clients stack)
 *
 * Re-exports the shared VisitDetailView so that navigating to a visit
 * from the Clients tab stays within the Clients stack. Back button
 * returns to the client detail screen naturally.
 */

export { default } from '@/components/visits/VisitDetailView';
