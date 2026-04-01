// =============================================================
// HSEDashboard.jsx  (replaces pages/Dashboard.jsx via App.js)
// -------------------------------------------------------------
// Enterprise-grade HSE Dashboard featuring:
//   • 4 KPI cards  — TRIR, LTIFR, Total LTI, Near Misses
//   • Horizontal bar chart  — Incidents by Department (pure SVG)
//   • Semi-donut chart     — Risk / Severity Distribution (SVG)
//   • Quick-glance recent incidents table
//
// Data sources:
//   GET /incidents/           — incident list (for counts / charts)
//   GET /incidents/statistics/ — pre-aggregated by status / severity / dept
//
// Design tokens — all dark-theme custom colours are applied via
// inline `style` props since they are outside standard Tailwind.
// =============================================================

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import HSESidebar from '../components/HSESidebar';
import CreateIncidentModal from '../components/CreateIncidentModal';
import IncidentDetailModal from '../components/IncidentDetailModal';

// ---------------------------------------------------------------
// THEME TOKENS
// ---------------------------------------------------------------
const BG         = '#0B0E14';
const CARD_BG    = '#151921';
const BORDER     = '#232933';
const BLUE       = '#3498DB';
const ORANGE     = '#E67E22';
const GREEN      = '#10B981';
const PURPLE     = '#8B5CF6';
const RED        = '#EF4444';
const YELLOW     = '#EAB308';

// ---------------------------------------------------------------
// Severity colour mapping for the donut chart segments
// ---------------------------------------------------------------
const SEVERITY_COLORS = {
  CRITICAL: RED,
  HIGH:     ORANGE,
  MEDIUM:   YELLOW,
  LOW:      GREEN,
};

// Department bar chart colours — cycled through per bar
const DEPT_COLORS = [BLUE, PURPLE, GREEN, YELLOW, RED, '#06B6D4'];

