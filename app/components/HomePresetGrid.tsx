import type { HomePreset } from '@/lib/homePresets';
import HomePresetCard from './HomePresetCard';

export default function HomePresetGrid({ presets }: { presets: HomePreset[] }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
      {presets.map((preset) => (
        <HomePresetCard key={preset.id} preset={preset} />
      ))}
    </div>
  );
}
