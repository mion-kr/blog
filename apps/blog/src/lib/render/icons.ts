import type { Element } from 'hast';

// lucide-react 아이콘의 SVG(이관 전 렌더 결과와 같은 마크업)
const svg = (name: string, children: Element['children'], extraClass = ''): Element => ({
  type: 'element',
  tagName: 'svg',
  properties: {
    xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: `lucide lucide-${name}${extraClass}`, ariaHidden: 'true',
  },
  children,
});
const el = (tagName: string, properties: Element['properties']): Element => ({ type: 'element', tagName, properties, children: [] });
const circle = () => el('circle', { cx: '12', cy: '12', r: '10' });
const path = (d: string) => el('path', { d });

export const icons = {
  info: () => svg('info', [circle(), path('M12 16v-4'), path('M12 8h.01')]),
  warning: () => svg('triangle-alert', [path('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'), path('M12 9v4'), path('M12 17h.01')]),
  error: () => svg('circle-x', [circle(), path('m15 9-6 6'), path('m9 9 6 6')]),
  success: () => svg('circle-check', [circle(), path('m9 12 2 2 4-4')]),
  external: () => svg('external-link', [path('M15 3h6v6'), path('M10 14 21 3'), path('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6')], ' ml-1 h-3 w-3'),
};
