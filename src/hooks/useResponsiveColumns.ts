import { useEffect, useState } from 'react';

function getColumns() {
  const width = window.innerWidth;
  if (width >= 1280) return 4;
  if (width >= 768) return 3;
  return 2;
}

export function useResponsiveColumns() {
  const [columns, setColumns] = useState<number>(getColumns);
  useEffect(() => {
    const onResize = () => setColumns(getColumns());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return columns;
}
