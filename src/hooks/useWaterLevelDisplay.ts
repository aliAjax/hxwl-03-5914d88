import { useState, useMemo, useCallback } from "react";
import type { WaterLevelRecord, BoreholeWaterLevelRecords } from "../types";

const generateId = () => Math.random().toString(36).slice(2, 11);

const emptyWaterLevelForm: Omit<WaterLevelRecord, "id"> = {
  firstSeenLevel: "",
  stableLevel: "",
  observationTime: "",
  weatherRemark: "",
};

export function useWaterLevelDisplay(
  waterLevelRecords: BoreholeWaterLevelRecords,
  setWaterLevelRecords: React.Dispatch<React.SetStateAction<BoreholeWaterLevelRecords>>,
  selectedBorehole: string | null
) {
  const [waterLevelForm, setWaterLevelForm] = useState<Omit<WaterLevelRecord, "id">>(emptyWaterLevelForm);
  const [editingWaterLevelId, setEditingWaterLevelId] = useState<string | null>(null);
  const [waterLevelErrors, setWaterLevelErrors] = useState<Partial<Record<keyof WaterLevelRecord, string>>>({});
  const [waterLevelValidationMessage, setWaterLevelValidationMessage] = useState<string>("");

  const currentWaterLevelRecords = useMemo(() => {
    if (!selectedBorehole) return [];
    return waterLevelRecords[selectedBorehole] || [];
  }, [waterLevelRecords, selectedBorehole]);

  const sortedWaterLevelRecords = useMemo(() => {
    return [...currentWaterLevelRecords].sort((a, b) => {
      const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
      const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [currentWaterLevelRecords]);

  const latestWaterLevel = useMemo(() => {
    if (sortedWaterLevelRecords.length === 0) return null;
    return sortedWaterLevelRecords[0];
  }, [sortedWaterLevelRecords]);

  const latestStableWaterLevel = useMemo(() => {
    for (const record of sortedWaterLevelRecords) {
      if (record.stableLevel && record.stableLevel.trim()) {
        return record;
      }
    }
    return null;
  }, [sortedWaterLevelRecords]);

  const getLatestStableWaterLevel = useCallback(
    (boreholeId: string): string => {
      const records = waterLevelRecords[boreholeId] || [];
      const sorted = [...records].sort((a, b) => {
        const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
        const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
        return timeB - timeA;
      });
      for (const record of sorted) {
        if (record.stableLevel && record.stableLevel.trim()) {
          return record.stableLevel;
        }
      }
      return "";
    },
    [waterLevelRecords]
  );

  const getWaterLevelDisplayText = useCallback(
    (boreholeId: string): string => {
      const records = waterLevelRecords[boreholeId] || [];
      if (records.length === 0) return "未观测";
      const sorted = [...records].sort((a, b) => {
        const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
        const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
        return timeB - timeA;
      });
      for (const record of sorted) {
        if (record.stableLevel && record.stableLevel.trim()) {
          return record.stableLevel + "m";
        }
      }
      if (sorted[0].firstSeenLevel && sorted[0].firstSeenLevel.trim()) {
        return `初见${sorted[0].firstSeenLevel}m`;
      }
      return "未观测";
    },
    [waterLevelRecords]
  );

  const isMissingStableWaterLevel = useCallback(
    (boreholeId: string): boolean => {
      const bhWL = waterLevelRecords[boreholeId] || [];
      if (bhWL.length === 0) return true;
      return !bhWL.some((wl) => wl.stableLevel && wl.stableLevel.trim());
    },
    [waterLevelRecords]
  );

  const getLatestWaterLevelObservationText = useCallback(
    (boreholeId: string): string => {
      const records = waterLevelRecords[boreholeId] || [];
      if (records.length === 0) return "未观测";
      const [latest] = [...records].sort((a, b) => {
        const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
        const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
        return timeB - timeA;
      });
      if (!latest) return "未观测";
      if (latest.stableLevel && latest.stableLevel.trim()) {
        return `稳定${latest.stableLevel}m`;
      }
      if (latest.firstSeenLevel && latest.firstSeenLevel.trim()) {
        return `初见${latest.firstSeenLevel}m·待稳定`;
      }
      return "未观测";
    },
    [waterLevelRecords]
  );

  const validateWaterLevelForm = useCallback((): {
    valid: boolean;
    errors: Partial<Record<keyof WaterLevelRecord, string>>;
  } => {
    const errs: Partial<Record<keyof WaterLevelRecord, string>> = {};
    if (!waterLevelForm.firstSeenLevel.trim()) {
      errs.firstSeenLevel = "初见水位不能为空";
    } else if (isNaN(parseFloat(waterLevelForm.firstSeenLevel)) || parseFloat(waterLevelForm.firstSeenLevel) < 0) {
      errs.firstSeenLevel = "初见水位必须为非负数";
    }
    if (waterLevelForm.stableLevel.trim()) {
      if (isNaN(parseFloat(waterLevelForm.stableLevel)) || parseFloat(waterLevelForm.stableLevel) < 0) {
        errs.stableLevel = "稳定水位必须为非负数";
      }
    }
    if (!waterLevelForm.observationTime.trim()) {
      errs.observationTime = "观测时间不能为空";
    }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [waterLevelForm]);

  const handleWaterLevelInputChange = (field: keyof Omit<WaterLevelRecord, "id">, value: string) => {
    setWaterLevelForm((prev) => ({ ...prev, [field]: value }));
    if (waterLevelErrors[field]) setWaterLevelErrors((prev) => ({ ...prev, [field]: undefined }));
    if (waterLevelValidationMessage) setWaterLevelValidationMessage("");
  };

  const handleAddWaterLevelRecord = () => {
    setWaterLevelValidationMessage("");
    const { valid, errors: formErrors } = validateWaterLevelForm();
    setWaterLevelErrors(formErrors);
    if (!valid) return;
    if (!selectedBorehole) return;
    const newRecord: WaterLevelRecord = { ...waterLevelForm, id: generateId() };
    setWaterLevelRecords((prev) => ({
      ...prev,
      [selectedBorehole]: [...(prev[selectedBorehole] || []), newRecord],
    }));
    setWaterLevelForm(emptyWaterLevelForm);
    setWaterLevelErrors({});
    setWaterLevelValidationMessage("");
  };

  const handleUpdateWaterLevelRecord = () => {
    setWaterLevelValidationMessage("");
    const { valid, errors: formErrors } = validateWaterLevelForm();
    setWaterLevelErrors(formErrors);
    if (!valid || !editingWaterLevelId || !selectedBorehole) return;
    setWaterLevelRecords((prev) => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].map((r) =>
        r.id === editingWaterLevelId ? { ...waterLevelForm, id: editingWaterLevelId } : r
      ),
    }));
    setWaterLevelForm(emptyWaterLevelForm);
    setEditingWaterLevelId(null);
    setWaterLevelErrors({});
    setWaterLevelValidationMessage("");
  };

  const handleEditWaterLevelRecord = (record: WaterLevelRecord) => {
    setWaterLevelForm({
      firstSeenLevel: record.firstSeenLevel,
      stableLevel: record.stableLevel,
      observationTime: record.observationTime,
      weatherRemark: record.weatherRemark,
    });
    setEditingWaterLevelId(record.id);
    setWaterLevelErrors({});
    setWaterLevelValidationMessage("");
  };

  const handleDeleteWaterLevelRecord = (recordId: string) => {
    if (!selectedBorehole) return;
    setWaterLevelRecords((prev) => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].filter((r) => r.id !== recordId),
    }));
    if (editingWaterLevelId === recordId) {
      setWaterLevelForm(emptyWaterLevelForm);
      setEditingWaterLevelId(null);
    }
  };

  const handleCancelWaterLevelEdit = () => {
    setWaterLevelForm(emptyWaterLevelForm);
    setEditingWaterLevelId(null);
    setWaterLevelErrors({});
    setWaterLevelValidationMessage("");
  };

  const resetFormsOnBoreholeChange = () => {
    setWaterLevelForm(emptyWaterLevelForm);
    setEditingWaterLevelId(null);
    setWaterLevelErrors({});
    setWaterLevelValidationMessage("");
  };

  return {
    waterLevelForm,
    setWaterLevelForm,
    editingWaterLevelId,
    setEditingWaterLevelId,
    waterLevelErrors,
    setWaterLevelErrors,
    waterLevelValidationMessage,
    setWaterLevelValidationMessage,
    currentWaterLevelRecords,
    sortedWaterLevelRecords,
    latestWaterLevel,
    latestStableWaterLevel,
    getLatestStableWaterLevel,
    getWaterLevelDisplayText,
    isMissingStableWaterLevel,
    getLatestWaterLevelObservationText,
    validateWaterLevelForm,
    handleWaterLevelInputChange,
    handleAddWaterLevelRecord,
    handleUpdateWaterLevelRecord,
    handleEditWaterLevelRecord,
    handleDeleteWaterLevelRecord,
    handleCancelWaterLevelEdit,
    resetFormsOnBoreholeChange,
  };
}
