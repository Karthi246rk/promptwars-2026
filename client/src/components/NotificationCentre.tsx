import { useState, useEffect } from 'react';
import type { CivicNotification } from '../types';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteNotificationsBatch,
} from '../api';
import type { Language } from '../i18n';
import { translations } from '../i18n';

interface NotificationCentreProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onNotificationCountChange?: (unreadCount: number) => void;
  onSelectCase?: (caseId: string) => void;
}

export default function NotificationCentre({
  isOpen,
  onClose,
  currentLang,
  onNotificationCountChange,
  onSelectCase,
}: NotificationCentreProps) {
  const [notifications, setNotifications] = useState<CivicNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const t = translations[currentLang];

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      const unread = data.filter((n) => n.status === 'unread').length;
      if (onNotificationCountChange) onNotificationCountChange(unread);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      const unread = notifications.filter((n) => (n.id === id ? false : n.status === 'unread')).length;
      if (onNotificationCountChange) onNotificationCountChange(unread);
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
      if (onNotificationCountChange) onNotificationCountChange(0);
    } catch {
      // silent
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredItems: CivicNotification[]) => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((n) => n.id));
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      const remaining = notifications.filter((n) => n.id !== id);
      const unread = remaining.filter((n) => n.status === 'unread').length;
      if (onNotificationCountChange) onNotificationCountChange(unread);
    } catch {
      // silent
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await deleteNotificationsBatch(selectedIds);
      const idSet = new Set(selectedIds);
      setNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
      const remaining = notifications.filter((n) => !idSet.has(n.id));
      setSelectedIds([]);
      const unread = remaining.filter((n) => n.status === 'unread').length;
      if (onNotificationCountChange) onNotificationCountChange(unread);
    } catch {
      // silent
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;
  const filteredNotifs = filter === 'unread' ? notifications.filter((n) => n.status === 'unread') : notifications;
  const allFilteredSelected = filteredNotifs.length > 0 && selectedIds.length === filteredNotifs.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-slideLeft">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔔</span>
              <div>
                <h3 className="font-bold text-base leading-tight flex items-center gap-2">
                  <span>{t.notificationsTitle}</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-300">Live multi-channel municipal grievance alerts (Max 50 FIFO)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                  filter === 'unread'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer text-[11px]"
                >
                  {t.markAllReadBtn}
                </button>
              )}

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>🗑️</span> {t.deleteSelected} ({selectedIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Select All Sub-bar */}
          {filteredNotifs.length > 0 && (
            <div className="px-4 py-1.5 bg-slate-100/70 border-b border-gray-200 flex items-center justify-between text-[11px] text-gray-600">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={() => handleSelectAll(filteredNotifs)}
                  className="rounded text-indigo-600 cursor-pointer"
                />
                <span>{t.selectAll}</span>
              </label>
              <span>{selectedIds.length} / {filteredNotifs.length} selected</span>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 sm:p-3 space-y-2">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-sm font-medium">{t.noNotifications}</p>
                <p className="text-xs text-gray-400 mt-1">
                  You will receive real-time alerts whenever complaints are assigned, updated, or resolved.
                </p>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const isUnread = notif.status === 'unread';
                const isSelected = selectedIds.includes(notif.id);
                const channelBadge =
                  notif.channel === 'Email'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : notif.channel === 'SMS'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (isUnread) handleMarkRead(notif.id);
                      if (onSelectCase && notif.caseId) {
                        onSelectCase(notif.caseId);
                        onClose();
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-start ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                        : isUnread
                        ? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/70 shadow-xs'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div
                      className="pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(notif.id)}
                        className="rounded text-indigo-600 cursor-pointer w-4 h-4"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Channel Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${channelBadge}`}>
                            {notif.channel === 'Email'
                              ? `📧 ${t.channelEmail}`
                              : notif.channel === 'SMS'
                              ? `📱 ${t.channelSms}`
                              : `🔔 ${t.channelInApp}`}
                          </span>

                          {/* Case ID */}
                          {notif.caseId && (
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                              {notif.caseId}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Timestamp */}
                          <span className="text-[10px] text-gray-400">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {/* Quick Delete Single Notification Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingle(notif.id);
                            }}
                            title="Delete this notification"
                            className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors cursor-pointer text-xs leading-none"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <h4 className={`text-xs ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                        <span>{new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        {isUnread && (
                          <span className="text-indigo-600 font-bold hover:underline">
                            Tap to mark read & view
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-[11px] text-gray-500">
            Powered by CivicResolve Automated Dispatch & Citizen SMS/Email Relay
          </div>
        </div>
      </div>
    </div>
  );
}
