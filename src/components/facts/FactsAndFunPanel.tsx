import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaLightbulb, FaSyncAlt, FaExclamationCircle, FaCalendarAlt, FaGraduationCap,
} from 'react-icons/fa';
import { publicApi } from '@/services/api';
import FactCard from './FactCard';
import type { DailyFact, DailyFactsResponse, FactSubjectId } from '@/types/dailyFacts';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;
}

const toYMD = (d: Date) => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, '0'),
  String(d.getDate()).padStart(2, '0'),
].join('-');

function getUserGrade(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.grade) return u.grade;
    }
  } catch { /* ignore */ }
  return 'Class 5 / Grade 5';
}

function formatDisplayDate(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-IN', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function FactsAndFunPanel() {
  const gradeLabel = getUserGrade();
  const today = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<DailyFactsResponse | null>(null);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<FactSubjectId | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFacts = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await publicApi.getDailyFacts(dateStr, gradeLabel);
      if (res.success && res.facts?.length) {
        setData(res);
      } else {
        setError(res.message || 'No facts available for this day.');
        setData(null);
      }
    } catch {
      setError('Could not load facts. Check your connection.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => {
    loadFacts(selectedDate);
  }, [selectedDate, loadFacts]);

  useEffect(() => {
    publicApi.getDailyFactsDates(gradeLabel).then((res) => {
      if (res.success) setArchiveDates(res.dates);
    });
  }, [gradeLabel]);

  const subjects = data?.subjects || [];
  const filtered = useMemo(() => {
    const facts = data?.facts || [];
    if (subjectFilter === 'all') return facts;
    return facts.filter((f) => f.subject === subjectFilter);
  }, [data, subjectFilter]);

  const subjectMap = useMemo(() => {
    const m = new Map<string, (typeof subjects)[0]>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  return (
    <div className="space-y-6">
      <section className="p-5 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <FaLightbulb className="w-6 h-6" aria-hidden />
              10 facts for your class today
            </h2>
            <p className="text-sm text-orange-100 mt-1 max-w-xl">
              Science, geography, history, India, sports &amp; more — matched to your grade, saved once per day.
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold bg-white/20 rounded-lg px-3 py-1.5">
              <FaGraduationCap aria-hidden />
              {gradeLabel}
              {data?.cached && <span className="opacity-80">· loaded from saved edition</span>}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wide text-orange-100">Pick a day</label>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-gray-900 text-sm font-medium"
            />
          </div>
        </div>
      </section>

      {archiveDates.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center">
          <FaCalendarAlt className="w-4 h-4 text-gray-400" aria-hidden />
          <span className="text-xs font-bold text-gray-500 uppercase">Earlier editions:</span>
          {archiveDates.slice(0, 14).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`text-xs px-3 py-1 rounded-full border font-semibold transition-colors ${
                d === selectedDate
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {d === today ? 'Today' : new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500">{formatDisplayDate(selectedDate)}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubjectFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-bold border ${
            subjectFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          All areas
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSubjectFilter(s.id as FactSubjectId)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold border ${
              subjectFilter === s.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white rounded-2xl border">
          <FaExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-3">{error}</p>
          <button
            type="button"
            onClick={() => loadFacts(selectedDate)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold"
          >
            <FaSyncAlt className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fact: DailyFact, i: number) => (
            <FactCard
              key={fact.id}
              fact={fact}
              subjectMeta={subjectMap.get(fact.subject)}
              index={data?.facts?.indexOf(fact) ?? i}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <p className="text-center text-gray-500 py-8">No facts in this area for the selected day.</p>
      )}
    </div>
  );
}
