/**
 * Tracks the local calendar day and updates after midnight so daily content refreshes.
 */
import { useEffect, useRef, useState } from 'react';
import { msUntilNextLocalMidnight, toYMD } from '@/utils/calendarDay';

export function useCalendarDay(): string {
  const [day, setDay] = useState(() => toYMD(new Date()));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        setDay(toYMD(new Date()));
        schedule();
      }, msUntilNextLocalMidnight());
    };
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return day;
}
