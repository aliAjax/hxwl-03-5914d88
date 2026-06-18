import { useState, useMemo } from "react";
import type {
  DrillingRecord,
  BoreholeLayers,
  BoreholeSPTRecords,
  BoreholeSamplingRecords,
  BoreholeWaterLevelRecords,
  QualityIssue,
  QualityIssueCategory,
  QualityCheckStats,
  QUALITY_CATEGORY_LABELS,
  StratumLayer,
  SPTRecord,
  SamplingRecord,
  WaterLevelRecord,
} from "../types";
import { QUALITY_CATEGORY_LABELS as CATEGORY_LABELS } from "../types";

interface QualityCheckPanelProps {
  records: DrillingRecord[];
  boreholeLayers: BoreholeLayers;
  sptRecords: BoreholeSPTRecords;
  samplingRecords: BoreholeSamplingRecords;
  waterLevelRecords: BoreholeWaterLevelRecords;
  onNavigateToBorehole: (
    boreholeId: string,
    focusType?: "basicInfo" | "layer" | "spt" | "sampling" | "waterLevel",
    focusId?: string
  ) => void;
}

type SeverityFilter = "all" | "error" | "warning";
type CategoryFilter = QualityIssueCategory | "all";
type BoreholeFilter = string | "all";

const generateIssueId = () => Math.random().toString(36).slice(2, 15);

