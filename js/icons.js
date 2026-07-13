/* =========================================================
   أمازون شاليه — Icon library (inline SVG, line-icon style)
   All icons: 24x24 viewbox, stroke=currentColor, no fill.
   Usage: ICONS.pool, ICONS.close(18), etc.
   ========================================================= */

const ICON_BASE = 'width="{S}" height="{S}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';

function svgIcon(inner) {
  return (size = 20) => `<svg ${ICON_BASE.replace(/\{S\}/g, size)}>${inner}</svg>`;
}

const ICONS = {
  /* --- nav / ui --- */
  close: svgIcon(`<path d="M18 6 6 18M6 6l12 12"/>`),
  menu: svgIcon(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
  chevronRight: svgIcon(`<path d="m9 18 6-6-6-6"/>`),
  chevronLeft: svgIcon(`<path d="m15 18-6-6 6-6"/>`),
  plus: svgIcon(`<path d="M12 5v14M5 12h14"/>`),
  trash: svgIcon(`<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/>`),
  edit: svgIcon(`<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>`),
  check: svgIcon(`<path d="M20 6 9 17l-5-5"/>`),
  image: svgIcon(`<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>`),
  calendar: svgIcon(`<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>`),
  clock: svgIcon(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`),
  mapPin: svgIcon(`<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`),
  settings: svgIcon(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z"/>`),
  logout: svgIcon(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>`),
  home: svgIcon(`<path d="m3 11 9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V10"/>`),
  sparkles: svgIcon(`<path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="3"/>`),
  gift: svgIcon(`<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>`),
  play: svgIcon(`<path d="M6 4.5v15l13-7.5Z" fill="currentColor" stroke="none"/>`),

  /* --- feature icons --- */
  pool: svgIcon(`<path d="M2 17c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0"/><path d="M4 12V6a2 2 0 0 1 2-2h9l5 5v3"/>`),
  sofa: svgIcon(`<path d="M4 10V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3Z"/><path d="M4 18v-3M20 18v-3M2 18h20"/>`),
  car: svgIcon(`<path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM3 17V11l2-5h14l2 5v6"/><path d="M5 11h14"/>`),
  bed: svgIcon(`<path d="M2 18v-7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7M2 18v2M22 18v2M2 13h20"/><rect x="4" y="9" width="6" height="4" rx="1"/>`),
  flame: svgIcon(`<path d="M12 2s5 4.5 5 9.5a5 5 0 0 1-10 0C7 8 9 6 9 6s.5 2 2 2c1 0 1-1.5 1-3 0-1.5 0-2 0-3Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 5 0"/>`),
  swing: svgIcon(`<path d="M5 3v18M19 3v18M5 9h14"/><circle cx="12" cy="15" r="2"/><path d="M12 9v4"/>`),
  wifi: svgIcon(`<path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>`),
  dice: svgIcon(`<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/>`),
  sun: svgIcon(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  sunset: svgIcon(`<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M4.2 6.2l1.4 1.4M19.8 6.2l-1.4 1.4M2 18h20M2 22h20"/>`),
  moon: svgIcon(`<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>`),

  /* --- amenities (Amazon Chalet section) --- */
  amenityPool: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor"><path d="M88,149.39a8,8,0,0,0,8-8V128h64v15.29a8,8,0,0,0,16,0V32a8,8,0,0,0-16,0V48H96V32a8,8,0,0,0-16,0V141.39A8,8,0,0,0,88,149.39ZM96,112V96h64v16Zm64-48V80H96V64ZM24,168a8,8,0,0,1,8-8c14.42,0,22.19,5.18,28.44,9.34C66,173.06,70.42,176,80,176s14-2.94,19.56-6.66c6.24-4.16,14-9.34,28.43-9.34s22.2,5.18,28.44,9.34c5.58,3.72,10,6.66,19.57,6.66s14-2.94,19.56-6.66c6.25-4.16,14-9.34,28.44-9.34a8,8,0,0,1,0,16c-9.58,0-14,2.94-19.56,6.66-6.25,4.16-14,9.34-28.44,9.34s-22.2-5.18-28.44-9.34C142,178.94,137.57,176,128,176s-14,2.94-19.56,6.66c-6.24,4.16-14,9.34-28.43,9.34s-22.19-5.18-28.44-9.34C46,178.94,41.58,176,32,176A8,8,0,0,1,24,168Zm208,40a8,8,0,0,1-8,8c-9.58,0-14,2.94-19.56,6.66-6.25,4.16-14,9.34-28.44,9.34s-22.2-5.18-28.44-9.34C142,218.94,137.57,216,128,216s-14,2.94-19.56,6.66c-6.24,4.16-14,9.34-28.43,9.34s-22.19-5.18-28.44-9.34C46,218.94,41.58,216,32,216a8,8,0,0,1,0-16c14.42,0,22.19,5.18,28.44,9.34C66,213.06,70.42,216,80,216s14-2.94,19.56-6.66c6.24-4.16,14-9.34,28.43-9.34s22.2,5.18,28.44,9.34c5.58,3.72,10,6.66,19.57,6.66s14-2.94,19.56-6.66c6.25-4.16,14-9.34,28.44-9.34A8,8,0,0,1,232,208Z"/></svg>`,
  amenityCourt: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor"><path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,112h-8a32,32,0,0,1,0-64h8ZM32,96h8a32,32,0,0,1,0,64H32Zm0,80h8a48,48,0,0,0,0-96H32V64h88V192H32Zm192,16H136V64h88V80h-8a48,48,0,0,0,0,96h8v16Z"/></svg>`,
  amenityBBQ: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor"><path d="M183.89,153.34a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68ZM216,144a88,88,0,0,1-176,0c0-27.92,11-56.47,32.66-84.85a8,8,0,0,1,11.93-.89l24.12,23.41,22-60.41a8,8,0,0,1,12.63-3.41C165.21,36,216,84.55,216,144Zm-16,0c0-46.09-35.79-85.92-58.21-106.33L119.52,98.74a8,8,0,0,1-13.09,3L80.06,76.16C64.09,99.21,56,122,56,144a72,72,0,0,0,144,0Z"/></svg>`,
  amenityWifi: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor"><path d="M140,204a12,12,0,1,1-12-12A12,12,0,0,1,140,204ZM237.08,87A172,172,0,0,0,18.92,87,8,8,0,0,0,29.08,99.37a156,156,0,0,1,197.84,0A8,8,0,0,0,237.08,87ZM205,122.77a124,124,0,0,0-153.94,0A8,8,0,0,0,61,135.31a108,108,0,0,1,134.06,0,8,8,0,0,0,11.24-1.3A8,8,0,0,0,205,122.77Zm-32.26,35.76a76.05,76.05,0,0,0-89.42,0,8,8,0,0,0,9.42,12.94,60,60,0,0,1,70.58,0,8,8,0,1,0,9.42-12.94Z"/></svg>`,
  amenityBed: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>`,
  amenityKids: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18M19 3v18M5 8h14"/><circle cx="12" cy="14" r="2.2"/><path d="M12 8v3.5"/></svg>`,
  amenityRelax: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17h2a3 3 0 0 0 3-3V9a3 3 0 0 1 6 0"/><path d="M2 17v3M22 20v-6a3 3 0 0 0-3-3h-6.5"/><path d="M2 13h11a3 3 0 0 1 3 3v1H2Z"/><circle cx="18" cy="6" r="2.2"/></svg>`,


  whatsapp: svgIcon(`<path d="M17.5 14.4c-.3-.1-1.7-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a7.6 7.6 0 0 1-2.2-1.4 8.4 8.4 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.4-.5.3-.4a.5.5 0 0 0 0-.5c-.1-.1-.7-1.6-.9-2.2s-.4-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 6 6 0 0 0 1.3 3.1 13.6 13.6 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.2 4.2 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z" fill="currentColor" stroke="none"/><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/>`),
  instagram: svgIcon(`<rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>`),
};

/* Render helper: icon(name, size, extraClass) -> HTML string */
function icon(name, size = 20, cls = '') {
  const fn = ICONS[name];
  if (!fn) return '';
  const svg = fn(size);
  return cls ? svg.replace('<svg ', `<svg class="${cls}" `) : svg;
}
