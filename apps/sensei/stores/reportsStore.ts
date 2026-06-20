import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { Interaction } from '@/types';

// ---------------------------------------------------------------------------
// Aggregated report rows
// ---------------------------------------------------------------------------

export interface VendorReportRow {
  userId: string;
  name: string;
  branchId: string | null;
  branchName: string;
  contacted: number;
  notContacted: number;
  rejected: number;
  sales: number;
  /** sales / contacted, 0..1 */
  conversionRate: number;
}

export interface BranchReportRow {
  branchId: string | null;
  branchName: string;
  contacted: number;
  notContacted: number;
  rejected: number;
  sales: number;
  conversionRate: number;
}

export interface FinancierReportRow {
  /** Financier name from interactions.financing; null/empty grouped as "Sin financiera". */
  name: string;
  sales: number;
}

/** Minimal user shape needed to map interactions → branch. */
interface ReportUser {
  id: string;
  full_name: string | null;
  branch_id: string | null;
}

interface ReportsState {
  vendors: VendorReportRow[];
  branches: BranchReportRow[];
  financiers: FinancierReportRow[];
  loading: boolean;
  error: string | null;

  /**
   * Fetch interactions and aggregate them. Branch attribution is derived from
   * each interaction's salesperson (`profiles.branch_id`) — NOT from
   * `client_assignments.branch_id`, because an interaction may have no
   * assignment and assignment.branch_id is nullable. The vendor's current
   * branch is the source of truth for branch-level rollups.
   *
   * @param users   user list (id, full_name, branch_id) — typically from useUsersStore.
   * @param branchNames  map of branch_id → branch display name.
   */
  fetchReports: (
    users: ReportUser[],
    branchNames: Record<string, string>
  ) => Promise<void>;
}

const NO_BRANCH_LABEL = 'Sin sucursal';
const NO_FINANCIER_LABEL = 'Sin financiera';
const UNKNOWN_VENDOR_LABEL = 'Desconocido';

const REJECT_RESULTS = ['not_interested', 'not_qualified'];

function conversion(sales: number, contacted: number): number {
  return contacted > 0 ? sales / contacted : 0;
}

export const useReportsStore = create<ReportsState>()((set) => ({
  vendors: [],
  branches: [],
  financiers: [],
  loading: false,
  error: null,

  fetchReports: async (users, branchNames) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('interactions')
      .select('user_id, contact_result, interest_result, financing');

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const interactions =
      (data as Pick<
        Interaction,
        'user_id' | 'contact_result' | 'interest_result' | 'financing'
      >[]) ?? [];

    // Index users by id for branch + name lookup.
    const userById = new Map<string, ReportUser>();
    for (const u of users) userById.set(u.id, u);

    // --- Per vendor ---------------------------------------------------------
    const vendorMap = new Map<string, VendorReportRow>();

    for (const it of interactions) {
      const user = userById.get(it.user_id);
      const branchId = user?.branch_id ?? null;
      const branchName = branchId
        ? (branchNames[branchId] ?? NO_BRANCH_LABEL)
        : NO_BRANCH_LABEL;

      let row = vendorMap.get(it.user_id);
      if (!row) {
        row = {
          userId: it.user_id,
          name: user?.full_name ?? UNKNOWN_VENDOR_LABEL,
          branchId,
          branchName,
          contacted: 0,
          notContacted: 0,
          rejected: 0,
          sales: 0,
          conversionRate: 0,
        };
        vendorMap.set(it.user_id, row);
      }

      if (it.contact_result === 'contacted') row.contacted += 1;
      else row.notContacted += 1;

      if (it.interest_result && REJECT_RESULTS.includes(it.interest_result)) {
        row.rejected += 1;
      }
      if (it.interest_result === 'sale') row.sales += 1;
    }

    const vendors = Array.from(vendorMap.values())
      .map((v) => ({ ...v, conversionRate: conversion(v.sales, v.contacted) }))
      .sort((a, b) => b.sales - a.sales || b.contacted - a.contacted);

    // --- Per branch (rollup of vendors) ------------------------------------
    const branchMap = new Map<string, BranchReportRow>();

    for (const v of vendors) {
      const key = v.branchId ?? '__none__';
      let row = branchMap.get(key);
      if (!row) {
        row = {
          branchId: v.branchId,
          branchName: v.branchName,
          contacted: 0,
          notContacted: 0,
          rejected: 0,
          sales: 0,
          conversionRate: 0,
        };
        branchMap.set(key, row);
      }
      row.contacted += v.contacted;
      row.notContacted += v.notContacted;
      row.rejected += v.rejected;
      row.sales += v.sales;
    }

    const branches = Array.from(branchMap.values())
      .map((b) => ({ ...b, conversionRate: conversion(b.sales, b.contacted) }))
      .sort((a, b) => b.sales - a.sales || b.contacted - a.contacted);

    // --- Per financier (sales only) ----------------------------------------
    const financierMap = new Map<string, number>();

    for (const it of interactions) {
      if (it.interest_result !== 'sale') continue;
      const name = it.financing?.trim() || NO_FINANCIER_LABEL;
      financierMap.set(name, (financierMap.get(name) ?? 0) + 1);
    }

    const financiers: FinancierReportRow[] = Array.from(financierMap.entries())
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales);

    set({ vendors, branches, financiers, loading: false });
  },
}));