// ---------------------------------------------------------------
// KPICard — one metric tile
// Props: icon, label, value, sub (small text), accent (colour)
// ---------------------------------------------------------------
const KPICard = ({ icon: Icon, label, value, sub, accent = BLUE }) => (
  <div
    className="rounded-md p-5 flex items-start gap-4"
    style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
  >
    {/* Icon container with tinted background */}
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

// ---------------------------------------------------------------
// HorizontalBarChart — Incidents by Department (pure SVG-free, div bars)
// Props: data = [{ name, count }]
// ---------------------------------------------------------------
const HorizontalBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">No data</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.name} className="flex items-center gap-3">
          {/* Department label */}
          <p
            className="text-xs text-gray-400 text-right flex-shrink-0"
            style={{ width: 80, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={item.name}
          >
            {item.name}
          </p>

          {/* Bar track */}
          <div className="flex-1 h-2 rounded-full" style={{ background: '#1C2333' }}>
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: DEPT_COLORS[i % DEPT_COLORS.length],
                minWidth: item.count > 0 ? 4 : 0,
              }}
            />
          </div>

          {/* Count */}
          <p className="text-xs font-bold text-white flex-shrink-0 w-5 text-right">
            {item.count}
          </p>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------
// SemiDonutChart — Severity breakdown using an SVG arc for each slice
// Props: data = [{ label, count, color }]
// ---------------------------------------------------------------
const SemiDonutChart = ({ data }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  // Build SVG arc paths.
  // We use a FULL donut (360°) not semi, drawn on a 100×100 viewBox.
  // r=36, center=(50,50) → circumference = 2π×36 ≈ 226.2
  const R   = 36;
  const CX  = 50;
  const CY  = 50;
  const CIRC = 2 * Math.PI * R;

  // Convert each slice to a stroke-dasharray segment
  let cumulative = 0;
  const slices = data.map((d) => {
    const pct    = d.count / total;
    const offset = CIRC * (1 - cumulative);
    const dash   = CIRC * pct;
    cumulative  += pct;
    return { ...d, dash, offset, pct };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG donut */}
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="#1C2333"
            strokeWidth={10}
          />
          {/* Coloured segments */}
          {slices.map((s) => (
            <circle
              key={s.label}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={10}
              strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
              strokeDashoffset={-s.offset}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          ))}
        </svg>
        {/* Centre label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <p className="text-2xl font-bold text-white leading-none">{total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 w-full">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-xs text-gray-400">{s.label}</span>
            <span className="ml-auto text-xs font-bold text-white">
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------
// Severity pill (inline, for the recent incidents table)
// ---------------------------------------------------------------
const SevPill = ({ severity }) => {
  const map = {
    CRITICAL: { bg:'#7F1D1D', color:'#FCA5A5' },
    HIGH:     { bg:'#7C2D12', color:'#FDBA74' },
    MEDIUM:   { bg:'#713F12', color:'#FDE047' },
    LOW:      { bg:'#14532D', color:'#86EFAC' },
  };
  const s = map[severity] || { bg:'#1F2937', color:'#9CA3AF' };
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold" style={s}>
      {severity}
    </span>
  );
};

// Status dot
const StatusDot = ({ status }) => {
  const col = {
    DRAFT:'#6B7280', SUBMITTED:BLUE, UNDER_INVESTIGATION:PURPLE,
    VALIDATED:GREEN, CLOSED:'#6B7280',
  }[status] || '#6B7280';
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: col }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: col }} />
      {status?.replace('_', ' ')}
    </span>
  );
};

// =================================================================
// MAIN PAGE COMPONENT
// =================================================================
const HSEDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [incidents, setIncidents]   = useState([]);
  const [stats, setStats]           = useState(null);
  const [metrics, setMetrics]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // ---------------------------------------------------------------
  // Load all data in parallel on mount
  // ---------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [incRes, statsRes] = await Promise.all([
          api.get('/incidents/?page_size=100'),
          api.get('/incidents/statistics/'),
        ]);
        setIncidents(incRes.data.results || []);
        setStats(statsRes.data);

        // HSE metrics endpoint — optional; don't crash if missing
        try {
          const metricsRes = await api.get('/incidents/hse_metrics/');
          setMetrics(metricsRes.data);
        } catch (_) {
          // metrics endpoint not yet implemented — use fallback calculations
        }
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---------------------------------------------------------------
  // Derived KPI values
  // ---------------------------------------------------------------
  const kpiValues = useMemo(() => {
    const totalIncidents = incidents.length;
    // TRIR = (Recordable incidents × 200,000) / total hours worked
    // We approximate 200,000 hours if no real denominator is available
    const trir   = metrics?.trir      ?? (totalIncidents > 0 ? (totalIncidents * 200000 / 2000000).toFixed(2) : '0.00');
    const ltifr  = metrics?.ltifr     ?? (incidents.filter(i => i.days_lost > 0).length * 1000000 / 2000000).toFixed(2);
    const ltiCount = incidents.filter(i => i.days_lost > 0).length;
    const totalDaysLost = incidents.reduce((s, i) => s + (i.days_lost || 0), 0);
    const nearMisses = incidents.filter(i => i.incident_type === 'NEAR_MISS').length;

    return { trir, ltifr, ltiCount, totalDaysLost, nearMisses };
  }, [incidents, metrics]);

  // ---------------------------------------------------------------
  // Dept breakdown for bar chart
  // ---------------------------------------------------------------
  const deptData = useMemo(() => {
    if (!stats?.by_department) return [];
    return Object.entries(stats.by_department)
      .map(([name, count]) => ({ name: name || 'Unknown', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [stats]);

  // ---------------------------------------------------------------
  // Severity breakdown for donut
  // ---------------------------------------------------------------
  const severityData = useMemo(() => {
    if (!stats?.by_severity) return [];
    return Object.entries(stats.by_severity)
      .filter(([, count]) => count > 0)
      .map(([label, count]) => ({
        label,
        count,
        color: SEVERITY_COLORS[label] || '#6B7280',
      }));
  }, [stats]);

  // ---------------------------------------------------------------
  // Recent incidents (latest 6) for the table section
  // ---------------------------------------------------------------
  const recentIncidents = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
    [incidents]
  );

  const openDetail = (inc) => {
    setSelectedIncident(inc);
    setDetailOpen(true);
  };

  const loadData = async () => {
    const [incRes, statsRes] = await Promise.all([
      api.get('/incidents/?page_size=100'),
      api.get('/incidents/statistics/'),
    ]);
    setIncidents(incRes.data.results || []);
    setStats(statsRes.data);
  };

  // ---------------------------------------------------------------
  // Export CSV (same logic as the original Incidents page)
  // ---------------------------------------------------------------
  const handleExport = () => {
    const headers = ['Reference', 'Title', 'Severity', 'Status', 'Department', 'Date'];
    const rows = incidents.map(i => [
      i.reference, i.title, i.severity, i.status, i.department, i.incident_date,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hse_incidents_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exported!');
  };

  // ---------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------
  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100vh', display: 'flex' }}>
        <HSESidebar activePage="dashboard" onNavigate={navigate} onReport={() => setReportOpen(true)} />
        <div style={{ marginLeft: 260, flex: 1, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: BLUE }} />
            <p className="text-sm text-gray-500">Loading dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  // =================================================================
  // RENDER
  // =================================================================
  return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex' }}>
      {/* ---- Sidebar ---- */}
      <HSESidebar
        activePage="dashboard"
        onNavigate={navigate}
        onReport={() => setReportOpen(true)}
      />

      {/* ---- Main content area ---- */}
      <main className="lg:ml-[260px] flex-1 px-4 sm:px-6 lg:px-10 py-8 min-w-0">

        {/* === Page Header === */}
        <div className="flex items-start justify-between mb-8">
          <div>
            {/* Breadcrumb */}
            <p className="text-xs text-gray-600 mb-1">
              SafetyFirst HSE &rsaquo; <span className="text-gray-500">{t('sidebar.dashboard')}</span>
            </p>
            <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('dashboard.subtitle')}
            </p>
          </div>
          {/* Export ghost button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              border: `1px solid ${BORDER}`,
              color: '#9CA3AF',
              background: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.color = BLUE; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* === KPI Cards Row === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            icon={ArrowTrendingUpIcon}
            label={t('dashboard.kpi.trir')}
            value={kpiValues.trir}
            sub="Per 200,000 hrs worked"
            accent={BLUE}
          />
          <KPICard
            icon={ClockIcon}
            label={t('dashboard.kpi.ltifr')}
            value={kpiValues.ltifr}
            sub="Per 1,000,000 hrs worked"
            accent={ORANGE}
          />
          <KPICard
            icon={ExclamationTriangleIcon}
            label={t('dashboard.kpi.lti_count')}
            value={kpiValues.ltiCount}
            sub={`${kpiValues.totalDaysLost} ${t('dashboard.kpi.days_lost')}`}
            accent={RED}
          />
          <KPICard
            icon={ShieldExclamationIcon}
            label={t('dashboard.kpi.near_misses')}
            value={kpiValues.nearMisses}
            sub={t('dashboard.subtitle').split(' ')[0] === 'Overview' ? 'Reported this period' : 'سجلت هذه الفترة'} 
            accent={GREEN}
          />
        </div>

        {/* === Charts Row === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          {/* Incidents by Department — horizontal bars */}
          <div
            className="rounded-md p-5"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-sm font-semibold text-white mb-4">
              {t('dashboard.charts.dept_breakdown')}
            </h3>
            {deptData.length > 0
              ? <HorizontalBarChart data={deptData} />
              : <p className="text-gray-500 text-sm">No data / لا توجد بيانات</p>
            }
          </div>

          {/* Severity Breakdown — donut */}
          <div
            className="rounded-md p-5"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-sm font-semibold text-white mb-4">
              {t('dashboard.charts.severity_mix')}
            </h3>
            {severityData.length > 0
              ? <SemiDonutChart data={severityData} />
              : <p className="text-gray-500 text-sm">No data / لا توجد بيانات</p>
            }
          </div>
        </div>

        {/* === Recent Incidents Table === */}
        <div
          className="rounded-md overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <div
            className="px-5 py-3.5 flex justify-between items-center"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <h3 className="text-sm font-semibold text-white">Recent Incidents</h3>
            <button
              className="text-xs font-medium transition-colors"
              style={{ color: BLUE }}
              onClick={() => navigate('/incidents')}
            >
              View All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Ref ID', 'Date', 'Title', 'Severity', 'Status', 'Department'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: '#6B7280' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map((inc, idx) => (
                  <tr
                    key={inc.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: idx < recentIncidents.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1C2434'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => openDetail(inc)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold" style={{ color: BLUE }}>
                        {inc.reference}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {new Date(inc.incident_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white font-medium" style={{ maxWidth: 200 }}>
                      {inc.title}
                    </td>
                    <td className="px-5 py-3.5">
                      <SevPill severity={inc.severity} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusDot status={inc.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {inc.department || '—'}
                    </td>
                  </tr>
                ))}
                {recentIncidents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">
                      No incidents recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onSuccess={loadData}
      />

      {/* Incident Detail Modal */}
      <IncidentDetailModal 
        isOpen={detailOpen} 
        onClose={() => { setDetailOpen(false); setSelectedIncident(null); }} 
        incident={selectedIncident} 
        onUpdate={loadData} 
      />
    </div>
  );
};

export default HSEDashboard;
