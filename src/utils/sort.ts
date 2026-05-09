import { getTimestampMs, type DateInput } from '@utils/datetime';

export const natsort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export const compareDateDesc = <T>(getDate: (item: T) => DateInput | null | undefined) => {
  return (a: T, b: T) => {
    const at = getTimestampMs(getDate(a)) ?? 0;
    const bt = getTimestampMs(getDate(b)) ?? 0;
    return bt - at;
  };
};
