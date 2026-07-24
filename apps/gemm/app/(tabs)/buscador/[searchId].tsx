import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useLeadFinderStore } from '@/stores/leadFinderStore';
import { useProspectsStore } from '@/stores/prospectsStore';
import { showAlert } from '@/lib/dialog';
import {
  colors, fontSize, fontWeight, spacing, borderRadius, shadows,
} from '@/constants/theme';
import { PRODUCT_LABELS, type ProspectProduct } from '@/types';
import type { LeadPlace, LeadSearch, PlaceSortKey } from '@/types/leadFinder';

const EMPTY_PLACES: LeadPlace[] = [];

const PRODUCTS: ProspectProduct[] = ['crm', 'miturno', 'qrtify'];

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const bg =
    score >= 70 ? colors.successLight :
    score >= 40 ? colors.warningLight :
    colors.errorLight;
  const text =
    score >= 70 ? colors.success :
    score >= 40 ? colors.warning :
    colors.error;
  return (
    <View style={[styles.scoreBadge, { backgroundColor: bg }]}>
      <Text style={[styles.scoreText, { color: text }]}>{score}</Text>
    </View>
  );
}

// ── Place card ────────────────────────────────────────────────────────────────

function PlaceCard({
  place,
  onImport,
  importing,
}: {
  place: LeadPlace;
  onImport: (id: string, product: ProspectProduct) => void;
  importing: boolean;
}) {
  const isImported = !!place.prospect_id;
  const isAnalyzed = !!place.ai_analysis;
  const score = place.ai_analysis?.salesOpportunityScore ?? null;

  const aiProduct = place.ai_analysis?.recommendedProduct;
  const validProducts: ProspectProduct[] = ['crm', 'miturno', 'qrtify'];
  const defaultProduct: ProspectProduct =
    aiProduct && validProducts.includes(aiProduct as ProspectProduct)
      ? (aiProduct as ProspectProduct)
      : 'crm';

  const [selectedProduct, setSelectedProduct] = useState<ProspectProduct>(defaultProduct);

  function openLink(url: string | null) {
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(href).catch(() => {});
  }

  const router = useRouter();

  function openWhatsApp(phone: string | null) {
    if (!phone) return;
    const clean = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    router.push(
      `/(tabs)/whatsapp/compose?phone=${clean}&name=${encodeURIComponent(place.name)}&prospectId=${place.prospect_id ?? ''}` as any
    );
  }

  return (
    <View style={styles.placeCard}>
      {/* Header */}
      <View style={styles.placeHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.placeName} numberOfLines={2}>{place.name}</Text>
          {place.category && (
            <Text style={styles.placeCategory} numberOfLines={1}>{place.category}</Text>
          )}
        </View>
        {score !== null && <ScoreBadge score={score} />}
      </View>

      {/* Rating row */}
      {(place.rating || place.review_count) && (
        <View style={styles.ratingRow}>
          {place.rating && (
            <>
              <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </>
          )}
          {place.review_count && (
            <Text style={styles.reviewCount}>({place.review_count} reseñas)</Text>
          )}
        </View>
      )}

      {/* Address */}
      {place.address && (
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={2}>{place.address}</Text>
        </View>
      )}

      {/* Phone + Website */}
      <View style={styles.contactRow}>
        {place.phone && (
          <Pressable
            style={[styles.contactBtn, styles.contactBtnWa]}
            onPress={() => openWhatsApp(place.phone)}
          >
            <MaterialCommunityIcons name="whatsapp" size={14} color="#25D366" />
            <Text style={[styles.contactBtnText, { color: '#25D366' }]} numberOfLines={1}>{place.phone}</Text>
          </Pressable>
        )}
        {place.website && (
          <Pressable
            style={styles.contactBtn}
            onPress={() => openLink(place.website)}
          >
            <MaterialCommunityIcons name="web" size={14} color={colors.primary} />
            <Text style={styles.contactBtnText} numberOfLines={1}>Web</Text>
          </Pressable>
        )}
      </View>

      {/* AI Analysis */}
      {!isAnalyzed ? (
        <View style={styles.analyzingRow}>
          <ActivityIndicator size={12} color={colors.textDisabled} />
          <Text style={styles.analyzingText}>Analizando con IA…</Text>
        </View>
      ) : place.ai_analysis ? (
        <View style={styles.aiSection}>
          <Text style={styles.aiSummary}>{place.ai_analysis.summary}</Text>
          {place.ai_analysis.painPoints.length > 0 && (
            <View style={styles.tagsRow}>
              {place.ai_analysis.painPoints.slice(0, 2).map((pt, i) => (
                <View key={i} style={styles.painTag}>
                  <Text style={styles.painTagText} numberOfLines={1}>{pt}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.pitchBox}>
            <Text style={styles.pitchLabel}>Pitch sugerido</Text>
            <Text style={styles.pitchText}>{place.ai_analysis.recommendedPitch}</Text>
          </View>
        </View>
      ) : null}

      {/* Product selector + Import */}
      {isImported ? (
        <View style={styles.importedRow}>
          <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
          <Text style={styles.importedText}>En CRM</Text>
        </View>
      ) : (
        <View style={styles.importSection}>
          <View style={styles.productRow}>
            {PRODUCTS.map((p) => (
              <Pressable
                key={p}
                style={[styles.productChip, selectedProduct === p && styles.productChipActive]}
                onPress={() => setSelectedProduct(p)}
              >
                {selectedProduct === p && aiProduct === p && (
                  <MaterialCommunityIcons name="star" size={11} color={colors.primary} />
                )}
                <Text style={[styles.productChipText, selectedProduct === p && styles.productChipTextActive]}>
                  {PRODUCT_LABELS[p]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.importBtn, pressed && styles.importBtnPressed]}
            onPress={() => onImport(place.id, selectedProduct)}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size={16} color={colors.textOnPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="import" size={16} color={colors.textOnPrimary} />
                <Text style={styles.importBtnText}>Importar como {PRODUCT_LABELS[selectedProduct]}</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: PlaceSortKey; label: string }[] = [
  { key: 'score', label: 'Oportunidad' },
  { key: 'rating', label: 'Rating' },
  { key: 'reviews', label: 'Reviews' },
];

type ImportedFilter = 'all' | 'imported' | 'not_imported';
type WebsiteFilter = 'all' | 'has' | 'none';
type PhoneFilter = 'all' | 'has' | 'none';

export default function ResultsScreen() {
  const { searchId } = useLocalSearchParams<{ searchId: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const search = useLeadFinderStore((s) => s.searches.find((x) => x.id === searchId));
  const places = useLeadFinderStore((s) => s.placesBySearch[searchId] ?? EMPTY_PLACES);
  const fetchPlaces = useLeadFinderStore((s) => s.fetchPlaces);
  const fetchSearches = useLeadFinderStore((s) => s.fetchSearches);
  const updatePlaceFromRealtime = useLeadFinderStore((s) => s.updatePlaceFromRealtime);
  const updateSearchFromRealtime = useLeadFinderStore((s) => s.updateSearchFromRealtime);
  const importPlace = useLeadFinderStore((s) => s.importPlace);
  const fetchProspects = useProspectsStore((s) => s.fetchProspects);

  const [sortKey, setSortKey] = useState<PlaceSortKey>('score');
  const [importedFilter, setImportedFilter] = useState<ImportedFilter>('all');
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>('all');
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilter>('all');
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchId) return;
    fetchPlaces(searchId);
    if (!search) fetchSearches();
  }, [searchId]);

  // Realtime subscription
  useEffect(() => {
    if (!searchId) return;

    const placesChannel = supabase
      .channel(`lead_places:${searchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_places', filter: `search_id=eq.${searchId}` },
        (payload) => {
          if (payload.new) updatePlaceFromRealtime(payload.new as LeadPlace);
        },
      )
      .subscribe();

    const searchChannel = supabase
      .channel(`lead_searches:${searchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lead_searches', filter: `id=eq.${searchId}` },
        (payload) => {
          if (payload.new) updateSearchFromRealtime(payload.new as LeadSearch);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(placesChannel);
      supabase.removeChannel(searchChannel);
    };
  }, [searchId]);

  // Update header title with progress
  useEffect(() => {
    if (!search) return;
    const isRunning = search.status === 'running' || search.status === 'pending';
    navigation.setOptions({
      title: isRunning
        ? `Buscando… ${search.processed}/${search.total_found}`
        : `${search.query} — ${search.total_found} resultados`,
    });
  }, [search]);

  async function handleImport(placeId: string, product: ProspectProduct) {
    setImportingId(placeId);
    try {
      const prospectId = await importPlace(placeId, product);
      await fetchPlaces(searchId);
      fetchProspects();
      if (!prospectId) {
        showAlert('Error', 'No se pudo importar el negocio. Intentá de nuevo.');
      }
    } catch {
      showAlert('Error', 'No se pudo importar el negocio. Intentá de nuevo.');
    } finally {
      setImportingId(null);
    }
  }

  const filteredSorted = useMemo(() => {
    let result = [...places];

    if (importedFilter === 'imported') result = result.filter((p) => !!p.prospect_id);
    if (importedFilter === 'not_imported') result = result.filter((p) => !p.prospect_id);
    if (websiteFilter === 'has') result = result.filter((p) => !!p.website);
    if (websiteFilter === 'none') result = result.filter((p) => !p.website);
    if (phoneFilter === 'has') result = result.filter((p) => !!p.phone);
    if (phoneFilter === 'none') result = result.filter((p) => !p.phone);

    result.sort((a, b) => {
      if (sortKey === 'score') {
        return (b.ai_analysis?.salesOpportunityScore ?? -1) - (a.ai_analysis?.salesOpportunityScore ?? -1);
      }
      if (sortKey === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortKey === 'reviews') return (b.review_count ?? 0) - (a.review_count ?? 0);
      return 0;
    });

    return result;
  }, [places, sortKey, importedFilter, websiteFilter, phoneFilter]);

  const isRunning = search?.status === 'running' || search?.status === 'pending';

  return (
    <View style={styles.root}>
      {/* Progress bar */}
      {isRunning && search && search.total_found > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((search.processed / search.total_found) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Analizando {search.processed} de {search.total_found}…
          </Text>
        </View>
      )}

      {/* Sort tabs */}
      <View style={styles.sortBar}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.sortTab, sortKey === opt.key && styles.sortTabActive]}
            onPress={() => setSortKey(opt.key)}
          >
            <Text style={[styles.sortTabText, sortKey === opt.key && styles.sortTabTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {/* Imported */}
        {(['all', 'imported', 'not_imported'] as ImportedFilter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, importedFilter === f && styles.filterChipActive]}
            onPress={() => setImportedFilter(f)}
          >
            <Text style={[styles.filterChipText, importedFilter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'Todos' : f === 'imported' ? 'Importados' : 'No importados'}
            </Text>
          </Pressable>
        ))}
        <View style={styles.filterDivider} />
        {/* Website */}
        {(['all', 'has', 'none'] as WebsiteFilter[]).map((f) => (
          <Pressable
            key={`web-${f}`}
            style={[styles.filterChip, websiteFilter === f && styles.filterChipActive]}
            onPress={() => setWebsiteFilter(f)}
          >
            <Text style={[styles.filterChipText, websiteFilter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'Web: todos' : f === 'has' ? 'Con web' : 'Sin web'}
            </Text>
          </Pressable>
        ))}
        <View style={styles.filterDivider} />
        {/* Phone */}
        {(['all', 'has', 'none'] as PhoneFilter[]).map((f) => (
          <Pressable
            key={`tel-${f}`}
            style={[styles.filterChip, phoneFilter === f && styles.filterChipActive]}
            onPress={() => setPhoneFilter(f)}
          >
            <Text style={[styles.filterChipText, phoneFilter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'Tel: todos' : f === 'has' ? 'Con tel' : 'Sin tel'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Results */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[4] }]}
      >
        {filteredSorted.length === 0 && !isRunning && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="store-off-outline" size={48} color={colors.textDisabled} />
            <Text style={styles.emptyText}>
              {places.length === 0
                ? 'Sin resultados para esta búsqueda.'
                : 'Sin resultados con los filtros actuales.'}
            </Text>
          </View>
        )}

        {filteredSorted.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            onImport={(id, product) => handleImport(id, product)}
            importing={importingId === place.id}
          />
        ))}

        {isRunning && places.length === 0 && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Buscando negocios en Google Maps…</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  progressContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    gap: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  sortBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortTab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  sortTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sortTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  sortTabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  filterScroll: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 48,
  },
  filterRow: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.primary },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing[1],
  },

  scroll: { flex: 1 },
  content: { padding: spacing[3], gap: spacing[3] },

  // Place card
  placeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
    ...shadows.subtle,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  placeName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  placeCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
  scoreText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  reviewCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  contactRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    maxWidth: 180,
  },
  contactBtnWa: {
    backgroundColor: '#25D36615',
  },
  contactBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },

  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  analyzingText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },

  aiSection: { gap: spacing[2] },
  aiSummary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tagsRow: { flexDirection: 'row', gap: spacing[1], flexWrap: 'wrap' },
  painTag: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warningLight,
    maxWidth: 200,
  },
  painTagText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  pitchBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[1],
  },
  pitchLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pitchText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },

  importSection: { gap: spacing[2] },
  productRow: { flexDirection: 'row', gap: spacing[2] },
  productChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  productChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  productChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  productChipTextActive: { color: colors.primary },
  importedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 48,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  importedText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  importBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  importBtnPressed: { opacity: 0.85 },
  importBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: spacing[3] },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },

  loadingState: { alignItems: 'center', paddingTop: 60, gap: spacing[4] },
  loadingText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
});
