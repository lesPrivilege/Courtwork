import { useEffect, useState } from 'react';

/**
 * 两枚视口断点查询。
 *
 * **过手即拆**（`PI-LANE-UI-1` 触碰 `App.tsx` 时按纪律外提）：断点数值与三区布局语义相关，
 * 但这两枚 hook 本身与 App 状态无关，逐字节移出，行为一字未改。
 */
export function useWideSplitAvailable() {
  const [available, setAvailable] = useState(() => window.innerWidth >= 1600);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1600px)');
    const update = () => setAvailable(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return available;
}

export function useNarrowRailRequired() {
  const [required, setRequired] = useState(() => window.innerWidth < 1240);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1239px)');
    const update = () => setRequired(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return required;
}