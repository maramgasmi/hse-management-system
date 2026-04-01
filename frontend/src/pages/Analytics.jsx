// =============================================================
// Analytics.jsx  — redesigned to match the SafetyFirst HSE dark theme
// -------------------------------------------------------------
// This page gives a full analytical view of HSE performance:
//
//   Row 1 — 3 KPI cards   (Total incidents, This month, Open)
//   Row 2 — Severity PieChart (Recharts) + Status breakdown cards
//   Row 3 — 30-Day Incidents Trend (Recharts LineChart)
//   Row 4 — Incidents by Department (horizontal bars, pure CSS)
//
// All Recharts colours are overridden to match the dark theme tokens.
// The sidebar + layout mirrors HSEDashboard / HSEIncidentLog.
// =============================================================

import { Fragment, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { format, subDays } from 'date-fns';
import api from '../services/api';
import HSESidebar from '../components/HSESidebar';
import CreateIncidentModal from '../components/CreateIncidentModal';

// ---------------------------------------------------------------
// THEME TOKENS — kept in sync with HSEDashboard / HSEIncidentLog
// ---------------------------------------------------------------
const BG        = '#0B0E14';
const CARD_BG   = '#151921';
const INSET_BG  = '#0F131A';
const BORDER    = '#232933';
const BLUE      = '#3498DB';
const ORANGE    = '#E67E22';
const GREEN     = '#10B981';
const PURPLE    = '#8B5CF6';
const RED       = '#EF4444';
const YELLOW    = '#EAB308';

// Severity colour mapping — matches the pill/badge colours used elsewhere
const SEV_COLORS = {
  CRITICAL: RED,
  HIGH:     ORANGE,
  MEDIUM:   YELLOW,
  LOW:      GREEN,
};

// Status colours for the status breakdown section
const STATUS_COLOR = {
  DRAFT:               '#6B7280',
  SUBMITTED:           BLUE,
  UNDER_INVESTIGATION: PURPLE,
  VALIDATED:           GREEN,
  CLOSED:              '#4B5563',
};

// Department bar colours — cycled through
const DEPT_COLORS = [BLUE, PURPLE, GREEN, YELLOW, RED, '#06B6D4'];

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs"
      style={{ background: '#1C2333', border: `1px solid ${BORDER}`, color: '#E5E7EB' }}
    >
      {label && <p className="font-semibold mb-1" style={{ color: '#9CA3AF' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i}>
          <span style={{ color: p.color || BLUE }}>{p.name}: </span>
          <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, sub, accent = BLUE }) => (
  <div
    className="rounded-md p-5 flex items-start gap-4"
    style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
  >
    <div
      className="p-2.5 rounded-md flex-shrink-0"
      style={{ background: `${accent}18` }}
    >
      <Icon className="h-6 w-6" style={{ color: accent }} />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-white leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  </div>
);

const RiskHeatmap = ({ data = {} }) => {
  const { t } = useTranslation();
  const labels = [1, 2, 3, 4, 5];
  const getColor = (p, i) => {
    const score = p * i;
    if (score >= 15) return '#7F1D1D';
    if (score >= 10) return '#7C2D12';
    if (score >= 5)  return '#713F12';
    return '#14532D';
  };

  return (
    <div className="mt-2">
      <div className="grid grid-cols-6 gap-1 w-full max-w-sm mx-auto">
        <div /> 
        {labels.map(l => <div key={l} className="text-[10px] text-gray-600 font-bold text-center pb-1 uppercase">{l}</div>)}
        
        {labels.map(p => (
           <Fragment key={p}>
             <div className="text-[10px] text-gray-600 font-bold flex items-center justify-end pr-2 uppercase">{p}</div>
             {labels.map(i => {
                const count = data[`${p}x${i}`] || 0;
                return (
                  <div key={i} title={`Prob: ${p}, Impact: ${i} | Count: ${count}`}
                     className="aspect-square rounded flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                     style={{ background: count > 0 ? getColor(p,i) : '#1C2333', border: `1px solid ${count > 0 ? 'white' : '#232933'}40` }}>
                    {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                  </div>
                );
             })}
           </Fragment>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-4 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
         <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#14532D' }} /> {t('severity_levels.LOW')}</div>
         <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#713F12' }} /> {t('severity_levels.MEDIUM')}</div>
         <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#7C2D12' }} /> {t('severity_levels.HIGH')}</div>
         <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#7F1D1D' }} /> {t('severity_levels.CRITICAL')}</div>
      </div>
    </div>
  );
};

const StatBars = ({ data, labelKey = 'key' }) => {
  const { t } = useTranslation();
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 text-center py-6">{t('common.search')}</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item[labelKey]} className="flex items-center gap-3">
          <p className="text-xs text-gray-400 text-right flex-shrink-0" style={{ width: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item[labelKey]?.replace(/_/g, ' ') || 'Unknown'}
          </p>
          <div className="flex-1 h-1.5 rounded-full" style={{ background: INSET_BG }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
          </div>
          <p className="text-xs font-bold text-white flex-shrink-0 w-5 text-right">{item.count}</p>
        </div>
      ))}
    </div>
  );
};

const StatusGrid = ({ byStatus }) => {
  const { t } = useTranslation();
  if (!byStatus || Object.keys(byStatus).length === 0) {
    return <p className="text-sm text-gray-500">No status data.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Object.entries(byStatus).map(([status, count]) => {
        const col = STATUS_COLOR[status] || '#6B7280';
        return (
          <div
            key={status}
            className="rounded-md px-4 py-3"
            style={{ background: `${col}10`, border: `1px solid ${col}30` }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: col }}>
              {t(`status.${status}`, status.replace(/_/g, ' '))}
            </p>
            <p className="text-2xl font-bold text-white">{count}</p>
          </div>
        );
      })}
    </div>
  );
};

const Analytics = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [dashboard, setDashboard]   = useState(null);
  const [incidents, setIncidents]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, incRes] = await Promise.all([
          api.get('/incidents/statistics/'),
          api.get('/incidents/?page_size=200'),
        ]);

        const stats     = statsRes.data;
        const incList   = incRes.data.results || [];
        setIncidents(incList);

        const now = new Date();
        const currentMonthIncidents = incList.filter(inc => {
          const d = new Date(inc.incident_date || inc.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        const openIncidents = incList.filter(inc =>
          inc.status === 'SUBMITTED' || inc.status === 'UNDER_INVESTIGATION'
        ).length;

        setDashboard({
          total_incidents:         stats.total || 0,
          total_cost:              stats.total_cost || 0,
          current_month_incidents: currentMonthIncidents,
          open_incidents:          openIncidents,
          by_severity:             stats.by_severity || {},
          by_status:               stats.by_status  || {},
          risk_matrix:             stats.risk_matrix || {},
          by_rca: Object.entries(stats.by_rca || {})
            .map(([rca, count]) => ({ rca, count }))
            .sort((a, b) => b.count - a.count),
          by_department: Object.entries(stats.by_department || {})
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8),
        });
      } catch (err) {
        console.error('❌ Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const trendData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i);
      return {
        date:     format(d, 'MMM dd'),
        fullDate: format(d, 'yyyy-MM-dd'),
        count:    0,
      };
    });

    incidents.forEach(inc => {
      try {
        const fd = format(new Date(inc.incident_date), 'yyyy-MM-dd');
        const bucket = days.find(d => d.fullDate === fd);
        if (bucket) bucket.count++;
      } catch (_) {}
    });

    return days;
  }, [incidents]);

  const severityPieData = useMemo(() => {
    if (!dashboard?.by_severity) return [];
    return Object.entries(dashboard.by_severity)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: t(`severity_levels.${name}`, name),
        value,
        color: SEV_COLORS[name] || '#6B7280',
      }));
  }, [dashboard, t]);

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100vh', display: 'flex' }}>
        <HSESidebar activePage="analytics" onNavigate={navigate} onReport={() => setReportOpen(true)} />
        <div className="lg:ml-[260px] flex-1 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3"
              style={{ borderColor: BLUE }} />
            <p className="text-sm" style={{ color: '#6B7280' }}>{t('common.search')}...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex' }}>
      <HSESidebar
        activePage="analytics"
        onNavigate={navigate}
        onReport={() => setReportOpen(true)}
      />

      <main className="lg:ml-[260px] flex-1 px-4 sm:px-6 lg:px-10 py-8 min-w-0">
        <div className="mb-8">
          <p className="text-xs text-gray-600 mb-1">
            SafetyFirst HSE &rsaquo; <span className="text-gray-500">{t('sidebar.analytics')}</span>
          </p>
          <h1 className="text-2xl font-bold text-white">{t('sidebar.analytics')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            icon={ChartBarIcon}
            label={t('dashboard.kpi.total_incidents') || "Total Incidents"}
            value={dashboard?.total_incidents ?? 0}
            sub={t('common.all')}
            accent={BLUE}
          />
          <KPICard
            icon={ArrowTrendingUpIcon}
            label={t('dashboard.kpi.current_month') || "This Month"}
            value={dashboard?.current_month_incidents ?? 0}
            sub={t('common.date')}
            accent={GREEN}
          />
          <KPICard
            icon={ClockIcon}
            label={t('dashboard.kpi.open_incidents') || "Open Incidents"}
            value={dashboard?.open_incidents ?? 0}
            sub={t('status.SUBMITTED')}
            accent={ORANGE}
          />
          <KPICard
            icon={CurrencyDollarIcon}
            label={t('forms.estimated_cost')}
            value={`${Number(dashboard?.total_cost || 0).toLocaleString()} TND`}
            sub={t('incident_log.security_governance')}
            accent={RED}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div
            className="rounded-md p-5"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.charts.severity_mix')}</h3>
            {severityPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: '#374151' }}
                  >
                    {severityPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ color: '#9CA3AF', fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-10">{t('common.search')}</p>
            )}
          </div>

          <div
            className="rounded-md p-5"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.charts.status_breakdown') || "Incidents by Status"}</h3>
            <StatusGrid byStatus={dashboard?.by_status} />
          </div>
        </div>

        <div
          className="rounded-md p-5 mb-6"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.charts.monthly_trend')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232933" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={{ stroke: BORDER }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<DarkTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name={t('sidebar.incidents')}
                stroke={BLUE}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: BLUE, stroke: CARD_BG, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="rounded-md p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <h3 className="text-sm font-semibold text-white mb-5">{t('dashboard.charts.dept_breakdown')}</h3>
            <StatBars data={dashboard?.by_department} labelKey="department" />
          </div>
          <div className="rounded-md p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
             <h3 className="text-sm font-semibold text-white mb-5">{t('dashboard.charts.rca_pareto') || "Root Cause Pareto"}</h3>
             <StatBars data={dashboard?.by_rca} labelKey="rca" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
           <div className="lg:col-span-1 rounded-md p-5 flex flex-col items-center justify-center text-center" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="p-3 rounded-full mb-4" style={{ background: `${RED}15` }}>
                 <ShieldExclamationIcon className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-white font-bold mb-2">{t('dashboard.risk_heatmap_title') || "High-Risk Hazard Density"}</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                 {t('dashboard.risk_heatmap_sub') || "Statistical distribution across the industrial likelihood & impact matrix."}
              </p>
           </div>
           <div className="lg:col-span-2 rounded-md p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-semibold text-white">{t('dashboard.charts.risk_matrix') || "Risk Heatmap"}</h3>
                 <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest opacity-50">{t('dashboard.likelihood')} &rsaquo; {t('dashboard.impact')}</span>
              </div>
              <RiskHeatmap data={dashboard?.risk_matrix} />
           </div>
        </div>
      </main>

      <CreateIncidentModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onSuccess={() => setReportOpen(false)}
      />
    </div>
  );
};

export default Analytics;
