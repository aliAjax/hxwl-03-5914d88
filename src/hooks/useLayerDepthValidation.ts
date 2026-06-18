import { useState, useMemo, useCallback } from "react";
import type { StratumLayer, BoreholeLayers } from "../types";

const emptyLayerForm: Omit<StratumLayer, "id"> = {
  startDepth: "",
  endDepth: "",
  lithology: "",
  soilColor: "",
  density: "",
  description: "",
};

const generateId = () => Math.random().toString(36).slice(2, 11);

export function useLayerDepthValidation(
  boreholeLayers: BoreholeLayers,
  setBoreholeLayers: React.Dispatch<React.SetStateAction<BoreholeLayers>>,
  selectedBorehole: string | null,
  holeDepth: number,
  isCheckMode: boolean,
  currentRole: string
) {
  const [layerForm, setLayerForm] = useState<Omit<StratumLayer, "id">>(emptyLayerForm);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerErrors, setLayerErrors] = useState<Partial<Record<keyof StratumLayer, string>>>({});
  const [layerValidationMessage, setLayerValidationMessage] = useState<string>("");
  const [gapMessage, setGapMessage] = useState<string>("");
  const [adjacentLayerHint, setAdjacentLayerHint] = useState<string>("");
  const [autoFilledStartDepth, setAutoFilledStartDepth] = useState<boolean>(false);

  const currentLayers = useMemo(() => {
    if (!selectedBorehole) return [];
    return boreholeLayers[selectedBorehole] || [];
  }, [boreholeLayers, selectedBorehole]);

  const sortedLayers = useMemo(() => {
    return [...currentLayers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
  }, [currentLayers]);

  const findLayerByDepth = useCallback(
    (depth: number): StratumLayer | null => {
      for (const layer of sortedLayers) {
        const start = parseFloat(layer.startDepth);
        const end = parseFloat(layer.endDepth);
        if (depth >= start && depth <= end) {
          return layer;
        }
      }
      return null;
    },
    [sortedLayers]
  );

  const getLayerLithology = useCallback(
    (layerId: string): string => {
      const layer = sortedLayers.find((l) => l.id === layerId);
      return layer ? layer.lithology : "-";
    },
    [sortedLayers]
  );

  const validateLayerForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof StratumLayer, string>> } => {
    const errs: Partial<Record<keyof StratumLayer, string>> = {};
    if (!layerForm.startDepth.trim()) {
      errs.startDepth = "起始深度不能为空";
    } else if (isNaN(parseFloat(layerForm.startDepth)) || parseFloat(layerForm.startDepth) < 0) {
      errs.startDepth = "起始深度必须为非负数";
    }
    if (!layerForm.endDepth.trim()) {
      errs.endDepth = "终止深度不能为空";
    } else if (isNaN(parseFloat(layerForm.endDepth)) || parseFloat(layerForm.endDepth) < 0) {
      errs.endDepth = "终止深度必须为非负数";
    }
    if (!layerForm.lithology.trim()) {
      errs.lithology = "岩性不能为空";
    }
    if (!layerForm.soilColor.trim()) {
      errs.soilColor = "土色不能为空";
    }
    if (!layerForm.density.trim()) {
      errs.density = "密实度/状态不能为空";
    }
    const start = parseFloat(layerForm.startDepth);
    const end = parseFloat(layerForm.endDepth);
    if (!isNaN(start) && !isNaN(end) && start >= end) {
      errs.endDepth = "终止深度必须大于起始深度";
    }
    if (!isNaN(end) && holeDepth > 0 && end > holeDepth) {
      errs.endDepth = `终止深度不能超过钻孔深度(${holeDepth}m)`;
    }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [layerForm, holeDepth]);

  const checkOverlapAndGaps = useCallback(() => {
    const layers = [...currentLayers];
    if (editingLayerId) {
      const idx = layers.findIndex((l) => l.id === editingLayerId);
      if (idx !== -1) layers.splice(idx, 1);
    }
    const start = parseFloat(layerForm.startDepth);
    const end = parseFloat(layerForm.endDepth);
    if (isNaN(start) || isNaN(end)) return { hasOverlap: false, gaps: [] as string[] };
    let hasOverlap = false;
    for (const layer of layers) {
      const ls = parseFloat(layer.startDepth);
      const le = parseFloat(layer.endDepth);
      if (start < le && end > ls) {
        hasOverlap = true;
        break;
      }
    }
    const allLayers = [...layers, { ...layerForm, id: "temp" } as StratumLayer].sort(
      (a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth)
    );
    const gaps: string[] = [];
    let prevEnd = 0;
    for (const layer of allLayers) {
      const ls = parseFloat(layer.startDepth);
      if (ls > prevEnd + 0.001) {
        gaps.push(`${prevEnd.toFixed(2)}m ~ ${ls.toFixed(2)}m`);
      }
      prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
    }
    if (holeDepth > 0 && prevEnd < holeDepth - 0.001) {
      gaps.push(`${prevEnd.toFixed(2)}m ~ ${holeDepth.toFixed(2)}m`);
    }
    return { hasOverlap, gaps };
  }, [currentLayers, editingLayerId, layerForm, holeDepth]);

  const getAdjacentLayers = useCallback(
    (
      layerId: string | null,
      startDepth: string,
      endDepth: string
    ): { prevLayer: StratumLayer | null; nextLayer: StratumLayer | null } => {
      const sorted = sortedLayers;
      if (layerId) {
        const currentIndex = sorted.findIndex((layer) => layer.id === layerId);
        if (currentIndex !== -1) {
          return {
            prevLayer: currentIndex > 0 ? sorted[currentIndex - 1] : null,
            nextLayer: currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null,
          };
        }
      }
      const start = parseFloat(startDepth);
      const end = parseFloat(endDepth);
      let prevLayer: StratumLayer | null = null;
      let nextLayer: StratumLayer | null = null;
      for (const layer of sorted) {
        if (layerId && layer.id === layerId) continue;
        const ls = parseFloat(layer.startDepth);
        const le = parseFloat(layer.endDepth);
        if (le <= start + 0.001) {
          if (!prevLayer || ls > parseFloat(prevLayer.startDepth)) {
            prevLayer = layer;
          }
        }
        if (ls >= end - 0.001) {
          if (!nextLayer || ls < parseFloat(nextLayer.startDepth)) {
            nextLayer = layer;
          }
        }
      }
      return { prevLayer, nextLayer };
    },
    [sortedLayers]
  );

  const checkAdjacentLayerImpact = useCallback(
    (formSnapshot: Omit<StratumLayer, "id"> = layerForm) => {
      const { prevLayer, nextLayer } = getAdjacentLayers(
        editingLayerId,
        formSnapshot.startDepth,
        formSnapshot.endDepth
      );
      const start = parseFloat(formSnapshot.startDepth);
      const end = parseFloat(formSnapshot.endDepth);
      const hints: string[] = [];
      if (isNaN(start) || isNaN(end)) {
        setAdjacentLayerHint("");
        return;
      }
      if (!editingLayerId) {
        if (prevLayer) {
          const prevEnd = parseFloat(prevLayer.endDepth);
          if (Math.abs(prevEnd - start) < 0.001) {
            hints.push(`✅ 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）完美接续`);
          } else if (start < prevEnd - 0.001) {
            hints.push(
              `⚠️ 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）重叠 ${(prevEnd - start).toFixed(2)}m`
            );
          } else {
            hints.push(
              `💡 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）存在 ${(start - prevEnd).toFixed(2)}m 间隙`
            );
          }
        } else if (Math.abs(start) < 0.001) {
          hints.push(`✅ 起始于地表 0m，接续正确`);
        } else if (start > 0) {
          hints.push(`💡 与地表存在 ${start.toFixed(2)}m 间隙`);
        }
      } else {
        if (prevLayer) {
          const prevEnd = parseFloat(prevLayer.endDepth);
          if (Math.abs(prevEnd - start) > 0.001) {
            if (start < prevEnd - 0.001) {
              hints.push(
                `⚠️ 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）重叠 ${(prevEnd - start).toFixed(2)}m`
              );
            } else {
              hints.push(
                `💡 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）存在 ${(start - prevEnd).toFixed(2)}m 间隙`
              );
            }
          } else {
            hints.push(`✅ 与上一层（${prevLayer.lithology}）完美接续`);
          }
        } else if (Math.abs(start) < 0.001) {
          hints.push(`✅ 起始于地表 0m，接续正确`);
        } else if (start > 0) {
          hints.push(`💡 与地表存在 ${start.toFixed(2)}m 间隙`);
        }
        if (nextLayer) {
          const nextStart = parseFloat(nextLayer.startDepth);
          if (Math.abs(nextStart - end) > 0.001) {
            if (end > nextStart + 0.001) {
              hints.push(
                `⚠️ 与下一层（${nextLayer.lithology} ${nextLayer.startDepth}~${nextLayer.endDepth}m）重叠 ${(end - nextStart).toFixed(2)}m`
              );
            } else {
              hints.push(
                `💡 与下一层（${nextLayer.lithology} ${nextLayer.startDepth}~${nextLayer.endDepth}m）存在 ${(nextStart - end).toFixed(2)}m 间隙`
              );
            }
          } else {
            hints.push(`✅ 与下一层（${nextLayer.lithology}）完美接续`);
          }
        }
      }
      setAdjacentLayerHint(hints.join("；"));
    },
    [editingLayerId, layerForm, getAdjacentLayers]
  );

  const checkDepthInLayers = useCallback(
    (depth: number): { valid: boolean; message: string; layer: StratumLayer | null } => {
      if (sortedLayers.length === 0) {
        return { valid: false, message: "当前钻孔暂无地层分层数据，请先添加分层", layer: null };
      }
      const layer = findLayerByDepth(depth);
      if (!layer) {
        const minDepth = parseFloat(sortedLayers[0].startDepth);
        const maxDepth = parseFloat(sortedLayers[sortedLayers.length - 1].endDepth);
        if (depth < minDepth) {
          return {
            valid: false,
            message: `深度 ${depth}m 位于地层之上（最浅分层起始于 ${minDepth}m），请检查深度`,
            layer: null,
          };
        } else if (depth > maxDepth) {
          return {
            valid: false,
            message: `深度 ${depth}m 超出最深分层（最深分层终止于 ${maxDepth}m），请检查深度`,
            layer: null,
          };
        } else {
          return { valid: false, message: `深度 ${depth}m 落在分层缺口处，请先补全该深度范围的分层`, layer: null };
        }
      }
      return { valid: true, message: "", layer };
    },
    [sortedLayers, findLayerByDepth]
  );

  const hasLayerGap = useCallback(
    (boreholeId: string, records: { "钻孔编号": string; "孔深": string }[]): boolean => {
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
    },
    [boreholeLayers]
  );

  const handleLayerInputChange = (field: keyof Omit<StratumLayer, "id">, value: string) => {
    const nextForm = { ...layerForm, [field]: value };
    setLayerForm(nextForm);
    if (layerErrors[field]) setLayerErrors((prev) => ({ ...prev, [field]: undefined }));
    if (layerValidationMessage) setLayerValidationMessage("");
    if (field === "startDepth" || field === "endDepth") {
      if (field === "startDepth") setAutoFilledStartDepth(false);
      checkAdjacentLayerImpact(nextForm);
    }
  };

  const prepareNewLayerForm = useCallback(
    (boreholeId?: string) => {
      const targetId = boreholeId || selectedBorehole;
      const layers = targetId ? boreholeLayers[targetId] || [] : [];
      const sorted = [...layers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
      if (sorted.length > 0) {
        const lastLayer = sorted[sorted.length - 1];
        setLayerForm({
          ...emptyLayerForm,
          startDepth: lastLayer.endDepth,
        });
        setAutoFilledStartDepth(true);
      } else {
        setLayerForm({ ...emptyLayerForm, startDepth: "0" });
        setAutoFilledStartDepth(true);
      }
      setLayerErrors({});
      setLayerValidationMessage("");
      setAdjacentLayerHint("");
    },
    [selectedBorehole, boreholeLayers]
  );

  const handleAddLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);
    if (!valid) return;
    const { hasOverlap } = checkOverlapAndGaps();
    if (hasOverlap) {
      setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围");
      return;
    }
    if (!selectedBorehole) return;
    const newLayer: StratumLayer = { ...layerForm, id: generateId() };
    setBoreholeLayers((prev) => {
      const updated = { ...prev, [selectedBorehole]: [...(prev[selectedBorehole] || []), newLayer] };
      setTimeout(() => {
        prepareNewLayerForm(selectedBorehole);
      }, 0);
      return updated;
    });
  };

  const handleUpdateLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);
    if (!valid || !editingLayerId || !selectedBorehole) return;
    const { hasOverlap } = checkOverlapAndGaps();
    if (hasOverlap) {
      setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围");
      return;
    }
    setBoreholeLayers((prev) => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].map((l) => {
        if (l.id !== editingLayerId) return l;
        if (isCheckMode) {
          return {
            ...l,
            description: layerForm.description,
            isChecked: true,
            checkedBy: currentRole,
            checkedAt: new Date().toISOString(),
            checkRemark: layerForm.description,
          };
        }
        return { ...l, ...layerForm, id: editingLayerId };
      }),
    }));
    setLayerForm(emptyLayerForm);
    setEditingLayerId(null);
    setLayerErrors({});
    setLayerValidationMessage("");
    setAdjacentLayerHint("");
    setAutoFilledStartDepth(false);
  };

  const handleEditLayer = (layer: StratumLayer) => {
    setLayerForm({
      startDepth: layer.startDepth,
      endDepth: layer.endDepth,
      lithology: layer.lithology,
      soilColor: layer.soilColor,
      density: layer.density,
      description: layer.description,
      isChecked: layer.isChecked,
      checkedBy: layer.checkedBy,
      checkedAt: layer.checkedAt,
      checkRemark: layer.checkRemark,
    });
    setEditingLayerId(layer.id);
    setLayerErrors({});
    setLayerValidationMessage("");
    setAdjacentLayerHint("");
    setAutoFilledStartDepth(false);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!selectedBorehole) return;
    setBoreholeLayers((prev) => {
      const updated = {
        ...prev,
        [selectedBorehole]: prev[selectedBorehole].filter((l) => l.id !== layerId),
      };
      if (editingLayerId === layerId) {
        setTimeout(() => {
          prepareNewLayerForm(selectedBorehole);
        }, 0);
      }
      return updated;
    });
    if (editingLayerId === layerId) {
      setEditingLayerId(null);
      setAdjacentLayerHint("");
      setAutoFilledStartDepth(false);
    } else if (!editingLayerId) {
      setTimeout(() => {
        prepareNewLayerForm(selectedBorehole);
      }, 0);
    }
  };

  const handleCancelEdit = () => {
    setEditingLayerId(null);
    setLayerErrors({});
    setLayerValidationMessage("");
    setAdjacentLayerHint("");
    setTimeout(() => {
      prepareNewLayerForm();
    }, 0);
  };

  const handleUpdateLayerCheck = useCallback(
    (boreholeId: string, layerId: string, checkRemark: string) => {
      setBoreholeLayers((prev) => ({
        ...prev,
        [boreholeId]: (prev[boreholeId] || []).map((l) => {
          if (l.id !== layerId) return l;
          return {
            ...l,
            isChecked: true,
            checkedBy: currentRole,
            checkedAt: new Date().toISOString(),
            checkRemark: checkRemark,
            description: l.description || checkRemark,
          };
        }),
      }));
    },
    [setBoreholeLayers, currentRole]
  );

  return {
    layerForm,
    setLayerForm,
    editingLayerId,
    setEditingLayerId,
    layerErrors,
    setLayerErrors,
    layerValidationMessage,
    setLayerValidationMessage,
    gapMessage,
    setGapMessage,
    adjacentLayerHint,
    autoFilledStartDepth,
    setAutoFilledStartDepth,
    currentLayers,
    sortedLayers,
    findLayerByDepth,
    getLayerLithology,
    validateLayerForm,
    checkOverlapAndGaps,
    checkDepthInLayers,
    hasLayerGap,
    handleLayerInputChange,
    prepareNewLayerForm,
    handleAddLayer,
    handleUpdateLayer,
    handleEditLayer,
    handleDeleteLayer,
    handleCancelEdit,
    checkAdjacentLayerImpact,
    handleUpdateLayerCheck,
  };
}
