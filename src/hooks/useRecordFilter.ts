import { useState, useMemo, useCallback } from "react";
import type { DrillingRecord, BoreholeLayers, BoreholeSPTRecords, BoreholeWaterLevelRecords } from "../types";

export interface FilterState {
  lithology: string | null;
  hasGap: boolean | null;
  hasAbnormalSPT: boolean | null;
  missingStableWaterLevel: boolean | null;
}

const initialFilters: FilterState = {
  lithology: null,
  hasGap: null,
  hasAbnormalSPT: null,
  missingStableWaterLevel: null,
};

interface UseRecordFilterParams {
  records: DrillingRecord[];
  boreholeLayers: BoreholeLayers;
  sptRecords: BoreholeSPTRecords;
  waterLevelRecords: BoreholeWaterLevelRecords;
}

export function useRecordFilter({
  records,
  boreholeLayers,
  sptRecords,
  waterLevelRecords,
}: UseRecordFilterParams) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const hasLayerGap = useCallback((boreholeId: string): boolean => {
    const layers = boreholeLayers[boreholeId] || [];
    if (layers.length === 0) return false;
    const record = records.find((r) => r["钻孔编号"] === boreholeId);
    if (!record) return false;
    const holeDepth = parseFloat(record["孔深"]) || 0;
    if (holeDepth === 0) return false;
    const sorted = [...layers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
    let prevEnd = 0;
    for (const layer of sorted) {
      const ls = parseFloat(layer.startDepth);
      if (ls > prevEnd + 0.001) return true;
      prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
    }
    if (prevEnd < holeDepth - 0.001) return true;
    return false;
  }, [boreholeLayers, records]);

  const hasAbnormalSPT = useCallback((boreholeId: string): boolean => {
    const bhSPT = sptRecords[boreholeId] || [];
    return bhSPT.some((spt) => spt.isAbnormal);
  }, [sptRecords]);

  const isMissingStableWaterLevel = useCallback((boreholeId: string): boolean => {
    const bhWL = waterLevelRecords[boreholeId] || [];
    if (bhWL.length === 0) return true;
    return !bhWL.some((wl) => wl.stableLevel && wl.stableLevel.trim());
  }, [waterLevelRecords]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.lithology !== null ||
      filters.hasGap !== null ||
      filters.hasAbnormalSPT !== null ||
      filters.missingStableWaterLevel !== null
    );
  }, [filters]);

  const filteredRecords = useMemo(() => {
    if (!hasActiveFilters) return records;
    return records.filter((r) => {
      const boreholeId = r["钻孔编号"];
      if (filters.lithology !== null && r["岩性分类"] !== filters.lithology) {
        return false;
      }
      if (filters.hasGap !== null) {
        const hasGap = hasLayerGap(boreholeId);
        if (filters.hasGap !== hasGap) return false;
      }
      if (filters.hasAbnormalSPT !== null) {
        const hasAbnormal = hasAbnormalSPT(boreholeId);
        if (filters.hasAbnormalSPT !== hasAbnormal) return false;
      }
      if (filters.missingStableWaterLevel !== null) {
        const missing = isMissingStableWaterLevel(boreholeId);
        if (filters.missingStableWaterLevel !== missing) return false;
      }
      return true;
    });
  }, [records, filters, hasActiveFilters, hasAbnormalSPT, hasLayerGap, isMissingStableWaterLevel]);

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return {
    filters,
    setFilters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    filteredRecords,
    hasLayerGap,
    hasAbnormalSPT,
    isMissingStableWaterLevel,
  };
}
