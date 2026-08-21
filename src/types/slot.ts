/** A bookable availability slot as returned by /api/teachers/[id]/availability. */
export interface SlotView {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}
