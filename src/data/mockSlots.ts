export interface MockSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

const DAYS_AHEAD = 14;
const SLOT_DURATION = 45;

function generateDates(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

const START = timeToMinutes("09:00");
const END = timeToMinutes("20:00");

export function generateMockSlotsForDate(date: string): MockSlot[] {
  const slots: MockSlot[] = [];
  const day = new Date(date + "T12:00:00").getDay();
  const isWeekend = day === 5 || day === 0;
  let id = 0;
  for (let min = START; min + SLOT_DURATION <= END; min += SLOT_DURATION) {
    const startTime = minutesToTime(min);
    const endTime = minutesToTime(min + SLOT_DURATION);
    const available = !isWeekend && Math.random() > 0.35;
    slots.push({
      id: `slot-${date}-${id++}`,
      date,
      startTime,
      endTime,
      available,
    });
  }
  return slots;
}

export function getMockSlotsForWeek(startDate: string): MockSlot[] {
  const dates = generateDates().slice(0, 7);
  return dates.flatMap((d) => generateMockSlotsForDate(d));
}

export const MOCK_DATES_WEEK: string[] = (() => {
  const d = new Date();
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
})();
