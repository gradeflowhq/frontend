export const natsort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export const compareDateDesc = <T>(getDate: (item: T) => string | number | Date | null | undefined) => {
  return (a: T, b: T) => {
    const av = getDate(a);
    const bv = getDate(b);
    const at = av ? new Date(av).getTime() : 0;
    const bt = bv ? new Date(bv).getTime() : 0;
    return bt - at;
  };
};
