export function formatNumberShort(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

export function parseDurationToDecimalHours(durationString: any): number | null {
  // Check if input is null, undefined, or not a string
  if (durationString === null || durationString === undefined) {
    return null;
  }

  // Convert to string if it's not already a string
  const timeStr = String(durationString);
  if (!timeStr || timeStr.trim() === '') {
    return null;
  }

  // Split the time string and convert parts to numbers
  const parts = timeStr.split(':').map(n => parseInt(n, 10));
  if (parts.some(isNaN)) { return null; }

  if (parts.length === 2) {
    return parts[0] + (parts[1] / 60);
  } else if (parts.length === 3) {
    return parts[0] + (parts[1] / 60) + (parts[2] / 3600);
  }

  return null;
}

export function formatDecimalHoursToTime(decimalHours: number | null): string {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
    return '';
  }

  const isNegative = decimalHours < 0;
  const absHours = Math.abs(decimalHours);
  const hours = Math.floor(absHours);
  const minutes = Math.round((absHours - hours) * 60);

  let adjustedHours = hours;
  let adjustedMinutes = minutes;

  if (adjustedMinutes === 60) {
    adjustedHours += 1;
    adjustedMinutes = 0;
  }

  const formattedHours = adjustedHours.toString().padStart(2, '0');
  const formattedMinutes = adjustedMinutes.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}${formattedHours}:${formattedMinutes}`;
}