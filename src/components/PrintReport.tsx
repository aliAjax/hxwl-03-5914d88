import { useMemo, useEffect } from "react";
import type {
  DrillingRecord,
  BoreholeLayers,
  BoreholeSPTRecords,
  BoreholeSamplingRecords,
  BoreholeWaterLevelRecords,
  StratumLayer,
  SPTRecord,
  WaterLevelRecord,
} from "../types";
import BoreholeChart from "./BoreholeChart";

interface PrintReportProps {
  projectId: string;
  projectTitle: string;
  filteredRecords: DrillingRecord[];
  boreholeLayers: BoreholeLayers;
  sptRecords: BoreholeSPTRecords;
  samplingRecords: BoreholeSamplingRecords;
  waterLevelRecords: BoreholeWaterLevelRecords;
  selectedBoreholesForCharts: string[];
  getWaterLevelDisplayText: (boreholeId: string) => string;
  getLatestWaterLevelObservationText: (boreholeId: string) => string;
  getLatestStableWaterLevel: (boreholeId: string) => string;
  getLayerLithology: (layerId: string) => string;
  onClose: () => void;
}

const lithologyColors: Record<string, string> = {
  "黏土": "#d4a574",
  "粉质黏土": "#e8c9a0",
  "粉土": "#f5deb3",
  "粉砂": "#f0e68c",
  "细砂": "#daa520",
  "中砂": "#cd853f",
  "粗砂": "#8b4513",
  "卵石": "#696969",
  "圆砾": "#808080",
  "强风化岩": "#a0522d",
  "中风化岩": "#8b0000",
  "微风化岩": "#4a0000",
};

const getLithologyColor = (lithology: string): string => {
  return lithologyColors[lithology] || "#cccccc";
};

