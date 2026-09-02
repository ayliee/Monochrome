import React from "react";

export function Icon({ d, size = 22, stroke = 1.7, children, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const HomeIcon = (p) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 10v10h14V10" />
  </Icon>
);
export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const LibraryIcon = (p) => (
  <Icon {...p}>
    <path d="M4 4h4v16H4zM10 4h4v16h-4zM16 8h4v12h-4z" />
  </Icon>
);
export const ClockIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const GearIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);
export const HeartIcon = ({ filled, ...p }) => (
  <Icon {...p}>
    <path
      d="M19.5 12.6 12 20l-7.5-7.4a4.5 4.5 0 0 1 6.4-6.3L12 7.7l1.1-1.4a4.5 4.5 0 0 1 6.4 6.3z"
      fill={filled ? "currentColor" : "none"}
    />
  </Icon>
);
export const PlayIcon = (p) => (
  <Icon {...p} stroke={1.4}>
    <path d="M8 5v14l12-7z" fill="currentColor" stroke="none" />
  </Icon>
);
export const PauseIcon = (p) => (
  <Icon {...p} stroke={1.4}>
    <rect x="6" y="5" width="4.5" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5" width="4.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </Icon>
);
export const PrevIcon = (p) => (
  <Icon {...p}>
    <path d="M18 6 10 12l8 6V6z" fill="currentColor" stroke="none" />
    <path d="M6 6v12" />
  </Icon>
);
export const NextIcon = (p) => (
  <Icon {...p}>
    <path d="M6 6l8 6-8 6V6z" fill="currentColor" stroke="none" />
    <path d="M18 6v12" />
  </Icon>
);
export const ShuffleIcon = (p) => (
  <Icon {...p}>
    <path d="M16 3h5v5" />
    <path d="M4 7h4l8 10h5" />
    <path d="M21 16v5h-5" />
    <path d="M15 9l2-2" />
  </Icon>
);
export const RepeatIcon = ({ one, ...p }) => (
  <Icon {...p}>
    <path d="M17 1v4h4" />
    <path d="M3 11a8 8 0 0 1 14.2-5L21 5" />
    <path d="M7 23v-4H3" />
    <path d="M21 13a8 8 0 0 1-14.2 5L3 19" />
    {one ? <path d="M12 9v6M11 9h2" /> : null}
  </Icon>
);
export const QueueIcon = (p) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h10M4 18h10" />
    <path d="m16 12 5 3-5 3v-6z" fill="currentColor" stroke="none" />
  </Icon>
);
export const MicIcon = (p) => (
  <Icon {...p} stroke={1.7}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11.2a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.7V21" />
    <path d="M8.5 21h7" />
  </Icon>
);
export const PinIcon = (p) => <MicIcon {...p} />;
export const BrowseIcon = (p) => (
  <Icon {...p} stroke={1.7}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </Icon>
);
export const VolumeIcon = ({ level = 1, ...p }) => (
  <Icon {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    {level > 0.01 ? <path d="M16 9.5a4 4 0 0 1 0 5" /> : <path d="m16 9 5 6M21 9l-5 6" />}
    {level > 0.5 ? <path d="M18 7a7 7 0 0 1 0 10" /> : null}
  </Icon>
);
export const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const BackIcon = (p) => (
  <Icon {...p}>
    <path d="M15 5 8 12l7 7" />
  </Icon>
);
export const MoreIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="18" cy="12" r="1.3" fill="currentColor" />
  </Icon>
);
export const ExpandIcon = (p) => (
  <Icon {...p}>
    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
  </Icon>
);
