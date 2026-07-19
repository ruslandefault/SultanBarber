import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = (props: P) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
)

export const IconUsers = (p: P) => (
  <svg {...base(p)}>
    <path d="M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.7-3.4M15.5 5.2a3.2 3.2 0 0 1 0 5.6" />
  </svg>
)

export const IconScissors = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6" r="2.6" />
    <circle cx="6" cy="18" r="2.6" />
    <path d="M8.5 7.8 20 18M8.5 16.2 20 6M12 12l2.5 2" />
  </svg>
)

export const IconMaster = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
  </svg>
)

export const IconSettings = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
  </svg>
)

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
)

export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
)

export const IconPhone = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 3.5 9 4l1 3.5-1.7 1.3a12 12 0 0 0 5 5L14.5 15l3.5 1 .5 2.5a1.5 1.5 0 0 1-1.6 1.7A15 15 0 0 1 3.3 6.1 1.5 1.5 0 0 1 5 4.5Z" />
  </svg>
)

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5 10 17l9-10" />
  </svg>
)

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6.5h16M9 6.5V4.5h6v2M6 6.5 6.8 20a1.5 1.5 0 0 0 1.5 1.4h7.4a1.5 1.5 0 0 0 1.5-1.4L18 6.5M10 10.5v6M14 10.5v6" />
  </svg>
)

export const IconStar = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z" />
  </svg>
)

export const IconCake = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M4 16c1.5 1.2 3 1.2 4 0s2.5-1.2 4 0 2.5 1.2 4 0 2.5-1.2 4 0M12 8V5M12 5l1-1.2M12 5l-1-1.2" />
  </svg>
)

export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 15V4M8 8l4-4 4 4M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
)

export const IconBag = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 8h12l-.8 11.2A1.5 1.5 0 0 1 15.7 20.6H8.3a1.5 1.5 0 0 1-1.5-1.4L6 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
)

export const IconMap = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-6.5-5.5-6.5-10.5A6.5 6.5 0 0 1 18.5 10.5C18.5 15.5 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.3" />
  </svg>
)
