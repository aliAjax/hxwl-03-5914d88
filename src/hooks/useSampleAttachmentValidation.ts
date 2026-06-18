import { useState, useMemo, useCallback } from "react";
import type {
  SPTRecord,
  BoreholeSPTRecords,
  SamplingRecord,
  BoreholeSamplingRecords,
  StratumLayer,
} from "../types";

const generateId = () => Math.random().toString(36).slice(2, 11);

const emptySPTForm: Omit<SPTRecord, "id" | "layerId"> = {
  depth: "",
  blowCount: "",
  isAbnormal: false,
  remark: "",
};

const emptySamplingForm: Omit<SamplingRecord, "id" | "layerId"> = {
  depth: "",
  sampleType: "",
  sampleNumber: "",
  remark: "",
};

interface CheckDepthResult {
  valid: boolean;
  message: string;
  layer: StratumLayer | null;
}

export function useSampleAttachmentValidation(
  sptRecords: BoreholeSPTRecords,
  setSPTRecords: React.Dispatch<React.SetStateAction<BoreholeSPTRecords>>,
  samplingRecords: BoreholeSamplingRecords,
  setSamplingRecords: React.Dispatch<React.SetStateAction<BoreholeSamplingRecords>>,
  selectedBorehole: string | null,
  isCheckMode: boolean,
  currentRole: string,
  checkDepthInLayers: (depth: number) => CheckDepthResult,
  sortedLayers: StratumLayer[]
) {
  const [sptForm, setSPTForm] = useState<Omit<SPTRecord, "id" | "layerId">>(emptySPTForm);
  const [editingSPTId, setEditingSPTId] = useState<string | null>(null);
  const [sptErrors, setSPTErrors] = useState<Partial<Record<keyof SPTRecord, string>>>({});
  const [sptValidationMessage, setSPTValidationMessage] = useState<string>("");

  const [samplingForm, setSamplingForm] = useState<Omit<SamplingRecord, "id" | "layerId">>(emptySamplingForm);
  const [editingSamplingId, setEditingSamplingId] = useState<string | null>(null);
  const [samplingErrors, setSamplingErrors] = useState<Partial<Record<keyof SamplingRecord, string>>>({});
  const [samplingValidationMessage, setSamplingValidationMessage] = useState<string>("");

  const currentSPTRecords = useMemo(() => {
    if (!selectedBorehole) return [];
    return sptRecords[selectedBorehole] || [];
  }, [sptRecords, selectedBorehole]);

  const sortedSPTRecords = useMemo(() => {
    return [...currentSPTRecords].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [currentSPTRecords]);

  const currentSamplingRecords = useMemo(() => {
    if (!selectedBorehole) return [];
    return samplingRecords[selectedBorehole] || [];
  }, [samplingRecords, selectedBorehole]);

  const sortedSamplingRecords = useMemo(() => {
    return [...currentSamplingRecords].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [currentSamplingRecords]);

  const sptStats = useMemo(() => {
    const recs = sortedSPTRecords;
    if (recs.length === 0) {
      return { maxBlow: 0, abnormalCount: 0, totalCount: 0, maxBlowLithology: "-" };
    }
    let maxBlow = 0;
    let maxBlowLayerId = "";
    let abnormalCount = 0;
    for (const record of recs) {
      const blow = parseFloat(record.blowCount);
      if (!isNaN(blow) && blow > maxBlow) {
        maxBlow = blow;
        maxBlowLayerId = record.layerId;
      }
      if (record.isAbnormal) abnormalCount++;
    }
    const maxBlowLayer = sortedLayers.find((l) => l.id === maxBlowLayerId);
    return {
      maxBlow,
      abnormalCount,
      totalCount: recs.length,
      maxBlowLithology: maxBlowLayer ? maxBlowLayer.lithology : "-",
    };
  }, [sortedSPTRecords, sortedLayers]);

  const samplingStats = useMemo(() => {
    const recs = sortedSamplingRecords;
    if (recs.length === 0) {
      return { totalCount: 0, typeBreakdown: {} as Record<string, number> };
    }
    const typeBreakdown: Record<string, number> = {};
    for (const r of recs) {
      typeBreakdown[r.sampleType] = (typeBreakdown[r.sampleType] || 0) + 1;
    }
    return { totalCount: recs.length, typeBreakdown };
  }, [sortedSamplingRecords]);

  const hasAbnormalSPT = useCallback(
    (boreholeId: string): boolean => {
      const bhSPT = sptRecords[boreholeId] || [];
      return bhSPT.some((spt) => spt.isAbnormal);
    },
    [sptRecords]
  );

  const getBoreholeMaxSPT = useCallback(
    (boreholeId: string): string => {
      const bhSPT = sptRecords[boreholeId] || [];
      if (bhSPT.length === 0) return "-";
      let max = 0;
      bhSPT.forEach((s) => {
        const b = parseFloat(s.blowCount);
        if (!isNaN(b) && b > max) max = b;
      });
      return String(max);
    },
    [sptRecords]
  );

  const validateSPTForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof SPTRecord, string>> } => {
    const errs: Partial<Record<keyof SPTRecord, string>> = {};
    if (!sptForm.depth.trim()) {
      errs.depth = "深度不能为空";
    } else if (isNaN(parseFloat(sptForm.depth)) || parseFloat(sptForm.depth) < 0) {
      errs.depth = "深度必须为非负数";
    }
    if (!sptForm.blowCount.trim()) {
      errs.blowCount = "击数不能为空";
    } else if (isNaN(parseFloat(sptForm.blowCount)) || parseFloat(sptForm.blowCount) < 0) {
      errs.blowCount = "击数必须为非负数";
    }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [sptForm]);

  const handleSPTInputChange = (field: keyof Omit<SPTRecord, "id" | "layerId">, value: string | boolean) => {
    setSPTForm((prev) => ({ ...prev, [field]: value }));
    if (sptErrors[field]) setSPTErrors((prev) => ({ ...prev, [field]: undefined }));
    if (sptValidationMessage) setSPTValidationMessage("");
  };

  const handleAddSPTRecord = () => {
    setSPTValidationMessage("");
    const { valid, errors: formErrors } = validateSPTForm();
    setSPTErrors(formErrors);
    if (!valid) return;
    const depth = parseFloat(sptForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) {
      setSPTValidationMessage(message);
      return;
    }
    if (!selectedBorehole || !layer) return;
    setSPTRecords((prev) => ({
      ...prev,
      [selectedBorehole]: [...(prev[selectedBorehole] || []), { ...sptForm, id: generateId(), layerId: layer.id }],
    }));
    setSPTForm(emptySPTForm);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const handleUpdateSPTRecord = () => {
    setSPTValidationMessage("");
    const { valid, errors: formErrors } = validateSPTForm();
    setSPTErrors(formErrors);
    if (!valid || !editingSPTId || !selectedBorehole) return;
    const depth = parseFloat(sptForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) {
      setSPTValidationMessage(message);
      return;
    }
    if (!layer) return;
    setSPTRecords((prev) => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].map((r) => {
        if (r.id !== editingSPTId) return r;
        if (isCheckMode) {
          return {
            ...r,
            isAbnormal: sptForm.isAbnormal,
            remark: sptForm.remark,
            isChecked: true,
            checkedBy: currentRole,
            checkedAt: new Date().toISOString(),
            checkRemark: sptForm.remark,
          };
        }
        return { ...r, ...sptForm, id: editingSPTId, layerId: layer.id };
      }),
    }));
    setSPTForm(emptySPTForm);
    setEditingSPTId(null);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const handleEditSPTRecord = (record: SPTRecord) => {
    setSPTForm({
      depth: record.depth,
      blowCount: record.blowCount,
      isAbnormal: record.isAbnormal,
      remark: record.remark,
      isChecked: record.isChecked,
      checkedBy: record.checkedBy,
      checkedAt: record.checkedAt,
      checkRemark: record.checkRemark,
    });
    setEditingSPTId(record.id);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const handleDeleteSPTRecord = (recordId: string) => {
    if (!selectedBorehole) return;
    setSPTRecords((prev) => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].filter((r) => r.id !== recordId),
    }));
    if (editingSPTId === recordId) {
      setSPTForm(emptySPTForm);
      setEditingSPTId(null);
    }
  };

  const handleCancelSPTEdit = () => {
    setSPTForm(emptySPTForm);
    setEditingSPTId(null);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const handleUpdateSPTCheck = useCallback(
    (boreholeId: string, sptId: string, isAbnormal: boolean, checkRemark: string) => {
      setSPTRecords((prev) => ({
        ...prev,
        [boreholeId]: (prev[boreholeId] || []).map((r) => {
          if (r.id !== sptId) return r;
          return {
            ...r,
            isAbnormal: isAbnormal,
            isChecked: true,
            checkedBy: currentRole,
            checkedAt: new Date().toISOString(),
            checkRemark: checkRemark,
            remark: r.remark || checkRemark,
          };
        }),
      }));
    },
    [setSPTRecords, currentRole]
  );

  const validateSamplingForm = useCallback((): {
    valid: boolean;
    errors: Partial<Record<keyof SamplingRecord, string>>;
  } => {
    const errs: Partial<Record<keyof SamplingRecord, string>> = {};
    if (!samplingForm.depth.trim()) {
      errs.depth = "深度不能为空";
    } else if (isNaN(parseFloat(samplingForm.depth)) || parseFloat(samplingForm.depth) < 0) {
      errs.depth = "深度必须为非负数";
    }
    if (!samplingForm.sampleType.trim()) {
      errs.sampleType = "取样类型不能为空";
    }
    if (!samplingForm.sampleNumber.trim()) {
      errs.sampleNumber = "样号不能为空";
    }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [samplingForm]);

  const handleSamplingInputChange = (field: keyof Omit<SamplingRecord, "id" | "layerId">, value: string) => {
    setSamplingForm((prev) => ({ ...prev, [field]: value }));
    if (samplingErrors[field]) setSamplingErrors((prev) => ({ ...prev, [field]: undefined }));
    if (samplingValidationMessage) setSamplingValidationMessage("");
  };

  const handleAddSamplingRecord = () => {
    setSamplingValidationMessage("");
    const { valid, errors: formErrors } = validateSamplingForm();
    setSamplingErrors(formErrors);
    if (!valid) return;
    const depth = parseFloat(samplingForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) {
      setSamplingValidationMessage(message);
      return;
    }
    if (!selectedBorehole || !layer) return;
    setSamplingRecords((prev) => ({
      ...prev,
      [selectedBorehole]: [
        ...(prev[selectedBorehole] || []),
        { ...samplingForm, id: generateId(), layerId: layer.id },
      ],
    }));
    setSamplingForm(emptySamplingForm);
    setSamplingErrors({});
    setSamplingValidationMessage("");
  };

  const handleUpdateSamplingRecord = () => {
    setSamplingValidationMessage("");
    const { valid, errors: formErrors } = validateSamplingForm();
    setSamplingErrors(formErrors);
    if (!valid || !editingSamplingId || !selectedBorehole) return;
    const depth = parseFloat(samplingForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) {
      setSamplingValidationMessage(message);
      return;
    }
    if (!layer) return;
    setSamplingRecords((prev) => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].map((r) =>
        r.id === editingSamplingId ? { ...samplingForm, id: editingSamplingId, layerId: layer.id } : r
      ),
    }));
    setSamplingForm(emptySamplingForm);
    setEditingSamplingId(null);
    setSamplingErrors({});
    setSamplingValidationMessage("");
  };

  const handleEditSamplingRecord = (record: SamplingRecord) => {
    setSamplingForm({
      depth: record.depth,
      sampleType: record.sampleType,
      sampleNumber: record.sampleNumber,
      remark: record.remark,
    });
    setEditingSamplingId(record.id);
    setSamplingErrors({});
    setSamplingValidationMessage("");
  };

  const handleDeleteSamplingRecord = (recordId: string) => {
    if (!selectedBorehole) return;
    setSamplingRecords((prev) => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].filter((r) => r.id !== recordId),
    }));
    if (editingSamplingId === recordId) {
      setSamplingForm(emptySamplingForm);
      setEditingSamplingId(null);
    }
  };

  const handleCancelSamplingEdit = () => {
    setSamplingForm(emptySamplingForm);
    setEditingSamplingId(null);
    setSamplingErrors({});
    setSamplingValidationMessage("");
  };

  const resetFormsOnBoreholeChange = () => {
    setSPTForm(emptySPTForm);
    setEditingSPTId(null);
    setSPTErrors({});
    setSPTValidationMessage("");
    setSamplingForm(emptySamplingForm);
    setEditingSamplingId(null);
    setSamplingErrors({});
    setSamplingValidationMessage("");
  };

  return {
    sptForm,
    setSPTForm,
    editingSPTId,
    setEditingSPTId,
    sptErrors,
    setSPTErrors,
    sptValidationMessage,
    setSPTValidationMessage,
    samplingForm,
    setSamplingForm,
    editingSamplingId,
    setEditingSamplingId,
    samplingErrors,
    setSamplingErrors,
    samplingValidationMessage,
    setSamplingValidationMessage,
    currentSPTRecords,
    sortedSPTRecords,
    currentSamplingRecords,
    sortedSamplingRecords,
    sptStats,
    samplingStats,
    hasAbnormalSPT,
    getBoreholeMaxSPT,
    validateSPTForm,
    validateSamplingForm,
    handleSPTInputChange,
    handleAddSPTRecord,
    handleUpdateSPTRecord,
    handleEditSPTRecord,
    handleDeleteSPTRecord,
    handleCancelSPTEdit,
    handleUpdateSPTCheck,
    handleSamplingInputChange,
    handleAddSamplingRecord,
    handleUpdateSamplingRecord,
    handleEditSamplingRecord,
    handleDeleteSamplingRecord,
    handleCancelSamplingEdit,
    resetFormsOnBoreholeChange,
  };
}
