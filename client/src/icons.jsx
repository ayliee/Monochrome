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

/* ------------------------------------------------------------------ */
/* Extended icon set — ported from the reference design system.        */
/* Reference strokes use 1.8 width; a caller-supplied `stroke` still */
/* wins because the spread comes after the default.                    */
/* ------------------------------------------------------------------ */

export const PlusIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const CheckIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="m5 13 5 5L20 7" />
  </Icon>
);
export const ChevronLeftIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="m14.5 5-7 7 7 7" />
  </Icon>
);
export const ChevronRightIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="m9.5 5 7 7-7 7" />
  </Icon>
);
export const ChevronDownIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
);
export const ArrowRightIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 12h16m0 0-6-6m6 6-6 6" />
  </Icon>
);
export const ArrowUpRightIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Icon>
);
export const InfoIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.2" />
  </Icon>
);
export const SparklesIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z" fill="currentColor" stroke="none" />
    <path d="M18.5 15.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" fill="currentColor" stroke="none" />
  </Icon>
);
export const FlameIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M12 3s5.5 4.3 5.5 9a5.5 5.5 0 0 1-11 0c0-1.8.8-3.2 1.8-4.3.3 1.3 1 2.2 2 2.6C10.6 8 12 5.4 12 3Z" />
  </Icon>
);
export const StarIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 4Z" />
  </Icon>
);
export const LayersIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Icon>
);
export const HistoryIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4M3.5 4.6V9H8" />
    <path d="M12 7.5V12l3.2 2" />
  </Icon>
);
export const GlobeIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.4 3.8 5.4 3.8 8.5S14.5 18.1 12 20.5c-2.5-2.4-3.8-5.4-3.8-8.5S9.5 5.9 12 3.5Z" />
  </Icon>
);
export const RefreshIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" />
  </Icon>
);
export const CalendarIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Icon>
);
export const ClockFilledIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);
export const ListIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Icon>
);
export const GridIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </Icon>
);
export const FilterIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
);
export const SortIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 8h10M4 16h7M17 4v16m0 0 3-3m-3 3-3-3" />
  </Icon>
);
export const HeartFillIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3c0 5-7.5 9.4-7.5 9.4Z" fill="currentColor" />
  </Icon>
);
export const VolumeMuteIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" fill="currentColor" stroke="none" />
    <path d="m16 9.5 5 5m0-5-5 5" />
  </Icon>
);
export const VolumeLowIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" fill="currentColor" stroke="none" />
    <path d="M15.5 9.5a3.4 3.4 0 0 1 0 5" />
  </Icon>
);
export const RadioIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M7.1 7.1a7 7 0 0 0 0 9.8M16.9 16.9a7 7 0 0 0 0-9.8M4.2 4.2a11 11 0 0 0 0 15.6M19.8 19.8a11 11 0 0 0 0-15.6" />
  </Icon>
);
export const BoltIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M13 3 5 13.5h5.5L10 21l8-10.5h-5.5L13 3Z" />
  </Icon>
);
export const ExternalIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4.5A2.5 2.5 0 0 1 15.5 21h-9A2.5 2.5 0 0 1 4 18.5v-9A2.5 2.5 0 0 1 6.5 7H11" />
  </Icon>
);
export const BookIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 4.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4V4.5Z" />
    <path d="M20 4.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6V4.5Z" />
  </Icon>
);
export const FilmIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M7 4v16M17 4v16M3 12h18" />
  </Icon>
);
export const EyeIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const ServerIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <rect x="3" y="13" width="18" height="7" rx="2" />
    <path d="M7 7.5h.01M7 16.5h.01" />
  </Icon>
);
export const SubtitleIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M7.5 13h4M14 13h2.5" />
  </Icon>
);
export const AudioIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" fill="currentColor" stroke="none" />
    <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
  </Icon>
);
export const TvIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3" y="6.5" width="18" height="12" rx="2.5" />
    <path d="M9 3.5 12 6l3-2.5" />
  </Icon>
);
export const CameraIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2.5" />
    <circle cx="12" cy="13" r="3.4" />
    <path d="M8.5 7 10 4.5h4L15.5 7" />
  </Icon>
);
export const ShareIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M11 6V4.2c0-.6.7-.9 1.2-.5l7.4 6.5c.4.3.4.9 0 1.2l-7.4 6.5c-.5.4-1.2.1-1.2-.5V12" />
    <path d="M11 12H7a4 4 0 0 0-4 4v3" />
  </Icon>
);
export const LinkIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
    <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4" />
  </Icon>
);
export const CastIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M3 19.5h.01M3 15a6 6 0 0 1 6 6M3 10.5a10.5 10.5 0 0 1 10.5 10.5" />
    <path d="M7 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" />
  </Icon>
);
export const FullscreenIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
  </Icon>
);
export const FullscreenExitIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4" />
  </Icon>
);
export const SkipFwdIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M5 5.5v13l9-6.5-9-6.5Z" fill="currentColor" stroke="none" />
    <path d="M18 5v14" />
  </Icon>
);
export const SkipBackIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M19 5.5v13L10 12l9-6.5Z" fill="currentColor" stroke="none" />
    <path d="M6 5v14" />
  </Icon>
);
export const DownloadIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M12 4v11m0 0 4-4m-4 4-4-4" />
    <path d="M4.5 18.5h15" />
  </Icon>
);
export const FlagIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M5 21V4.5h9.5l-1 3.2h6.5l-2 5.3 2 5.3h-6.7l-1-3.2H5" />
  </Icon>
);
export const PipIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <rect x="12" y="11" width="7" height="6" rx="1.4" fill="currentColor" stroke="none" />
  </Icon>
);
export const SettingsGearIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.11A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 3h.09A1.7 1.7 0 0 0 10.3 1.4V1a2 2 0 1 1 4 0v.11A1.7 1.7 0 0 0 15.3 3a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 21 9v.09c.02.9.6 1.66 1.6 1.9h.4a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.5 1.01Z" transform="translate(-.6 .6) scale(.94)" />
  </Icon>
);
export const XIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const PlusCircleIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const MusicNoteIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </Icon>
);
export const EqualizerIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M4 20v-6M9 20V8M14 20v-10M19 20V4" />
  </Icon>
);
export const DiscIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
  </Icon>
);
export const WaveIcon = (p) => (
  <Icon stroke={1.8} {...p}>
    <path d="M3 12h2m2-6v12m4-9v6m4-10v14m4-11v8m2-4h2" />
  </Icon>
);
