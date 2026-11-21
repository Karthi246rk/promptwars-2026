import { useState, useEffect } from 'react';
import type { HelplinesData } from '../types';
import { fetchHelplines } from '../api';

interface HelplineModalProps {
  isOpen: boolean;
  onClose: () => void;
  isServerOffline?: boolean;
}

const DEFAULT_HELPLINES: HelplinesData = {
  emergencyControlRoom: {
    name: 'Municipal Administration (24x7 Control Room)',
    tollFree: '1800-425-7000',
    directPhone: '+91 44 2538 4520',
    operationalHours: '24 Hours / 7 Days',
  },
  departments: [
    {
      department: 'Public Works Department',
      scope: 'Roads, Potholes, Bridges, Footpaths & Civil Works',
      tollFree: '1800-425-7001',
      icon: '🛣️',
    },
    {
      department: 'Water Supply Department',
      scope: 'Pipeline Bursts, Water Contamination, Sewers & Drainage',
      tollFree: '1800-425-7002',
      icon: '💧',
    },
    {
      department: 'Electricity Department',
      scope: 'Streetlights, Transformers, Power Outages & Electrical Hazards',
      tollFree: '1800-425-7003',
      icon: '💡',
    },
    {
      department: 'Sanitation Department',
      scope: 'Garbage Dumps, Waste Compaction, Public Urinals & Vector Control',
      tollFree: '1800-425-7004',
      icon: '🗑️',
    },
    {
      department: 'Municipal Administration',
      scope: 'Citizen Grievances, RTI, Birth/Death Certificates & Governance',
      tollFree: '1800-425-7000',
      icon: '🏛️',
    },
  ],
};

export default function HelplineModal({ isOpen, onClose, isServerOffline }: HelplineModalProps) {
  const [data, setData] = useState<HelplinesData>(DEFAULT_HELPLINES);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHelplines()
        .then(setData)
        .catch(() => setData(DEFAULT_HELPLINES));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (num: string) => {
    navigator.clipboard?.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-gray-200 dark:border-slate-800 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">
              📞
            </div>
            <div>
              <h3 className="text-base font-bold">Municipal Department Helplines</h3>
              <p className="text-indigo-200 text-xs">
                Direct toll-free lines for immediate offline reporting & citizen assistance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Offline Alert if server is offline */}
        {isServerOffline && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <span className="text-base">⚠️</span>
            <div>
              <strong>Emergency Offline Notice:</strong> Digital submission server is currently unreachable. Please use the direct department phone lines below for immediate assistance.
            </div>
          </div>
        )}

        {/* 24x7 Control Room Banner */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  24x7 Emergency
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {data.emergencyControlRoom.name}
                </span>
              </div>
              <div className="text-xl font-mono font-black text-red-700 dark:text-red-400 mt-1">
                {data.emergencyControlRoom.tollFree}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-slate-400">
                Direct Hotline: {data.emergencyControlRoom.directPhone} · {data.emergencyControlRoom.operationalHours}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`tel:${data.emergencyControlRoom.tollFree}`}
                className="flex-1 sm:flex-none text-center bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs"
              >
                Call Now
              </a>
              <button
                type="button"
                onClick={() => handleCopy(data.emergencyControlRoom.tollFree)}
                className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700 text-xs px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                title="Copy phone number"
              >
                {copiedNumber === data.emergencyControlRoom.tollFree ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Department Directory List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
              Official Department Toll-Free Directory
            </h4>

            {data.departments.map((dept) => (
              <div
                key={dept.department}
                className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/70 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{dept.icon}</span>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                      {dept.department}
                    </h5>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {dept.scope}
                    </p>
                    <div className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-400 mt-1">
                      {dept.tollFree}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:${dept.tollFree}`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                  >
                    Call
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(dept.tollFree)}
                    className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copiedNumber === dept.tollFree ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-200 dark:border-slate-800 text-center text-[11px] text-gray-500 dark:text-slate-400">
          Toll-free numbers are accessible across all mobile and landline networks in India without call charges.
        </div>
      </div>
    </div>
  );
}
