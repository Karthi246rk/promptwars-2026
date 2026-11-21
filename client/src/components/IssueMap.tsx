import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Issue } from '../types';
import { fetchIssues, translateTexts } from '../api';
import {
  type Language,
  translateStatus,
  translatePriority,
  translateCategory,
  translateDepartment,
  getFallbackIssueTranslation,
} from '../i18n';

const CATEGORIES = [
  'Road & Potholes',
  'Water Leakage & Supply',
  'Garbage & Sanitation',
  'Streetlights & Power',
  'Public Safety',
  'Other',
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Reported', 'In Progress', 'Resolved'];

const CATEGORY_ICONS: Record<string, string> = {
  'Road & Potholes': '🛣️',
  'Water Leakage & Supply': '💧',
  'Garbage & Sanitation': '🗑️',
  'Streetlights & Power': '💡',
  'Public Safety': '🛡️',
  'Other': '📋',
};

function getMarkerColor(issue: Issue): string {
  if (issue.status === 'Resolved') return '#22c55e'; // Green
  if (issue.priority === 'Critical') return '#ef4444'; // Red
  if (issue.priority === 'High') return '#f97316'; // Orange
  if (issue.priority === 'Medium') return '#eab308'; // Yellow
  return '#3b82f6'; // Blue
}

interface Props {
  refreshTrigger?: number;
  onOpenIssueDetail?: (issue: Issue) => void;
  isActive?: boolean;
  currentLang?: Language;
}

export default function IssueMap({ refreshTrigger, onOpenIssueDetail, isActive, currentLang = 'en' }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapMode, setMapMode] = useState<'pins' | 'heatmap'>('pins');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker | L.CircleMarker>>(new Map());

  // Dynamic In-Memory Map Translations
  const [mapTransMap, setMapTransMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentLang === 'en' || issues.length === 0) return;
    const missingTexts: { key: string; text: string }[] = [];
    issues.forEach((i) => {
      if (i.title && !mapTransMap[`${currentLang}:${i.id}:title`]) {
        missingTexts.push({ key: `${currentLang}:${i.id}:title`, text: i.title });
      }
      if (i.location && !mapTransMap[`${currentLang}:${i.id}:loc`]) {
        missingTexts.push({ key: `${currentLang}:${i.id}:loc`, text: i.location });
      }
    });

    if (missingTexts.length === 0) return;
    translateTexts(missingTexts.map((m) => m.text), currentLang)
      .then((res) => {
        const entries: Record<string, string> = {};
        missingTexts.forEach((m, idx) => {
          if (res[idx]) entries[m.key] = res[idx];
        });
        setMapTransMap((prev) => ({ ...prev, ...entries }));
      })
      .catch(() => {});
  }, [currentLang, issues]);

  const getTrans = (id: string, field: 'title' | 'loc', fallback: string): string => {
    if (currentLang === 'en' || !fallback) return fallback;
    const dynamic = mapTransMap[`${currentLang}:${id}:${field}`];
    if (dynamic && dynamic !== fallback) return dynamic;
    const dict = getFallbackIssueTranslation(fallback, currentLang);
    if (dict && dict !== fallback) return dict;
    return dynamic || fallback;
  };

  // Fetch issues
  useEffect(() => {
    setLoading(true);
    fetchIssues()
      .then((data) => setIssues(data))
      .catch((err) => console.error('Failed to fetch map issues:', err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  // Tab-switch rendering fix: invalidate size when tab becomes active
  useEffect(() => {
    if (isActive && mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Initialize Leaflet Map only once on container mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [11.0168, 76.9558],
      zoom: 13,
      zoomControl: true,
    });

    // High-performance Esri World Street Map CDN tiles (fast, zero API key required, no watermark)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
      maxZoom: 19,
      keepBuffer: 6,
      updateWhenIdle: false,
      updateWhenZooming: false,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (categoryFilter && issue.category !== categoryFilter) return false;
      if (priorityFilter && issue.priority !== priorityFilter) return false;
      if (statusFilter && issue.status !== statusFilter) return false;
      if (mapMode === 'heatmap' && (issue.status === 'Resolved' || issue.status === 'Rejected')) {
        return false; // Heatmap only shows active, unresolved hotspots
      }
      return true;
    });
  }, [issues, categoryFilter, priorityFilter, statusFilter, mapMode]);

  // Update map markers whenever mode or filtered issues change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markersMapRef.current.clear();

    if (mapMode === 'pins') {
      // Pin View Mode: High-visibility customized circular markers
      filteredIssues.forEach((issue) => {
        const lat = issue.latitude ?? 11.0168;
        const lng = issue.longitude ?? 76.9558;
        const color = getMarkerColor(issue);

        // Custom HTML Marker Pin
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="
              background-color: ${color};
              width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 13px;
              cursor: pointer;
              transition: transform 0.2s ease;
            ">
              ${issue.status === 'Resolved' ? '✓' : issue.priority === 'Critical' ? '!' : '•'}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14],
        });

        const marker = L.marker([lat, lng], { icon });

        const translatedStatus = translateStatus(issue.status, currentLang);
        const translatedDept = translateDepartment(issue.department, currentLang);
        const displayTitle = getTrans(issue.id, 'title', issue.title);
        const displayLoc = getTrans(issue.id, 'loc', issue.location);

        // Popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans text-xs space-y-2 min-w-[200px]';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between border-b pb-1.5 gap-2">
            <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">${issue.trackingId}</span>
            <span class="font-bold text-[10px] px-2 py-0.5 rounded-full" style="background-color: ${color}22; color: ${color}">${translatedStatus}</span>
          </div>
          <div class="font-bold text-gray-900 text-sm leading-snug">${displayTitle}</div>
          <div class="text-gray-500 text-[11px]">📍 ${displayLoc}</div>
          <div class="flex items-center justify-between text-[11px] pt-1">
            <span class="text-gray-600">🏢 ${translatedDept}</span>
            <span class="font-bold text-indigo-600">👍 ${issue.upvotes}</span>
          </div>
          ${(issue.citizenReportCount || 1) > 1 ? `<div class="bg-purple-50 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">👥 ${issue.citizenReportCount} Reports</div>` : ''}
          ${issue.slaBreached ? `<div class="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded">🚨 SLA Breached (+${issue.hoursOverdue || 12}h)</div>` : ''}
          <button id="btn-view-${issue.id}" class="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded text-center transition-colors">
            ${currentLang === 'ta' ? 'விவரங்களைக் காண்க →' : currentLang === 'hi' ? 'विवरण देखें →' : 'View Details & Timeline →'}
          </button>
        `;

        const viewBtn = popupContent.querySelector(`#btn-view-${issue.id}`);
        if (viewBtn) {
          viewBtn.addEventListener('click', () => {
            onOpenIssueDetail?.(issue);
          });
        }

        marker.bindPopup(popupContent);
        marker.addTo(layerGroup);
        markersMapRef.current.set(issue.id, marker);
      });
    } else {
      // Hotspot Heatmap Mode: Layered translucent canvas/circles weighted by priorityScore & citizen count
      filteredIssues.forEach((issue) => {
        const lat = issue.latitude ?? 11.0168;
        const lng = issue.longitude ?? 76.9558;
        const score = issue.priorityScore || 50;
        const count = issue.citizenReportCount || 1;
        const translatedDept = translateDepartment(issue.department, currentLang);
        const displayTitle = getTrans(issue.id, 'title', issue.title);
        const displayLoc = getTrans(issue.id, 'loc', issue.location);

        const hotspotHeader = currentLang === 'ta'
          ? `🔥 தீவிர பகுதி (${score}/100 முன்னுரிமை)`
          : currentLang === 'hi'
          ? `🔥 हॉटस्पॉट (${score}/100 प्राथमिकता)`
          : `🔥 Unresolved Hotspot (${score}/100 Priority)`;
        const reportsLabel = currentLang === 'ta' ? 'அறிக்கைகள்' : currentLang === 'hi' ? 'रिपोर्ट्स' : 'Reports';
        const deptLabel = currentLang === 'ta' ? 'துறை' : currentLang === 'hi' ? 'विभाग' : 'Dept';

        // Weight defines radius and intensity
        const radius = Math.min(220, Math.max(90, score * 1.8 + count * 15));
        const color = score >= 85 ? '#ef4444' : score >= 65 ? '#f97316' : '#eab308';
        const fillOpacity = score >= 85 ? 0.45 : score >= 65 ? 0.35 : 0.25;

        // Outer glow circle
        const outerCircle = L.circle([lat, lng], {
          radius: radius,
          color: color,
          weight: 1,
          opacity: 0.7,
          fillColor: color,
          fillOpacity: fillOpacity,
        });

        // Inner core circle
        const innerCircle = L.circle([lat, lng], {
          radius: radius * 0.35,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.7,
        });

        const popup = L.popup().setContent(`
          <div class="p-1 text-xs space-y-1">
            <div class="font-bold text-red-700">${hotspotHeader}</div>
            <div class="font-semibold text-gray-800">${displayTitle}</div>
            <div class="text-gray-500">📍 ${displayLoc}</div>
            <div class="text-[11px] text-gray-600">${reportsLabel}: <strong>${count}</strong> · ${deptLabel}: <strong>${translatedDept}</strong></div>
          </div>
        `);

        outerCircle.bindPopup(popup);
        outerCircle.addTo(layerGroup);
        innerCircle.addTo(layerGroup);
        markersMapRef.current.set(issue.id, outerCircle);
      });
    }
  }, [filteredIssues, mapMode, onOpenIssueDetail, currentLang, mapTransMap]);

  const handleFlyToIssue = (issue: Issue) => {
    const map = mapInstanceRef.current;
    if (!map || issue.latitude === undefined || issue.longitude === undefined) return;
    map.flyTo([issue.latitude, issue.longitude], 15, { duration: 1.2 });
    const marker = markersMapRef.current.get(issue.id);
    if (marker) {
      setTimeout(() => marker.openPopup(), 1250);
    }
  };

  // Locality recurring clusters / hotspots list
  const hotspotsList = useMemo(() => {
    return issues
      .filter((i) => i.status === 'Reported' || i.status === 'In Progress')
      .sort((a, b) => (b.priorityScore + (b.citizenReportCount || 1) * 10) - (a.priorityScore + (a.citizenReportCount || 1) * 10))
      .slice(0, 6);
  }, [issues]);

  return (
    <div className="space-y-4">
      {/* Top Controls & Map Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>🗺️</span> {currentLang === 'ta' ? 'நேரலை நகராட்சி வரைபடம்' : currentLang === 'hi' ? 'इंटरेक्टिव नागरिक समस्या मानचित्र' : 'Interactive Civic Issue Map'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {currentLang === 'ta'
                ? 'நகராட்சி பிரச்சினைகள் மற்றும் புகார்களின் நிகழ்நேர புவியியல் வரைபடம்'
                : currentLang === 'hi'
                ? 'रिपोर्ट की गई नागरिक समस्याओं और हॉटस्पॉट का लाइव भौगोलिक मानचित्र'
                : 'Live geographic visualization of reported civic hazards, recurring hotspots, and field progress'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 self-stretch md:self-auto justify-center">
            <button
              onClick={() => setMapMode('pins')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${mapMode === 'pins'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <span>{currentLang === 'ta' ? '📍 பின்கள்' : currentLang === 'hi' ? '📍 पिन दृश्य' : '📍 Pin View'}</span>
            </button>
            <button
              onClick={() => setMapMode('heatmap')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${mapMode === 'heatmap'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <span>{currentLang === 'ta' ? '🔥 தீவிர பகுதிகள்' : currentLang === 'hi' ? '🔥 हॉटस्पॉट' : '🔥 Hotspot Heatmap'}</span>
            </button>
          </div>
        </div>

        {/* Filters and Legend Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 outline-none"
            >
              <option value="">{currentLang === 'ta' ? 'பிரிவு: அனைத்தும்' : currentLang === 'hi' ? 'श्रेणी: सभी' : 'Category: All'}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_ICONS[c]} {translateCategory(c, currentLang)}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 outline-none"
            >
              <option value="">{currentLang === 'ta' ? 'முன்னுரிமை: அனைத்தும்' : currentLang === 'hi' ? 'प्राथमिकता: सभी' : 'Priority: All'}</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {translatePriority(p, currentLang)}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            {mapMode === 'pins' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 outline-none"
              >
                <option value="">{currentLang === 'ta' ? 'நிலை: அனைத்தும்' : currentLang === 'hi' ? 'स्थिति: सभी' : 'Status: All'}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {translateStatus(s, currentLang)}
                  </option>
                ))}
              </select>
            )}

            {(categoryFilter || priorityFilter || statusFilter) && (
              <button
                onClick={() => {
                  setCategoryFilter('');
                  setPriorityFilter('');
                  setStatusFilter('');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-1 cursor-pointer"
              >
                {currentLang === 'ta' ? 'மீட்டமை' : currentLang === 'hi' ? 'रीसेट' : 'Reset'}
              </button>
            )}
          </div>

          {/* Map Legend */}
          <div className="flex items-center gap-3 text-xs bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
            {mapMode === 'pins' ? (
              <>
                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> {translatePriority('Critical', currentLang)}
                </span>
                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> {translatePriority('High', currentLang)}
                </span>
                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> {translatePriority('Medium', currentLang)}
                </span>
                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> {translateStatus('Resolved', currentLang)}
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-gray-500 dark:text-slate-400 uppercase text-[10px]">Intensity:</span>
                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Moderate
                </span>
                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> High
                </span>
                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-pulse" /> Hotspot
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Map View + Locality Hotspots Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Map Container (9 cols) */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[1000]">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold text-sm">
                <span className="w-5 h-5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Loading map coordinates...
              </div>
            </div>
          )}
          <div
            ref={mapContainerRef}
            className="w-full h-[620px] z-0"
            style={{ background: '#f8fafc' }}
          />
        </div>

        {/* Locality Hotspots / Recurring Issues Sidebar (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>📍</span> {currentLang === 'ta' ? 'தீவிர பகுதிகள்' : currentLang === 'hi' ? 'सक्रिय समस्या क्षेत्र' : 'Active Problem Spots'}
            </h3>
            <span className="text-[11px] font-mono bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
              {hotspotsList.length} {currentLang === 'ta' ? 'செயலில்' : currentLang === 'hi' ? 'सक्रिय' : 'Active'}
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
            {currentLang === 'ta'
              ? 'தீவிர முன்னுரிமை மற்றும் மக்கள் புகார்கள் கொண்ட பிரச்சினைகள். பெரிதாக்க கிளிக் செய்யவும்.'
              : currentLang === 'hi'
              ? 'प्राथमिकता और सामुदायिक रिपोर्ट घनत्व के अनुसार नागरिक मुद्दे। ज़ूम करने के लिए क्लिक करें।'
              : 'Recurring unresolved civic issues ranked by priority score and community report density. Click any location to zoom.'}
          </p>

          <div className="space-y-2.5 max-h-[510px] overflow-y-auto pr-1">
            {hotspotsList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleFlyToIssue(item)}
                className="bg-gray-50 dark:bg-slate-800/80 hover:bg-indigo-50/60 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 rounded-lg p-3 cursor-pointer transition-all duration-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{item.trackingId}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${item.priority === 'Critical'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                        : item.priority === 'High'
                          ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                          : 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300'
                      }`}
                  >
                    {translatePriority(item.priority, currentLang)}
                  </span>
                </div>

                <div className="font-semibold text-gray-900 dark:text-slate-100 line-clamp-1">{getTrans(item.id, 'title', item.title)}</div>
                <div className="text-gray-500 dark:text-slate-400 truncate text-[11px]">📍 {getTrans(item.id, 'loc', item.location)}</div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60 dark:border-slate-700">
                  <span className="text-gray-600 dark:text-slate-400">🏢 {translateDepartment(item.department, currentLang)}</span>
                  {(item.citizenReportCount || 1) > 1 ? (
                    <span className="text-purple-700 dark:text-purple-400 font-bold">👥 {item.citizenReportCount} Reports</span>
                  ) : (
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">👍 {item.upvotes}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
