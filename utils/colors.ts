
export interface ColorDef {
  name: string;
  value: string; // bg-blue-500
  lightBg: string; // bg-blue-50
  border: string; // border-blue-200
}

export const COLORS_LIST: ColorDef[] = [
  { name: 'Blue', value: 'bg-blue-500', lightBg: 'bg-blue-50', border: 'border-blue-200' },
  { name: 'Green', value: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-200' },
  { name: 'Red', value: 'bg-red-500', lightBg: 'bg-red-50', border: 'border-red-200' },
  { name: 'Yellow', value: 'bg-amber-500', lightBg: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'Purple', value: 'bg-purple-500', lightBg: 'bg-purple-50', border: 'border-purple-200' },
  { name: 'Pink', value: 'bg-pink-500', lightBg: 'bg-pink-50', border: 'border-pink-200' },
  { name: 'Gray', value: 'bg-slate-500', lightBg: 'bg-slate-50', border: 'border-slate-200' },
];

export const getColorDef = (colorClass?: string): ColorDef => {
  return COLORS_LIST.find(c => c.value === colorClass) || COLORS_LIST[0];
};
