import { useState, useMemo } from "react";
import type {
  DrillingRecord,
  BoreholeLayers,
  BoreholeSPTRecords,
  Permissions,
  Role,
  UncheckedLayerItem,
  AbnormalSPTItem,
  LayerGapItem,
  DepthAnomalyItem,
  ReviewWorkbenchStats,
  StratumLayer,
  SPTRecord,
} from "../types";

interface ReviewWorkbenchProps {
  records: DrillingRecord[];
  boreholeLayers: BoreholeLayers;
  sptRecords: BoreholeSPTRecords;
  permissions: Permissions;
  currentRole: Role;
  onNavigateToBorehole: (boreholeId: string, focusType?: "layer" | "spt", focusId?: string) => void;
  onUpdateLayerCheck: (boreholeId: string, layerId: string, checkRemark: string) => void;
  onUpdateSPTCheck: (boreholeId: string, sptId: string, isAbnormal: boolean, checkRemark: string) => void;
}

type ReviewTab = "layers" | "spt" | "gaps" | "depth";

export default function ReviewWorkbench({
  records,
  boreholeLayers,
  sptRecords,
  permissions,
  currentRole,
  onNavigateToBorehole,
  onUpdateLayerCheck,
  onUpdateSPTCheck,
}: ReviewWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("layers");
  const [editingCheck, setEditingCheck] = useState<{ type: "layer" | "spt"; boreholeId: string; itemId: string } | null>(null);
  const [checkRemarkInput, setCheckRemarkInput] = useState("");
  const [abnormalInput, setAbnormalInput] = useState(false);

  const uncheckedLayers = useMemo<UncheckedLayerItem[]>(() => {
    const result: UncheckedLayerItem[] = [];
    for (const record of records) {
      const bhId = record["钻孔编号"];
      const layers = boreholeLayers[bhId] || [];
      for (const layer of layers) {
        if (!layer.isChecked) {
          result.push({
            type: "layer",
            boreholeId: bhId,
            layerId: layer.id,
            startDepth: layer.startDepth,
            endDepth: layer.endDepth,
            lithology: layer.lithology,
            description: layer.description,
            checkRemark: layer.checkRemark,
          });
        }
      }
    }
    return result.sort((a, b) => {
      if (a.boreholeId !== b.boreholeId) return a.boreholeId.localeCompare(b.boreholeId);
      return parseFloat(a.startDepth) - parseFloat(b.startDepth);
    });
  }, [records, boreholeLayers]);

  const abnormalSPT = useMemo<AbnormalSPTItem[]>(() => {
    const result: AbnormalSPTItem[] = [];
    for (const record of records) {
      const bhId = record["钻孔编号"];
      const bhSPT = sptRecords[bhId] || [];
      for (const spt of bhSPT) {
        if (spt.isAbnormal && !spt.isChecked) {
          result.push({
            type: "spt",
            boreholeId: bhId,
            sptId: spt.id,
            depth: spt.depth,
            blowCount: spt.blowCount,
            remark: spt.remark,
            checkRemark: spt.checkRemark,
          });
        }
      }
    }
    return result.sort((a, b) => {
      if (a.boreholeId !== b.boreholeId) return a.boreholeId.localeCompare(b.boreholeId);
      return parseFloat(a.depth) - parseFloat(b.depth);
    });
  }, [records, sptRecords]);

  const layerGaps = useMemo<LayerGapItem[]>(() => {
    const result: LayerGapItem[] = [];
    for (const record of records) {
      const bhId = record["钻孔编号"];
      const layers = boreholeLayers[bhId] || [];
      if (layers.length === 0) continue;
      const sorted = [...layers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
      let prevEnd = 0;
      for (const layer of sorted) {
        const ls = parseFloat(layer.startDepth);
        if (ls > prevEnd + 0.001) {
          result.push({
            type: "gap",
            boreholeId: bhId,
            gapStart: prevEnd.toFixed(2),
            gapEnd: ls.toFixed(2),
            description: `分层缺口：${prevEnd.toFixed(2)}m ~ ${ls.toFixed(2)}m 无地层数据`,
          });
        }
        prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
      }
    }
    return result.sort((a, b) => {
      if (a.boreholeId !== b.boreholeId) return a.boreholeId.localeCompare(b.boreholeId);
      return parseFloat(a.gapStart) - parseFloat(b.gapStart);
    });
  }, [records, boreholeLayers]);

  const depthAnomalies = useMemo<DepthAnomalyItem[]>(() => {
    const result: DepthAnomalyItem[] = [];
    for (const record of records) {
      const bhId = record["钻孔编号"];
      const holeDepth = parseFloat(record["孔深"]) || 0;
      if (holeDepth === 0) continue;
      const layers = boreholeLayers[bhId] || [];
      if (layers.length === 0) {
        result.push({
          type: "depth",
          boreholeId: bhId,
          holeDepth: record["孔深"],
          lastLayerEnd: "0",
          description: `该钻孔暂无任何分层数据，孔深 ${record["孔深"]}m`,
        });
        continue;
      }
      const sorted = [...layers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
      const lastLayerEnd = parseFloat(sorted[sorted.length - 1].endDepth);
      if (lastLayerEnd < holeDepth - 0.001) {
        result.push({
          type: "depth",
          boreholeId: bhId,
          holeDepth: record["孔深"],
          lastLayerEnd: sorted[sorted.length - 1].endDepth,
          description: `最深分层终止于 ${sorted[sorted.length - 1].endDepth}m，小于钻孔深度 ${record["孔深"]}m，相差 ${(holeDepth - lastLayerEnd).toFixed(2)}m`,
        });
      }
    }
    return result.sort((a, b) => a.boreholeId.localeCompare(b.boreholeId));
  }, [records, boreholeLayers]);

  const stats = useMemo<ReviewWorkbenchStats>(() => ({
    uncheckedLayers: uncheckedLayers.length,
    abnormalSPT: abnormalSPT.length,
    layerGaps: layerGaps.length,
    depthAnomalies: depthAnomalies.length,
    total: uncheckedLayers.length + abnormalSPT.length + layerGaps.length + depthAnomalies.length,
  }), [uncheckedLayers, abnormalSPT, layerGaps, depthAnomalies]);

  const canCheck = permissions.canCheckLayer || permissions.canCheckSPT;

  const startEditLayerCheck = (item: UncheckedLayerItem) => {
    setEditingCheck({ type: "layer", boreholeId: item.boreholeId, itemId: item.layerId });
    setCheckRemarkInput(item.checkRemark || "");
  };

  const startEditSPTCheck = (item: AbnormalSPTItem) => {
    const layers = boreholeLayers[item.boreholeId] || [];
    const bhSPT = sptRecords[item.boreholeId] || [];
    const sptRecord = bhSPT.find(s => s.id === item.sptId);
    setEditingCheck({ type: "spt", boreholeId: item.boreholeId, itemId: item.sptId });
    setCheckRemarkInput(sptRecord?.checkRemark || item.remark || "");
    setAbnormalInput(sptRecord?.isAbnormal || false);
  };

  const saveCheck = () => {
    if (!editingCheck) return;
    if (editingCheck.type === "layer") {
      onUpdateLayerCheck(editingCheck.boreholeId, editingCheck.itemId, checkRemarkInput);
    } else {
      onUpdateSPTCheck(editingCheck.boreholeId, editingCheck.itemId, abnormalInput, checkRemarkInput);
    }
    setEditingCheck(null);
    setCheckRemarkInput("");
  };

  const cancelEdit = () => {
    setEditingCheck(null);
    setCheckRemarkInput("");
    setAbnormalInput(false);
  };

  const tabConfigs: { key: ReviewTab; label: string; count: number; icon: string; colorClass: string }[] = [
    { key: "layers", label: "未校核分层", count: stats.uncheckedLayers, icon: "📋", colorClass: "tab-layer" },
    { key: "spt", label: "异常标贯（待校核）", count: stats.abnormalSPT, icon: "🔨", colorClass: "tab-spt" },
    { key: "gaps", label: "分层缺口", count: stats.layerGaps, icon: "⚠️", colorClass: "tab-gap" },
    { key: "depth", label: "孔深异常", count: stats.depthAnomalies, icon: "📏", colorClass: "tab-depth" },
  ];

  return (
    <div className="review-workbench">
      <div className="review-stats-grid">
        <div className={`review-stat-card review-stat-total ${stats.total === 0 ? "all-clear" : ""}`}>
          <span className="review-stat-icon">📊</span>
          <div className="review-stat-content">
            <span className="review-stat-label">待处理总数</span>
            <strong className="review-stat-value">{stats.total}</strong>
          </div>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-icon">📋</span>
          <div className="review-stat-content">
            <span className="review-stat-label">未校核分层</span>
            <strong className="review-stat-value">{stats.uncheckedLayers}</strong>
          </div>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-icon">🔨</span>
          <div className="review-stat-content">
            <span className="review-stat-label">异常标贯（待校核）</span>
            <strong className="review-stat-value">{stats.abnormalSPT}</strong>
          </div>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-icon">⚠️</span>
          <div className="review-stat-content">
            <span className="review-stat-label">分层缺口</span>
            <strong className="review-stat-value">{stats.layerGaps}</strong>
          </div>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-icon">📏</span>
          <div className="review-stat-content">
            <span className="review-stat-label">孔深异常</span>
            <strong className="review-stat-value">{stats.depthAnomalies}</strong>
          </div>
        </div>
      </div>

      {!permissions.canViewReviewWorkbench ? (
        <div className="permission-empty-state">
          <span className="empty-lock-icon">🔐</span>
          <h4>校核工作台访问受限</h4>
          <p>当前角色为「{currentRole}」，无权限访问校核工作台</p>
        </div>
      ) : (
        <>
          <div className="review-tabs">
            {tabConfigs.map(tab => (
              <button
                key={tab.key}
                className={`review-tab ${activeTab === tab.key ? "active" : ""} ${tab.colorClass}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="review-tab-icon">{tab.icon}</span>
                <span className="review-tab-label">{tab.label}</span>
                <span className={`review-tab-count ${tab.count === 0 ? "zero" : ""}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="review-content">
            {activeTab === "layers" && (
              <div className="review-table-wrapper">
                {uncheckedLayers.length === 0 ? (
                  <div className="review-empty-state">
                    <span className="review-empty-icon">✅</span>
                    <h4>所有分层已完成校核</h4>
                    <p>暂无待校核的分层记录</p>
                  </div>
                ) : (
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>钻孔编号</th>
                        <th>深度范围 (m)</th>
                        <th>岩性</th>
                        <th>描述</th>
                        <th>校核说明</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uncheckedLayers.map(item => {
                        const isEditing = editingCheck?.type === "layer" && editingCheck.itemId === item.layerId;
                        return (
                          <tr key={item.layerId} className={isEditing ? "editing-row" : ""}>
                            <td>
                              <button
                                className="borehole-link-btn"
                                onClick={() => onNavigateToBorehole(item.boreholeId, "layer", item.layerId)}
                              >
                                {item.boreholeId}
                              </button>
                            </td>
                            <td><strong>{item.startDepth} ~ {item.endDepth}</strong></td>
                            <td><span className="tag">{item.lithology}</span></td>
                            <td className="desc-cell">{item.description || "-"}</td>
                            <td className="check-remark-cell">
                              {isEditing ? (
                                <input
                                  className="check-remark-input"
                                  placeholder="请填写校核说明"
                                  value={checkRemarkInput}
                                  onChange={(e) => setCheckRemarkInput(e.target.value)}
                                  autoFocus
                                />
                              ) : (
                                <span className={item.checkRemark ? "has-remark" : "no-remark"}>
                                  {item.checkRemark || "未填写"}
                                </span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <div className="row-action-btns">
                                  <button className="small-btn primary-small" onClick={saveCheck}>保存</button>
                                  <button className="small-btn" onClick={cancelEdit}>取消</button>
                                </div>
                              ) : (
                                <div className="row-action-btns">
                                  <button
                                    className="small-btn"
                                    onClick={() => onNavigateToBorehole(item.boreholeId, "layer", item.layerId)}
                                  >
                                    跳转
                                  </button>
                                  <button
                                    className={`small-btn primary-small ${!canCheck || !permissions.canCheckLayer ? "btn-disabled" : ""}`}
                                    onClick={canCheck && permissions.canCheckLayer ? () => startEditLayerCheck(item) : undefined}
                                    disabled={!canCheck || !permissions.canCheckLayer}
                                    title={!permissions.canCheckLayer ? "当前角色无分层校核权限" : ""}
                                  >
                                    校核
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "spt" && (
              <div className="review-table-wrapper">
                {abnormalSPT.length === 0 ? (
                  <div className="review-empty-state">
                    <span className="review-empty-icon">✅</span>
                    <h4>所有异常标贯已完成校核</h4>
                    <p>暂无可疑的异常标贯记录</p>
                  </div>
                ) : (
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>钻孔编号</th>
                        <th>深度 (m)</th>
                        <th>击数</th>
                        <th>备注</th>
                        <th>校核说明</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abnormalSPT.map(item => {
                        const isEditing = editingCheck?.type === "spt" && editingCheck.itemId === item.sptId;
                        const bhSPT = sptRecords[item.boreholeId] || [];
                        const sptRecord = bhSPT.find(s => s.id === item.sptId);
                        const isAbnormal = sptRecord?.isAbnormal || false;
                        return (
                          <tr key={item.sptId} className={`${isEditing ? "editing-row" : ""} ${isAbnormal ? "abnormal-row" : ""}`}>
                            <td>
                              <button
                                className="borehole-link-btn"
                                onClick={() => onNavigateToBorehole(item.boreholeId, "spt", item.sptId)}
                              >
                                {item.boreholeId}
                              </button>
                            </td>
                            <td><strong>{item.depth}</strong></td>
                            <td>
                              <span className={`blow-count ${isAbnormal ? "blow-abnormal" : ""}`}>
                                {item.blowCount}击
                              </span>
                              {isAbnormal && <span className="status-badge status-abnormal">异常</span>}
                            </td>
                            <td className="desc-cell">{item.remark || "-"}</td>
                            <td className="check-remark-cell">
                              {isEditing ? (
                                <div className="spt-check-edit">
                                  <div className="checkbox-wrapper spt-abnormal-check">
                                    <input
                                      type="checkbox"
                                      checked={abnormalInput}
                                      onChange={(e) => setAbnormalInput(e.target.checked)}
                                    />
                                    <span className="checkbox-text">标记异常</span>
                                  </div>
                                  <input
                                    className="check-remark-input"
                                    placeholder="请填写校核说明"
                                    value={checkRemarkInput}
                                    onChange={(e) => setCheckRemarkInput(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <span className={item.checkRemark ? "has-remark" : "no-remark"}>
                                  {item.checkRemark || "未填写"}
                                </span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <div className="row-action-btns">
                                  <button className="small-btn primary-small" onClick={saveCheck}>保存</button>
                                  <button className="small-btn" onClick={cancelEdit}>取消</button>
                                </div>
                              ) : (
                                <div className="row-action-btns">
                                  <button
                                    className="small-btn"
                                    onClick={() => onNavigateToBorehole(item.boreholeId, "spt", item.sptId)}
                                  >
                                    跳转
                                  </button>
                                  <button
                                    className={`small-btn primary-small ${!canCheck || !permissions.canCheckSPT ? "btn-disabled" : ""}`}
                                    onClick={canCheck && permissions.canCheckSPT ? () => startEditSPTCheck(item) : undefined}
                                    disabled={!canCheck || !permissions.canCheckSPT}
                                    title={!permissions.canCheckSPT ? "当前角色无标贯校核权限" : ""}
                                  >
                                    校核
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "gaps" && (
              <div className="review-table-wrapper">
                {layerGaps.length === 0 ? (
                  <div className="review-empty-state">
                    <span className="review-empty-icon">✅</span>
                    <h4>所有钻孔分层连续无缺口</h4>
                    <p>暂未发现分层缺口</p>
                  </div>
                ) : (
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>钻孔编号</th>
                        <th>缺口区间 (m)</th>
                        <th>问题描述</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {layerGaps.map((item, idx) => (
                        <tr key={`${item.boreholeId}-${idx}`} className="warning-row">
                          <td>
                            <button
                              className="borehole-link-btn"
                              onClick={() => onNavigateToBorehole(item.boreholeId)}
                            >
                              {item.boreholeId}
                            </button>
                          </td>
                          <td><strong className="gap-range">{item.gapStart} ~ {item.gapEnd}</strong></td>
                          <td className="desc-cell">{item.description}</td>
                          <td>
                            <div className="row-action-btns">
                              <button
                                className="small-btn"
                                onClick={() => onNavigateToBorehole(item.boreholeId)}
                              >
                                跳转修复
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "depth" && (
              <div className="review-table-wrapper">
                {depthAnomalies.length === 0 ? (
                  <div className="review-empty-state">
                    <span className="review-empty-icon">✅</span>
                    <h4>所有钻孔深度数据正常</h4>
                    <p>暂未发现孔深异常</p>
                  </div>
                ) : (
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>钻孔编号</th>
                        <th>钻孔深度 (m)</th>
                        <th>最深分层 (m)</th>
                        <th>问题描述</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depthAnomalies.map((item, idx) => (
                        <tr key={`${item.boreholeId}-${idx}`} className="warning-row">
                          <td>
                            <button
                              className="borehole-link-btn"
                              onClick={() => onNavigateToBorehole(item.boreholeId)}
                            >
                              {item.boreholeId}
                            </button>
                          </td>
                          <td><strong>{item.holeDepth}</strong></td>
                          <td>{item.lastLayerEnd}</td>
                          <td className="desc-cell">{item.description}</td>
                          <td>
                            <div className="row-action-btns">
                              <button
                                className="small-btn"
                                onClick={() => onNavigateToBorehole(item.boreholeId)}
                              >
                                跳转修复
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {!canCheck && (
            <div className="review-readonly-hint">
              <span>ℹ️</span>
              <span>当前角色为「{currentRole}」，仅可查看校核工作台数据，不可执行校核操作。如需校核，请切换至「岩土工程师」角色。</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
