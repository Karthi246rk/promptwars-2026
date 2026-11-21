import { useState, useRef, useEffect } from 'react';
import type { Issue, CitizenProfile } from '../types';
import { createIssue } from '../api';
import type { Language } from '../i18n';
import { translations, translateCategory } from '../i18n';
import { downloadCasePdf } from '../utils/pdfExport';
import SubmissionSuccessModal from './SubmissionSuccessModal';

const CATEGORIES = [
  'Road & Potholes',
  'Water Leakage & Supply',
  'Garbage & Sanitation',
  'Streetlights & Power',
  'Public Safety',
  'Other',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Road & Potholes': '🛣️',
  'Water Leakage & Supply': '💧',
  'Garbage & Sanitation': '🗑️',
  'Streetlights & Power': '💡',
  'Public Safety': '🛡️',
  'Other': '📋',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};

const PRIORITY_BAR_COLORS: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-green-500',
};

interface Props {
  onSwitchTab: (tab: 'report' | 'tracker' | 'map' | 'admin') => void;
  onIssueCreated?: () => void;
  currentLang?: Language;
  currentCitizen?: CitizenProfile | null;
}

export default function ReportIssue({ onSwitchTab, onIssueCreated, currentLang = 'en', currentCitizen }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [citizenName, setCitizenName] = useState(currentCitizen?.name || '');
  const [reporterContact, setReporterContact] = useState(currentCitizen?.mobile || currentCitizen?.email || '');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Issue | null>(null);
  const [confirmationModalIssue, setConfirmationModalIssue] = useState<Issue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with logged-in citizen
  useEffect(() => {
    if (currentCitizen) {
      if (!citizenName) setCitizenName(currentCitizen.name);
      if (!reporterContact) setReporterContact(currentCitizen.mobile || currentCitizen.email);
    }
  }, [currentCitizen]);

  // Voice Dictation & Text-to-Speech State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const t = translations[currentLang];

  // Voice Dictation using Web Speech API (en-IN, ta-IN, hi-IN)
  const handleToggleSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome, Edge, or a compatible browser.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Select language for Indian subcontinent
      if (currentLang === 'ta') {
        recognition.lang = 'ta-IN';
      } else if (currentLang === 'hi') {
        recognition.lang = 'hi-IN';
      } else {
        recognition.lang = 'en-IN';
      }

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript) {
          setDescription((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  // Text to Speech using SpeechSynthesis
  const handleToggleTts = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported by your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (currentLang === 'ta') {
      utterance.lang = 'ta-IN';
    } else if (currentLang === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleFilesSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (images.length + fileArray.length > 5) {
      setError('You can upload a maximum of 5 photos.');
      return;
    }

    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    const newImages: File[] = [];

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 10MB limit. Please upload a smaller file.`);
        return;
      }
      if (!validMimes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
        setError(`"${file.name}" is not a supported image. Please upload PNG, JPG, WebP, or GIF.`);
        return;
      }
      newImages.push(file);
    }

    Promise.all(
      newImages.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(f);
          })
      )
    ).then((urls) => {
      setImages((prev) => [...prev, ...newImages]);
      setImagePreviews((prev) => [...prev, ...urls]);
      setError(null);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setLocation(`${lat}, ${lng}`);
        setGeoLoading(false);
        setError(null);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.length < 3 || description.length < 10 || !location) return;

    if (images.length === 0) {
      setError('Photo evidence is compulsory under municipal bylaws. Please upload at least 1 photo.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', location);
    if (latitude !== undefined) formData.append('latitude', String(latitude));
    if (longitude !== undefined) formData.append('longitude', String(longitude));
    if (citizenName.trim()) formData.append('citizenName', citizenName.trim());
    if (reporterContact.trim()) {
      formData.append('reporterContact', reporterContact.trim());
      formData.append('citizenContact', reporterContact.trim());
    }
    if (category) formData.append('category', category);
    
    // Multiple photos
    images.forEach((img) => {
      formData.append('images', img);
    });
    // First image for legacy / backwards compatibility
    if (images[0]) {
      formData.append('image', images[0]);
    }

    try {
      const created = await createIssue(formData);
      setResult(created);
      setConfirmationModalIssue(created);
      onIssueCreated?.();
      setTitle('');
      setDescription('');
      setLocation('');
      setLatitude(undefined);
      setLongitude(undefined);
      setCategory('');
      setImages([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.reportHeader}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm lg:text-base">
          {t.reportSub}
        </p>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Submission Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Civic Responsibility Notice */}
          <div className="bg-slate-50 dark:bg-amber-950/40 border border-slate-200 dark:border-amber-800 rounded-xl p-3.5 text-xs text-slate-700 dark:text-amber-200 flex items-start gap-2.5">
            <span className="text-base shrink-0">⚖️</span>
            <div>
              <span className="font-semibold text-slate-900 dark:text-amber-100">Civic Responsibility Notice:</span> Under municipal governance bylaws, complaints are geo-verified. Verified false or prank reports incur escalating warnings, municipal misuse fines (₹500 / ₹1,500), and portal suspension.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 p-6 space-y-5 dark:text-slate-100">
            {result && (
              <div
                className={`border rounded-lg p-4 flex items-center justify-between text-sm animate-fadeIn ${
                  result.consolidated
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-green-50 border-green-200 text-green-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{result.consolidated ? '👥' : '✅'}</span>
                  <div>
                    {result.consolidated ? (
                      <div>
                        <span className="font-bold">Auto-Consolidated with Existing Ticket!</span> Tracking ID:{' '}
                        <span className="font-mono font-bold text-amber-950">{result.trackingId}</span>
                        <div className="text-xs text-amber-800 mt-0.5">
                          Multiple citizens have reported this issue ({result.citizenReportCount || 2} reports total). Priority has been boosted!
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold">Case File logged successfully!</span> Tracking ID:{' '}
                        <span className="font-mono font-bold text-green-900">{result.trackingId}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="text-xs text-gray-500 hover:text-gray-900 underline font-medium ml-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t.titleLabel} <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
                required
                minLength={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm"
              />
              {title.length > 0 && title.length < 3 && (
                <p className="text-xs text-red-500 mt-1">Title must be at least 3 characters</p>
              )}
            </div>

            {/* Description with Voice Dictation Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t.descLabel} <span className="text-red-500">*</span>
                </label>
                {/* Voice-based Complaint Submission */}
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                  }`}
                  title="Dictate complaint in English, Tamil, or Hindi using Web Speech API"
                >
                  <span>{isListening ? '🔴' : '🎤'}</span>
                  <span>{isListening ? t.listening : t.speakBtn}</span>
                </button>
              </div>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descPlaceholder}
                required
                minLength={10}
                rows={4}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm resize-none"
              />
              {description.length > 0 && description.length < 10 && (
                <p className="text-xs text-red-500 mt-1">Description must be at least 10 characters</p>
              )}
            </div>

            {/* Location with Geolocation */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t.locationLabel} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    const match = e.target.value.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                    if (match) {
                      setLatitude(parseFloat(match[1]));
                      setLongitude(parseFloat(match[2]));
                    }
                  }}
                  placeholder={t.locationPlaceholder}
                  required
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={geoLoading}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-sm rounded-lg transition-all duration-200 border border-gray-300 dark:border-slate-700 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                  title="Detect GPS coordinates from browser"
                >
                  {geoLoading ? (
                    <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '📍'
                  )}
                  <span className="hidden sm:inline text-xs font-medium">Use My Location</span>
                </button>
              </div>
              {latitude !== undefined && longitude !== undefined && (
                <p className="text-[11px] text-green-700 dark:text-green-400 mt-1 font-mono">
                  ✓ GPS Coordinates locked: {latitude}, {longitude}
                </p>
              )}
            </div>

            {/* Citizen Name & Contact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="citizenName" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t.citizenNameLabel} <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="citizenName"
                  type="text"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  placeholder="e.g., R. Anantharaman"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm"
                />
              </div>

              <div>
                <label htmlFor="reporterContact" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t.citizenContactLabel}
                </label>
                <input
                  id="reporterContact"
                  type="text"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  placeholder="+91 98401 23456 or email"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t.categoryLabel}
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm"
              >
                <option value="">Auto-Detect Category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {translateCategory(cat, currentLang)}
                  </option>
                ))}
              </select>
            </div>

            {/* Photo Upload: Multi-Photo (1 Mandatory, up to 5 photos) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  📸 Photo Evidence <span className="text-red-500 font-bold">*</span>{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(1 Compulsory, up to 5 photos)</span>
                </label>
                <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                  {images.length}/5 uploaded
                </span>
              </div>

              {/* Uploaded Thumbnails Grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative group rounded-lg overflow-hidden border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 aspect-square shadow-2xs"
                    >
                      <img
                        src={preview}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Dropzone (show if fewer than 5 photos) */}
              {images.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                      : images.length > 0
                      ? 'border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelect(e.target.files);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-1 py-1">
                    <span className="text-2xl">📸</span>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {images.length === 0
                        ? 'Upload photo proof (compulsory) · Click or drag photos here'
                        : `Add more photos (${5 - images.length} remaining)`}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-400">
                      Up to 10MB each · JPG, PNG, WebP · Analyzed by Gemini AI Vision for verification
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2 animate-fadeIn">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || title.length < 3 || description.length < 10 || !location}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 text-sm shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.submittingBtn}
                </>
              ) : (
                <>{t.submitBtn}</>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Sleek Gemini AI Triage Panel (5 cols) */}
        <div className="lg:col-span-5 sticky top-24">
          {!result ? (
            /* Explanatory 3-step AI pipeline before submission */
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-xl shadow-lg p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-indigo-700/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">✨</span>
                  <div>
                    <h3 className="font-bold text-base tracking-wide text-white">How Your Report Is Processed</h3>
                    <p className="text-xs text-indigo-200">Instant verification, priority scoring, and direct department dispatch</p>
                  </div>
                </div>
              </div>

              {/* 3-Step Pipeline */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-1 hover:bg-white/10 transition-colors duration-200">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                    <span>👁️ Step 1</span>
                    <span className="text-gray-400">·</span>
                    <span>Multimodal Intake & Vision</span>
                  </div>
                  <p className="text-xs text-indigo-100 leading-relaxed">
                    Processes citizen descriptions and uploaded scene photos using Gemini multimodal vision to detect damage severity, hazards, and infrastructure context.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-1 hover:bg-white/10 transition-colors duration-200">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                    <span>⚡ Step 2</span>
                    <span className="text-gray-400">·</span>
                    <span>Severity Scoring & Duplicate Check</span>
                  </div>
                  <p className="text-xs text-indigo-100 leading-relaxed">
                    Calculates a dynamic 1–100 priority score, scans nearby ward radius (500m) for existing open issues, and auto-consolidates public impact.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-1 hover:bg-white/10 transition-colors duration-200">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                    <span>🏢 Step 3</span>
                    <span className="text-gray-400">·</span>
                    <span>Automated Municipal Routing</span>
                  </div>
                  <p className="text-xs text-indigo-100 leading-relaxed">
                    Directs the ticket to the exact municipal department with field action plan, SLA deadline, and auto-escalation tracking.
                  </p>
                </div>
              </div>

              {/* Citizen-Friendly Engine Badges */}
              <div className="pt-2 border-t border-indigo-700/60">
                <div className="flex flex-wrap gap-2 text-[11px] text-indigo-200">
                  <span className="bg-white/10 px-2.5 py-1 rounded-full font-medium">✓ Multimodal Photo Analysis</span>
                  <span className="bg-white/10 px-2.5 py-1 rounded-full font-medium">✓ Instant Priority Scoring</span>
                  <span className="bg-white/10 px-2.5 py-1 rounded-full font-medium">✓ Direct Department Routing</span>
                </div>
              </div>
            </div>
          ) : (
            /* Live AI Triage Result Card immediately after submission */
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slideUp">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{result.consolidated ? '👥' : '✅'}</span>
                    <h3 className="font-bold text-base">
                      {result.consolidated ? 'Consolidated Work Order' : 'AI Triage Complete'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">
                    {result.trackingId}
                  </span>
                </div>
                <p className="text-indigo-100 text-xs mt-1">
                  {result.consolidated
                    ? 'Merged with active municipal ticket to boost priority'
                    : 'Ticket dispatched to municipal authorities'}
                </p>
              </div>

              <div className="p-5 space-y-4">
                {result.consolidated && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
                    <span className="font-bold block">👥 {result.citizenReportCount || 2} Citizen Reports Consolidated</span>
                    This issue was already reported nearby. Your details were merged with work order <strong>{result.trackingId}</strong> and its priority was increased!
                  </div>
                )}

                {/* Category & Priority Row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                    <span>{CATEGORY_ICONS[result.category] || '📋'}</span>
                    <span className="text-xs font-semibold text-gray-700">{result.category}</span>
                  </div>
                  <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${PRIORITY_COLORS[result.priority] || 'bg-gray-100'}`}>
                    {result.priority} Priority ({result.priorityScore}/100)
                  </div>
                </div>

                {/* Priority Score Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Calculated Urgency Score</span>
                    <span className="font-bold text-gray-800">{result.priorityScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${PRIORITY_BAR_COLORS[result.priority] || 'bg-gray-500'}`}
                      style={{ width: `${result.priorityScore}%` }}
                    />
                  </div>
                </div>

                {/* Impact Reasoning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-1">Impact Assessment</h4>
                  <p className="text-xs text-amber-900 leading-relaxed">{result.impactReasoning}</p>
                </div>

                {/* Department */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide block mb-1">Assigned Department</span>
                  <p className="text-xs font-semibold text-blue-900">🏢 {result.department}</p>
                </div>

                {/* AI Summary */}
                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Executive Summary</h4>
                  <p className="text-xs text-gray-700 leading-relaxed">{result.aiSummary}</p>
                </div>

                {/* Recommended Field Action */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-[11px] font-bold text-green-800 uppercase tracking-wide mb-1">Field Action Plan</h4>
                  <p className="text-xs text-green-900 leading-relaxed">{result.recommendedAction}</p>
                </div>

                {/* Resolution ETA & SLA */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>⏱️ SLA Target: <strong>{result.slaTargetHours || result.estimatedResolutionHours}h</strong></span>
                  <span className="text-[11px]">Model: {result.modelUsed}</span>
                </div>

                {/* Voice & PDF Export Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleTts(
                        `${result.title}. ${result.aiSummary}. Assigned to ${result.department}. Recommended action: ${result.recommendedAction}`
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSpeaking
                        ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    }`}
                    title="Read assessment aloud via Web Speech Synthesis"
                  >
                    <span>{isSpeaking ? '⏹️' : '🔊'}</span>
                    <span>{isSpeaking ? t.stopVoiceBtn : t.readAloudBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadCasePdf(result)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
                    title="Generate and download official municipal case report PDF"
                  >
                    <span>📄</span>
                    <span>{t.downloadPdfBtn}</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onSwitchTab('tracker')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2.5 px-3 rounded-lg transition-all duration-200 text-center"
                  >
                    View in Issue Tracker →
                  </button>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2.5 px-3 rounded-lg transition-all duration-200 text-center"
                  >
                    Report Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Encouraging Post-Submission Confirmation Pop-Up Modal */}
      <SubmissionSuccessModal
        isOpen={!!confirmationModalIssue}
        issue={confirmationModalIssue}
        onClose={() => setConfirmationModalIssue(null)}
        onTrack={() => {
          setConfirmationModalIssue(null);
          onSwitchTab('tracker');
        }}
        currentLang={currentLang}
      />
    </div>
  );
}
