import { useEffect, useState } from 'react';

function calculateColumns() {
  const width = window.innerWidth;
  if (width >= 1024) return 3;
  if (width >= 480) return 2;
  return 2;
}

export function useColumns() {
  const [columns, setColumns] = useState(calculateColumns);

  useEffect(() => {
    const onResize = () => setColumns(calculateColumns());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return columns;
}