export default function QualityCheckPanel({
  records,
  boreholeLayers,
  sptRecords,
  samplingRecords,
  waterLevelRecords,
  onNavigateToBorehole,
}: QualityCheckPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [boreholeFilter, setBoreholeFilter] = useState<BoreholeFilter>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["error", "warning"]));

  const allIssues = useMemo<QualityIssue[]>(() => {
    const issues: QualityIssue[] = [];

    for (const record of records) {
      const boreholeId = record["钻孔编号"];
      const holeDepthStr = record["孔深"];
      const holeDepth = parseFloat(holeDepthStr) || 0;
      const layers = boreholeLayers[boreholeId] || [];
      const bhSPT = sptRecords[boreholeId] || [];
      const bhSampling = samplingRecords[boreholeId] || [];
      const bhWL = waterLevelRecords[boreholeId] || [];

      if (!boreholeId || !boreholeId.trim()) {
        issues.push({
          id: generateIssueId(),
          boreholeId: boreholeId || "(空)",
          category: "missingRequiredField",
          severity: "error",
          message: "钻孔编号为空",
          detail: "钻孔编号是必填字段，请补充",
          focusType: "basicInfo",
        });
      }

      if (!holeDepthStr || !holeDepthStr.trim()) {
        issues.push({
          id: generateIssueId(),
          boreholeId,
          category: "missingRequiredField",
          severity: "error",
          message: "孔深字段为空",
          detail: "钻孔深度是必填字段，请补充",
          focusType: "basicInfo",
        });
      } else if (isNaN(holeDepth) || holeDepth < 0) {
        issues.push({
          id: generateIssueId(),
          boreholeId,
          category: "holeDepth",
          severity: "error",
          message: `孔深值异常：${holeDepthStr}`,
          detail: "孔深必须为非负数",
          focusType: "basicInfo",
        });
      } else if (holeDepth === 0) {
        issues.push({
          id: generateIssueId(),
          boreholeId,
          category: "holeDepth",
          severity: "warning",
          message: "孔深为 0m",
          detail: "请确认孔深是否正确填写",
          focusType: "basicInfo",
        });
      }

      const requiredFields: Array<{ key: keyof DrillingRecord; label: string }> = [
        { key: "岩性分类", label: "岩性分类" },
        { key: "岩性描述", label: "岩性描述" },
        { key: "土色", label: "土色" },
      ];
      for (const { key, label } of requiredFields) {
        if (!record[key] || !String(record[key]).trim()) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "missingRequiredField",
            severity: "warning",
            message: `缺少关键字段：${label}`,
            detail: `钻孔 ${boreholeId} 的「${label}」字段为空`,
            focusType: "basicInfo",
          });
        }
      }

      const sortedLayers = [...layers].sort(
        (a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth)
      );

      if (layers.length === 0) {
        issues.push({
          id: generateIssueId(),
          boreholeId,
          category: "layerContinuity",
          severity: "error",
          message: "暂无任何分层数据",
          detail: `钻孔 ${boreholeId} 没有添加任何地层分层`,
          focusType: "layer",
        });
      } else {
        let prevEnd = 0;
        for (const layer of sortedLayers) {
          const ls = parseFloat(layer.startDepth);
          const le = parseFloat(layer.endDepth);

          if (isNaN(ls) || isNaN(le)) {
            issues.push({
              id: generateIssueId(),
              boreholeId,
              category: "missingRequiredField",
              severity: "error",
              message: `分层深度格式错误：${layer.startDepth} ~ ${layer.endDepth}`,
              detail: `分层 ${layer.lithology || "(未命名)"} 的深度值无效`,
              focusType: "layer",
              focusId: layer.id,
            });
            continue;
          }

          if (ls >= le) {
            issues.push({
              id: generateIssueId(),
              boreholeId,
              category: "layerContinuity",
              severity: "error",
              message: `分层起始深度 ≥ 终止深度：${ls} ~ ${le}`,
              detail: `分层 ${layer.lithology} 的起始深度必须小于终止深度`,
              focusType: "layer",
              focusId: layer.id,
            });
          }

          if (ls > prevEnd + 0.001) {
            issues.push({
              id: generateIssueId(),
              boreholeId,
              category: "layerContinuity",
              severity: "warning",
              message: `分层缺口：${prevEnd.toFixed(2)}m ~ ${ls.toFixed(2)}m`,
              detail: "该深度区间无地层数据覆盖",
              focusType: "layer",
            });
          }

          if (ls < prevEnd - 0.001) {
            issues.push({
              id: generateIssueId(),
              boreholeId,
              category: "layerOverlap",
              severity: "error",
              message: `分层重叠：与前一分层在 ${ls.toFixed(2)}m ~ ${prevEnd.toFixed(2)}m 重叠`,
              detail: `分层 ${layer.lithology} 与上一分层存在重叠`,
              focusType: "layer",
              focusId: layer.id,
            });
          }

          if (!layer.lithology || !layer.lithology.trim()) {
            issues.push({
              id: generateIssueId(),
              boreholeId,
              category: "missingRequiredField",
              severity: "warning",
              message: `分层 ${layer.startDepth}~${layer.endDepth}m 缺少岩性`,
              detail: "请补充该分层的岩性分类",
              focusType: "layer",
              focusId: layer.id,
            });
          }
          if (!layer.soilColor || !layer.soilColor.trim()) {
            issues.push({
              id: generateIssueId(),
              boreholeId,
              category: "missingRequiredField",
              severity: "warning",
              message: `分层 ${layer.startDepth}~${layer.endDepth}m 缺少土色`,
              detail: "请补充该分层的土色描述",
              focusType: "layer",
              focusId: layer.id,
            });
          }
          if (!layer.density || !layer.density.trim()) {
            issues.push({
              id: generateIssueId(),
              boreholeId,
              category: "missingRequiredField",
              severity: "warning",
              message: `分层 ${layer.startDepth}~${layer.endDepth}m 缺少密实度/状态`,
              detail: "请补充该分层的密实度或状态描述",
              focusType: "layer",
              focusId: layer.id,
            });
          }

          prevEnd = Math.max(prevEnd, le);
        }

        if (holeDepth > 0 && prevEnd < holeDepth - 0.001) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "holeDepth",
            severity: "error",
            message: `最深分层 ${prevEnd.toFixed(2)}m 小于孔深 ${holeDepth.toFixed(2)}m`,
            detail: `相差 ${(holeDepth - prevEnd).toFixed(2)}m 无地层覆盖`,
            focusType: "layer",
          });
        }

        if (holeDepth > 0 && prevEnd > holeDepth + 0.001) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "holeDepth",
            severity: "error",
            message: `最深分层 ${prevEnd.toFixed(2)}m 超出孔深 ${holeDepth.toFixed(2)}m`,
            detail: `超出 ${(prevEnd - holeDepth).toFixed(2)}m`,
            focusType: "layer",
          });
        }
      }

      for (const spt of bhSPT) {
        const depth = parseFloat(spt.depth);
        if (isNaN(depth) || !spt.depth.trim()) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "missingRequiredField",
            severity: "error",
            message: `标贯记录深度无效：${spt.depth || "(空)"}`,
            detail: "请填写有效的标贯深度值",
            focusType: "spt",
            focusId: spt.id,
          });
          continue;
        }
        const inLayer = sortedLayers.some(
          (l) =>
            !isNaN(parseFloat(l.startDepth)) &&
            !isNaN(parseFloat(l.endDepth)) &&
            depth >= parseFloat(l.startDepth) &&
            depth <= parseFloat(l.endDepth)
        );
        if (!inLayer) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "sptDepth",
            severity: "error",
            message: `标贯深度 ${spt.depth}m 不落在任何分层内`,
            detail: "请检查标贯深度或补充对应分层",
            focusType: "spt",
            focusId: spt.id,
          });
        }
        if (holeDepth > 0 && depth > holeDepth) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "sptDepth",
            severity: "error",
            message: `标贯深度 ${spt.depth}m 超出孔深 ${holeDepth}m`,
            focusType: "spt",
            focusId: spt.id,
          });
        }
        if (!spt.blowCount || !spt.blowCount.trim() || isNaN(parseFloat(spt.blowCount))) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "missingRequiredField",
            severity: "warning",
            message: `标贯 ${spt.depth}m 缺少击数值`,
            detail: "请补充该标贯试验的击数",
            focusType: "spt",
            focusId: spt.id,
          });
        }
      }

      for (const sample of bhSampling) {
        const depth = parseFloat(sample.depth);
        if (isNaN(depth) || !sample.depth.trim()) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "missingRequiredField",
            severity: "error",
            message: `取样记录深度无效：${sample.depth || "(空)"}`,
            detail: "请填写有效的取样深度值",
            focusType: "sampling",
            focusId: sample.id,
          });
          continue;
        }
        const inLayer = sortedLayers.some(
          (l) =>
            !isNaN(parseFloat(l.startDepth)) &&
            !isNaN(parseFloat(l.endDepth)) &&
            depth >= parseFloat(l.startDepth) &&
            depth <= parseFloat(l.endDepth)
        );
        if (!inLayer) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "samplingDepth",
            severity: "error",
            message: `取样深度 ${sample.depth}m 不落在任何分层内`,
            detail: "请检查取样深度或补充对应分层",
            focusType: "sampling",
            focusId: sample.id,
          });
        }
        if (holeDepth > 0 && depth > holeDepth) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "samplingDepth",
            severity: "error",
            message: `取样深度 ${sample.depth}m 超出孔深 ${holeDepth}m`,
            focusType: "sampling",
            focusId: sample.id,
          });
        }
        if (!sample.sampleNumber || !sample.sampleNumber.trim()) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "missingRequiredField",
            severity: "warning",
            message: `取样 ${sample.depth}m 缺少样号`,
            detail: "请补充该样品的编号",
            focusType: "sampling",
            focusId: sample.id,
          });
        }
        if (!sample.sampleType || !sample.sampleType.trim()) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "missingRequiredField",
            severity: "warning",
            message: `取样 ${sample.depth}m 缺少样品类型`,
            detail: "请补充该样品的类型（原状样/扰动样/岩芯样/水样）",
            focusType: "sampling",
            focusId: sample.id,
          });
        }
      }

      for (const wl of bhWL) {
        const firstSeen = parseFloat(wl.firstSeenLevel);
        const stable = parseFloat(wl.stableLevel);
        if (wl.firstSeenLevel && !isNaN(firstSeen) && holeDepth > 0 && firstSeen > holeDepth) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "waterLevel",
            severity: "error",
            message: `初见水位 ${wl.firstSeenLevel}m 超出孔深 ${holeDepth}m`,
            focusType: "waterLevel",
            focusId: wl.id,
          });
        }
        if (wl.stableLevel && !isNaN(stable) && holeDepth > 0 && stable > holeDepth) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "waterLevel",
            severity: "error",
            message: `稳定水位 ${wl.stableLevel}m 超出孔深 ${holeDepth}m`,
            focusType: "waterLevel",
            focusId: wl.id,
          });
        }
        if (!wl.observationTime || !wl.observationTime.trim()) {
          issues.push({
            id: generateIssueId(),
            boreholeId,
            category: "missingRequiredField",
            severity: "warning",
            message: "水位记录缺少观测时间",
            detail: "请补充水位观测的时间",
            focusType: "waterLevel",
            focusId: wl.id,
          });
        }
      }

      if (bhWL.length === 0) {
        issues.push({
          id: generateIssueId(),
          boreholeId,
          category: "waterLevel",
          severity: "warning",
          message: "暂无水位观测记录",
          detail: "建议补充地下水位观测数据",
          focusType: "waterLevel",
        });
      } else if (!bhWL.some((wl) => wl.stableLevel && wl.stableLevel.trim())) {
        issues.push({
          id: generateIssueId(),
          boreholeId,
          category: "waterLevel",
          severity: "warning",
          message: "暂无稳定水位记录",
          detail: "已观测初见水位，但缺少稳定水位数据",
          focusType: "waterLevel",
        });
      }
    }

    const allSampleNumbers: Record<string, { boreholeId: string; sampleId: string }[]> = {};
    for (const record of records) {
      const boreholeId = record["钻孔编号"];
      const bhSampling = samplingRecords[boreholeId] || [];
      for (const sample of bhSampling) {
        if (sample.sampleNumber && sample.sampleNumber.trim()) {
          const key = sample.sampleNumber.trim();
          if (!allSampleNumbers[key]) {
            allSampleNumbers[key] = [];
          }
          allSampleNumbers[key].push({ boreholeId, sampleId: sample.id });
        }
      }
    }
    for (const [sampleNumber, occurrences] of Object.entries(allSampleNumbers)) {
      if (occurrences.length > 1) {
        for (const occ of occurrences) {
          issues.push({
            id: generateIssueId(),
            boreholeId: occ.boreholeId,
            category: "duplicateSampleNumber",
            severity: "error",
            message: `样号重复：${sampleNumber}`,
            detail: `该样号在 ${occurrences.length} 个取样记录中出现（${occurrences
              .map((o) => o.boreholeId)
              .join("、")}）`,
            focusType: "sampling",
            focusId: occ.sampleId,
          });
        }
      }
    }

    return issues;
  }, [records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords]);

  const stats = useMemo<QualityCheckStats>(() => {
    const byCategory: Record<QualityIssueCategory, number> = {
      holeDepth: 0,
      layerContinuity: 0,
      sptDepth: 0,
      samplingDepth: 0,
      waterLevel: 0,
      duplicateSampleNumber: 0,
      missingRequiredField: 0,
      layerOverlap: 0,
    };
    const byBorehole: Record<string, { errors: number; warnings: number }> = {};
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const issue of allIssues) {
      byCategory[issue.category]++;
      if (issue.severity === "error") {
        totalErrors++;
      } else {
        totalWarnings++;
      }
      if (!byBorehole[issue.boreholeId]) {
        byBorehole[issue.boreholeId] = { errors: 0, warnings: 0 };
      }
      if (issue.severity === "error") {
        byBorehole[issue.boreholeId].errors++;
      } else {
        byBorehole[issue.boreholeId].warnings++;
      }
    }

    return {
      totalErrors,
      totalWarnings,
      totalIssues: allIssues.length,
      byCategory,
      byBorehole,
    };
  }, [allIssues]);

  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && issue.category !== categoryFilter) return false;
      if (boreholeFilter !== "all" && issue.boreholeId !== boreholeFilter) return false;
      return true;
    });
  }, [allIssues, severityFilter, categoryFilter, boreholeFilter]);

  const groupedIssues = useMemo(() => {
    const errors = filteredIssues.filter((i) => i.severity === "error");
    const warnings = filteredIssues.filter((i) => i.severity === "warning");
    return { errors, warnings };
  }, [filteredIssues]);

  const categoryOptions = Object.entries(CATEGORY_LABELS) as [
    QualityIssueCategory,
    string
  ][];

  const boreholeIds = useMemo(
    () => records.map((r) => r["钻孔编号"]).filter(Boolean),
    [records]
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const categoryIcon: Record<QualityIssueCategory, string> = {
    holeDepth: "📏",
    layerContinuity: "📐",
    sptDepth: "🔨",
    samplingDepth: "🧪",
    waterLevel: "💧",
    duplicateSampleNumber: "🔁",
    missingRequiredField: "📝",
    layerOverlap: "⚠️",
  };

  const renderIssueRow = (issue: QualityIssue) => (
    <tr
      key={issue.id}
      className={`qc-issue-row qc-${issue.severity}`}
      onClick={() =>
        onNavigateToBorehole(issue.boreholeId, issue.focusType, issue.focusId)
      }
    >
      <td className="qc-severity-cell">
        <span className={`qc-severity-badge qc-${issue.severity}`}>
          {issue.severity === "error" ? "❌ 错误" : "⚠️ 警告"}
        </span>
      </td>
      <td className="qc-category-cell">
        <span className="qc-category-tag">
          {categoryIcon[issue.category]} {CATEGORY_LABELS[issue.category]}
        </span>
      </td>
      <td className="qc-borehole-cell">
        <button className="qc-borehole-link">{issue.boreholeId}</button>
      </td>
      <td className="qc-message-cell">
        <div className="qc-message">{issue.message}</div>
        {issue.detail && <div className="qc-detail">{issue.detail}</div>}
      </td>
      <td className="qc-action-cell">
        <button className="qc-nav-btn" title="跳转到对应位置">
          跳转 →
        </button>
      </td>
    </tr>
  );

  return (
    <div className="quality-check-panel">
      <div className="qc-stats-grid">
        <div
          className={`qc-stat-card qc-stat-total ${
            stats.totalIssues === 0 ? "qc-all-clear" : ""
          }`}
        >
          <span className="qc-stat-icon">📊</span>
          <div className="qc-stat-content">
            <span className="qc-stat-label">问题总数</span>
            <strong className="qc-stat-value">{stats.totalIssues}</strong>
          </div>
        </div>
        <div className="qc-stat-card qc-stat-error">
          <span className="qc-stat-icon">❌</span>
          <div className="qc-stat-content">
            <span className="qc-stat-label">错误</span>
            <strong className="qc-stat-value">{stats.totalErrors}</strong>
          </div>
        </div>
        <div className="qc-stat-card qc-stat-warning">
          <span className="qc-stat-icon">⚠️</span>
          <div className="qc-stat-content">
            <span className="qc-stat-label">警告</span>
            <strong className="qc-stat-value">{stats.totalWarnings}</strong>
          </div>
        </div>
        {categoryOptions.map(([key, label]) => (
          <div key={key} className="qc-stat-card qc-stat-category">
            <span className="qc-stat-icon">{categoryIcon[key]}</span>
            <div className="qc-stat-content">
              <span className="qc-stat-label">{label}</span>
              <strong className="qc-stat-value">{stats.byCategory[key]}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="qc-filters-row">
        <div className="qc-filter-group">
          <label>严重程度：</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          >
            <option value="all">全部</option>
            <option value="error">仅错误</option>
            <option value="warning">仅警告</option>
          </select>
        </div>
        <div className="qc-filter-group">
          <label>问题类型：</label>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as CategoryFilter)
            }
          >
            <option value="all">全部类型</option>
            {categoryOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="qc-filter-group">
          <label>钻孔：</label>
          <select
            value={boreholeFilter}
            onChange={(e) =>
              setBoreholeFilter(e.target.value as BoreholeFilter)
            }
          >
            <option value="all">全部钻孔</option>
            {boreholeIds.map((id) => (
              <option key={id} value={id}>
                {id}
                {stats.byBorehole[id] &&
                  ` (${stats.byBorehole[id].errors}错/${stats.byBorehole[id].warnings}警)`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="qc-empty-state">
          <span className="qc-empty-icon">✅</span>
          <h4>
            {allIssues.length === 0
              ? "所有数据质量检查通过！"
              : "当前筛选条件下无问题"}
          </h4>
          <p>
            {allIssues.length === 0
              ? "未发现任何数据质量问题，干得漂亮！"
              : "请尝试调整筛选条件"}
          </p>
        </div>
      ) : (
        <>
          {groupedIssues.errors.length > 0 && (
            <div className="qc-issue-group">
              <div
                className={`qc-group-header qc-error-header ${
                  expandedGroups.has("error") ? "expanded" : ""
                }`}
                onClick={() => toggleGroup("error")}
              >
                <span className="qc-group-toggle">
                  {expandedGroups.has("error") ? "▼" : "▶"}
                </span>
                <span className="qc-group-icon">❌</span>
                <span className="qc-group-title">错误</span>
                <span className="qc-group-count">{groupedIssues.errors.length}</span>
              </div>
              {expandedGroups.has("error") && (
                <div className="qc-table-wrapper">
                  <table className="qc-issue-table">
                    <thead>
                      <tr>
                        <th style={{ width: 100 }}>严重程度</th>
                        <th style={{ width: 150 }}>类型</th>
                        <th style={{ width: 120 }}>钻孔</th>
                        <th>问题描述</th>
                        <th style={{ width: 90 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedIssues.errors.map(renderIssueRow)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {groupedIssues.warnings.length > 0 && (
            <div className="qc-issue-group">
              <div
                className={`qc-group-header qc-warning-header ${
                  expandedGroups.has("warning") ? "expanded" : ""
                }`}
                onClick={() => toggleGroup("warning")}
              >
                <span className="qc-group-toggle">
                  {expandedGroups.has("warning") ? "▼" : "▶"}
                </span>
                <span className="qc-group-icon">⚠️</span>
                <span className="qc-group-title">警告</span>
                <span className="qc-group-count">
                  {groupedIssues.warnings.length}
                </span>
              </div>
              {expandedGroups.has("warning") && (
                <div className="qc-table-wrapper">
                  <table className="qc-issue-table">
                    <thead>
                      <tr>
                        <th style={{ width: 100 }}>严重程度</th>
                        <th style={{ width: 150 }}>类型</th>
                        <th style={{ width: 120 }}>钻孔</th>
                        <th>问题描述</th>
                        <th style={{ width: 90 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedIssues.warnings.map(renderIssueRow)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="qc-footer-hint">
        <span>💡 提示：</span>
        <span>
          点击任意问题行可快速跳转到对应钻孔的编辑位置，修复数据问题。
        </span>
      </div>
    </div>
  );
}
