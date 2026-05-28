// Renders a mock manga page panel layout using SVG
const LAYOUTS = [
  // Layout 0: 3-panel vertical split + large bottom
  (
    <svg viewBox="0 0 180 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="240" fill="#F0EBE0" />
      <rect x="2" y="2" width="85" height="95" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="93" y="2" width="85" height="95" fill="#E8E8E8" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="2" y="103" width="176" height="135" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      {/* simple figure silhouette */}
      <ellipse cx="140" cy="155" rx="12" ry="16" fill="#D8D3C8" />
      <rect x="130" y="172" width="20" height="35" rx="4" fill="#D8D3C8" />
      <line x1="20" y1="30" x2="75" y2="30" stroke="#D8D3C8" strokeWidth="1" />
      <line x1="20" y1="40" x2="65" y2="40" stroke="#D8D3C8" strokeWidth="1" />
    </svg>
  ),
  // Layout 1: large top + 2-panel bottom row
  (
    <svg viewBox="0 0 180 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="240" fill="#F0EBE0" />
      <rect x="2" y="2" width="176" height="140" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="2" y="148" width="84" height="90" fill="#E8E8E8" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="92" y="148" width="86" height="90" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      {/* figure in top panel */}
      <ellipse cx="90" cy="55" rx="18" ry="22" fill="#D8D3C8" />
      <rect x="74" y="78" width="32" height="50" rx="5" fill="#D8D3C8" />
      {/* action lines */}
      <line x1="20" y1="70" x2="60" y2="60" stroke="#9CA3AF" strokeWidth="0.8" />
      <line x1="15" y1="85" x2="55" y2="78" stroke="#9CA3AF" strokeWidth="0.8" />
    </svg>
  ),
  // Layout 2: diagonal 4-panel
  (
    <svg viewBox="0 0 180 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="240" fill="#F0EBE0" />
      <rect x="2" y="2" width="100" height="70" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="108" y="2" width="70" height="70" fill="#E8E8E8" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="2" y="78" width="176" height="80" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="2" y="164" width="80" height="74" fill="#E8E8E8" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="88" y="164" width="90" height="74" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      {/* speech bubble */}
      <ellipse cx="50" cy="30" rx="30" ry="15" fill="white" stroke="#333" strokeWidth="1" />
      <line x1="50" y1="30" x2="30" y2="68" stroke="#333" strokeWidth="1" />
    </svg>
  ),
  // Layout 3: 3-row cinematic
  (
    <svg viewBox="0 0 180 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="180" height="240" fill="#F0EBE0" />
      <rect x="2" y="2" width="176" height="75" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="2" y="83" width="176" height="75" fill="#E8E8E8" stroke="#333" strokeWidth="1.5" rx="1" />
      <rect x="2" y="164" width="176" height="74" fill="white" stroke="#333" strokeWidth="1.5" rx="1" />
      {/* speed lines */}
      {[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165].map(x => (
        <line key={x} x1={x} y1="83" x2={x + 7} y2="158" stroke="#D8D3C8" strokeWidth="0.7" />
      ))}
    </svg>
  ),
];

export default function MangaPanelPreview({ layout }: { layout: number }) {
  return <>{LAYOUTS[layout % LAYOUTS.length]}</>;
}