export default function PrintReport({
  projectId,
  projectTitle,
  filteredRecords,
  boreholeLayers,
  sptRecords,
  samplingRecords,
  waterLevelRecords,
  selectedBoreholesForCharts,
  getWaterLevelDisplayText,
  getLatestWaterLevelObservationText,
  getLatestStableWaterLevel,
  getLayerLithology,
  onClose,
}: PrintReportProps) {
  const now = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, []);

  const summaryStats = useMemo(() => {
    const totalDepth = filteredRecords.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    const recordCount = filteredRecords.length;
    let maxSPT = 0;
    let totalSPTCount = 0;
    let totalSamplingCount = 0;
    let abnormalSPTCount = 0;
    filteredRecords.forEach(r => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      totalSPTCount += bhSPT.length;
      bhSPT.forEach(spt => {
        const blow = parseFloat(spt.blowCount);
        if (!isNaN(blow) && blow > maxSPT) maxSPT = blow;
        if (spt.isAbnormal) abnormalSPTCount++;
      });
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      totalSamplingCount += bhSampling.length;
    });
    let minWaterLevel = Infinity;
    let hasWaterLevelData = false;
    let missingStableWLCount = 0;
    filteredRecords.forEach(r => {
      const stableLevel = getLatestStableWaterLevel(r["钻孔编号"]);
      if (stableLevel) {
        const level = parseFloat(stableLevel);
        if (!isNaN(level) && level < minWaterLevel) {
          minWaterLevel = level;
          hasWaterLevelData = true;
        }
      } else {
        missingStableWLCount++;
      }
    });

    const lithologyBreakdown: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const key = r["岩性分类"] || "未分类";
      lithologyBreakdown[key] = (lithologyBreakdown[key] || 0) + 1;
    });

    const samplingTypeBreakdown: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      bhSampling.forEach(s => {
        samplingTypeBreakdown[s.sampleType] = (samplingTypeBreakdown[s.sampleType] || 0) + 1;
      });
    });

    return {
      projectId,
      recordCount,
      totalDepth: totalDepth.toFixed(1) + "m",
      maxSPT: String(maxSPT) + "击",
      minWaterLevel: hasWaterLevelData ? minWaterLevel.toFixed(1) + "m" : "-",
      totalSPTCount,
      abnormalSPTCount,
      totalSamplingCount,
      missingStableWLCount,
      lithologyBreakdown,
      samplingTypeBreakdown,
    };
  }, [filteredRecords, sptRecords, samplingRecords, getLatestStableWaterLevel, projectId]);

  const abnormalSPTList = useMemo(() => {
    const list: {
      boreholeId: string;
      depth: string;
      blowCount: string;
      lithology: string;
      remark: string;
    }[] = [];
    filteredRecords.forEach(r => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      bhSPT.forEach(s => {
        if (s.isAbnormal) {
          list.push({
            boreholeId: r["钻孔编号"],
            depth: s.depth,
            blowCount: s.blowCount,
            lithology: getLayerLithology(s.layerId),
            remark: s.remark,
          });
        }
      });
    });
    return list.sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [filteredRecords, sptRecords, getLayerLithology]);

  const boreholeIdsForCharts = useMemo(() => {
    if (selectedBoreholesForCharts.length > 0) {
      return filteredRecords
        .map(r => r["钻孔编号"])
        .filter(id => selectedBoreholesForCharts.includes(id));
    }
    return filteredRecords.map(r => r["钻孔编号"]);
  }, [selectedBoreholesForCharts, filteredRecords]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-report-overlay print-report-section">
      <div className="print-report-outer">
        <div className="print-report-toolbar no-print">
          <div className="toolbar-left">
            <span className="toolbar-title">📋 打印报告预览</span>
            <span className="toolbar-hint">按 ESC 关闭，建议使用 A4 纵向打印</span>
          </div>
          <div className="toolbar-right">
            <button className="secondary-btn" onClick={onClose}>关闭</button>
            <button className="primary-action" onClick={handlePrint}>🖨️ 打印报告</button>
          </div>
        </div>

        <div className="print-report-scroll">
          <div className="print-report-page">
            <section className="print-section page-break-avoid">
              <div className="report-header">
                <div className="report-title-block">
                  <h1 className="report-title">{projectTitle}</h1>
                  <p className="report-subtitle">项目编号：{projectId}</p>
                </div>
                <div className="report-meta-block">
                  <div className="meta-item">
                    <span className="meta-label">报告类型</span>
                    <span className="meta-value">钻孔编录汇总报告</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">生成时间</span>
                    <span className="meta-value">{now}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">筛选结果</span>
                    <span className="meta-value">共 {filteredRecords.length} 个钻孔</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="print-section page-break-avoid">
              <h2 className="section-title">一、项目概况</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">钻孔数量</span>
                  <span className="stat-value">{summaryStats.recordCount}</span>
                  <span className="stat-unit">个</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">累计孔深</span>
                  <span className="stat-value">{summaryStats.totalDepth.replace("m", "")}</span>
                  <span className="stat-unit">m</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">标贯试验</span>
                  <span className="stat-value">{summaryStats.totalSPTCount}</span>
                  <span className="stat-unit">次</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">异常标贯</span>
                  <span className="stat-value stat-warn">{summaryStats.abnormalSPTCount}</span>
                  <span className="stat-unit">点</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">取样总数</span>
                  <span className="stat-value">{summaryStats.totalSamplingCount}</span>
                  <span className="stat-unit">组</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">最高标贯</span>
                  <span className="stat-value">{summaryStats.maxSPT.replace("击", "")}</span>
                  <span className="stat-unit">击</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">最低水位</span>
                  <span className="stat-value">{summaryStats.minWaterLevel.replace("m", "")}</span>
                  <span className="stat-unit">m</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">缺稳定水位</span>
                  <span className="stat-value stat-warn">{summaryStats.missingStableWLCount}</span>
                  <span className="stat-unit">孔</span>
                </div>
              </div>

              <div className="breakdown-row">
                <div className="breakdown-block">
                  <h4 className="breakdown-title">岩性分类统计</h4>
                  <div className="breakdown-list">
                    {Object.entries(summaryStats.lithologyBreakdown).map(([k, v]) => (
                      <div key={k} className="breakdown-item">
                        <span className="breakdown-dot" style={{ background: getLithologyColor(k) }}></span>
                        <span className="breakdown-name">{k}</span>
                        <span className="breakdown-count">{v} 孔</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="breakdown-block">
                  <h4 className="breakdown-title">取样类型统计</h4>
                  <div className="breakdown-list">
                    {Object.keys(summaryStats.samplingTypeBreakdown).length === 0 ? (
                      <div className="breakdown-empty">暂无取样记录</div>
                    ) : (
                      Object.entries(summaryStats.samplingTypeBreakdown).map(([k, v]) => (
                        <div key={k} className="breakdown-item">
                          <span className="breakdown-dot breakdown-dot-sample"></span>
                          <span className="breakdown-name">{k}</span>
                          <span className="breakdown-count">{v} 组</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="print-section">
              <h2 className="section-title">二、钻孔汇总</h2>
              <div className="print-table-wrapper">
                <table className="print-table">
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>序号</th>
                      <th style={{ width: "10%" }}>钻孔编号</th>
                      <th style={{ width: "8%" }}>孔深(m)</th>
                      <th style={{ width: "10%" }}>岩性分类</th>
                      <th style={{ width: "18%" }}>岩性描述</th>
                      <th style={{ width: "8%" }}>地下水位</th>
                      <th style={{ width: "8%" }}>分层数</th>
                      <th style={{ width: "8%" }}>标贯次数</th>
                      <th style={{ width: "8%" }}>取样组数</th>
                      <th style={{ width: "17%" }}>最近水位观测</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => {
                      const bhSPT = sptRecords[r["钻孔编号"]] || [];
                      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
                      const bhLayers = boreholeLayers[r["钻孔编号"]] || [];
                      const wlDisplay = getWaterLevelDisplayText(r["钻孔编号"]);
                      const latestObservation = getLatestWaterLevelObservationText(r["钻孔编号"]);
                      return (
                        <tr key={r["钻孔编号"]}>
                          <td className="text-center">{i + 1}</td>
                          <td className="text-bold">{r["钻孔编号"]}</td>
                          <td className="text-center">{r["孔深"]}</td>
                          <td>
                            <span className="print-tag print-tag-litho" style={{ background: getLithologyColor(r["岩性分类"]) }}>
                              {r["岩性分类"]}
                            </span>
                          </td>
                          <td>{r["岩性描述"]}</td>
                          <td className="text-center">{wlDisplay}</td>
                          <td className="text-center">{bhLayers.length}</td>
                          <td className="text-center">{bhSPT.length}</td>
                          <td className="text-center">{bhSampling.length}</td>
                          <td className="text-small">{latestObservation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="print-section">
              <h2 className="section-title">
                三、异常标贯
                {abnormalSPTList.length > 0 && (
                  <span className="section-count">{abnormalSPTList.length} 处异常</span>
                )}
              </h2>
              {abnormalSPTList.length === 0 ? (
                <div className="print-empty">无异常标贯记录</div>
              ) : (
                <div className="print-table-wrapper">
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th style={{ width: "6%" }}>序号</th>
                        <th style={{ width: "14%" }}>钻孔编号</th>
                        <th style={{ width: "12%" }}>深度(m)</th>
                        <th style={{ width: "12%" }}>击数</th>
                        <th style={{ width: "16%" }}>所属岩性</th>
                        <th style={{ width: "50%" }}>备注说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abnormalSPTList.map((item, i) => (
                        <tr key={i} className="row-abnormal">
                          <td className="text-center">{i + 1}</td>
                          <td className="text-bold">{item.boreholeId}</td>
                          <td className="text-center">{item.depth}</td>
                          <td className="text-center text-abnormal">{item.blowCount}击</td>
                          <td>{item.lithology}</td>
                          <td>{item.remark || "未标注原因"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="print-section">
              <h2 className="section-title">四、取样统计</h2>
              <div className="print-table-wrapper">
                <table className="print-table">
                  <thead>
                    <tr>
                      <th style={{ width: "6%" }}>序号</th>
                      <th style={{ width: "14%" }}>钻孔编号</th>
                      <th style={{ width: "12%" }}>深度(m)</th>
                      <th style={{ width: "14%" }}>样品类型</th>
                      <th style={{ width: "18%" }}>样品编号</th>
                      <th style={{ width: "14%" }}>所属岩性</th>
                      <th style={{ width: "22%" }}>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows: {
                        boreholeId: string;
                        depth: string;
                        sampleType: string;
                        sampleNumber: string;
                        lithology: string;
                        remark: string;
                      }[] = [];
                      filteredRecords.forEach(r => {
                        const bhSampling = samplingRecords[r["钻孔编号"]] || [];
                        bhSampling.forEach(s => {
                          rows.push({
                            boreholeId: r["钻孔编号"],
                            depth: s.depth,
                            sampleType: s.sampleType,
                            sampleNumber: s.sampleNumber,
                            lithology: getLayerLithology(s.layerId),
                            remark: s.remark,
                          });
                        });
                      });
                      const sorted = rows.sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
                      if (sorted.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="print-empty-cell">暂无取样记录</td>
                          </tr>
                        );
                      }
                      return sorted.map((item, i) => (
                        <tr key={i}>
                          <td className="text-center">{i + 1}</td>
                          <td className="text-bold">{item.boreholeId}</td>
                          <td className="text-center">{item.depth}</td>
                          <td>
                            <span className="print-tag print-tag-sample">{item.sampleType}</span>
                          </td>
                          <td>{item.sampleNumber}</td>
                          <td>{item.lithology}</td>
                          <td className="text-small">{item.remark || "-"}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="print-section">
              <h2 className="section-title">五、水位观测</h2>
              <div className="print-table-wrapper">
                <table className="print-table">
                  <thead>
                    <tr>
                      <th style={{ width: "6%" }}>序号</th>
                      <th style={{ width: "14%" }}>钻孔编号</th>
                      <th style={{ width: "18%" }}>观测时间</th>
                      <th style={{ width: "12%" }}>初见水位(m)</th>
                      <th style={{ width: "12%" }}>稳定水位(m)</th>
                      <th style={{ width: "10%" }}>状态</th>
                      <th style={{ width: "28%" }}>天气/备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows: {
                        boreholeId: string;
                        observationTime: string;
                        firstSeenLevel: string;
                        stableLevel: string;
                        weatherRemark: string;
                      }[] = [];
                      filteredRecords.forEach(r => {
                        const bhWL = waterLevelRecords[r["钻孔编号"]] || [];
                        if (bhWL.length === 0) {
                          rows.push({
                            boreholeId: r["钻孔编号"],
                            observationTime: "-",
                            firstSeenLevel: "-",
                            stableLevel: "-",
                            weatherRemark: "未观测",
                          });
                        } else {
                          const sorted = [...bhWL].sort((a, b) => {
                            const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
                            const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
                            return timeA - timeB;
                          });
                          sorted.forEach(w => {
                            rows.push({
                              boreholeId: r["钻孔编号"],
                              observationTime: w.observationTime || "时间未记录",
                              firstSeenLevel: w.firstSeenLevel || "-",
                              stableLevel: w.stableLevel || "-",
                              weatherRemark: w.weatherRemark || "-",
                            });
                          });
                        }
                      });
                      if (rows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="print-empty-cell">暂无水位观测记录</td>
                          </tr>
                        );
                      }
                      return rows.map((item, i) => {
                        const isStable = item.stableLevel && item.stableLevel !== "-";
                        return (
                          <tr key={i}>
                            <td className="text-center">{i + 1}</td>
                            <td className="text-bold">{item.boreholeId}</td>
                            <td className="text-small">{item.observationTime}</td>
                            <td className="text-center">{item.firstSeenLevel}</td>
                            <td className="text-center">{item.stableLevel}</td>
                            <td className="text-center">
                              {item.weatherRemark === "未观测" ? (
                                <span className="print-tag print-tag-warn">未观测</span>
                              ) : isStable ? (
                                <span className="print-tag print-tag-ok">已稳定</span>
                              ) : (
                                <span className="print-tag print-tag-pending">待稳定</span>
                              )}
                            </td>
                            <td className="text-small">{item.weatherRemark}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="print-section">
              <h2 className="section-title">
                六、钻孔柱状图
                {boreholeIdsForCharts.length > 0 && (
                  <span className="section-count">{boreholeIdsForCharts.length} 个钻孔</span>
                )}
              </h2>
              {boreholeIdsForCharts.length === 0 ? (
                <div className="print-empty">暂无可显示的钻孔柱状图</div>
              ) : (
                <div className="chart-print-list">
                  {boreholeIdsForCharts.map(boreholeId => {
                    const record = filteredRecords.find(r => r["钻孔编号"] === boreholeId);
                    const holeDepth = record ? parseFloat(record["孔深"]) || 0 : 0;
                    const layers: StratumLayer[] = boreholeLayers[boreholeId] || [];
                    const spt: SPTRecord[] = sptRecords[boreholeId] || [];
                    const wl: WaterLevelRecord[] = waterLevelRecords[boreholeId] || [];
                    return (
                      <div key={boreholeId} className="chart-print-item page-break-before">
                        <BoreholeChart
                          boreholeId={boreholeId}
                          holeDepth={holeDepth}
                          layers={layers}
                          sptRecords={spt}
                          waterLevelRecords={wl}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="report-footer">
              <span>— 报告结束 —</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
