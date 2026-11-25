import React from 'react';

// Draw directly on a 20 × 20 pixel grid. Large cutouts and branching shapes
// keep each plant recognizable when the LCD is displayed at phone size.
const faces = {
  Monstera: {
    ink: '#214f43', fill: '#40856a', accent: '#bee095',
    shape: 'M3 16 2 13V8L4 4 8 2H12L9 6 15 2H17L16 6 12 9 18 7 17 11 12 14 16 13 13 16 9 17H5L2 19 1 18Z',
    marks: 'M4 15 12 5 10 9 6 15Z M5 7h2v3H5Z M9 12h2v2H9Z',
  },
  'Snake plant': {
    ink: '#495638', fill: '#b9b447', accent: '#355f44',
    shape: 'M5 18 2 10V5L5 7 7 13 7 6 10 1 12 5 11 13 14 8 17 5 17 10 14 17 12 19H7Z',
    marks: 'M8 7l3-2v2l-3 2Z M8 11l3-2v2l-3 2Z M13 13l3-3-1 3-3 3Z M3 8l3 3v2l-3-3Z',
  },
  Fern: {
    ink: '#32503f', fill: '#619460', accent: '#b8cf7b',
    shape: 'M2 19 4 14 2 12 1 7 4 9 6 12 6 7 5 4 8 6 9 9 10 3 12 2 12 6 14 2 18 1 16 5 13 8 18 6 17 9 11 11 9 13 15 12 13 15 7 16 4 19Z',
    marks: 'M3 17 8 11 14 5 11 10 6 16 4 18Z',
  },
  Clover: {
    ink: '#345333', fill: '#6eaa57', accent: '#e3e8a0',
    shape: 'M9 11 4 11 1 8 1 5 3 4 5 5 6 2 9 2 11 5 10 9 13 5 16 4 18 5 18 8 16 9 18 10 17 13 14 14 11 12 12 15 11 18 8 19 7 17 5 18 3 16 4 13 8 11Z M10 11 12 12 17 18 16 19Z',
    marks: 'M4 6h2l2 3-3-1Z M12 10l4-3-1 3Z M6 15l3-3-1 3Z',
  },
  Cactus: {
    ink: '#25534c', fill: '#4f9984', accent: '#e4d990',
    shape: 'M7 19V13H4L2 11V6L3 5 5 6V10H7V4L9 2H11L13 4V12H15V8L16 7 18 8V13L16 15H13V19Z',
    marks: 'M9 5h2v12H9Z M3 6h1v3H3Z M16 8h1v3h-1Z',
  },
  Lotus: {
    ink: '#743d58', fill: '#cc7894', accent: '#ffe2be',
    shape: 'M1 12 3 12 2 7 6 8 7 9 6 5 8 6 10 2 13 7 16 5 15 10 19 8 18 13 16 16 12 18H8L4 16Z',
    marks: 'M10 5l2 4-2 5-2-5Z M4 9l4 4 1 3-4-3Z M12 15l4-5-1 4Z',
  },
  Maple: {
    ink: '#85472f', fill: '#cc7944', accent: '#f5c16f',
    shape: 'M10 1 12 5 14 4 13 9 16 6 17 8 19 7 18 11 19 12 13 15 14 17 10 16 9 19H8L9 16 5 17 6 15 1 12 3 11 1 7 4 8 5 6 8 10 6 4 8 5Z',
    marks: 'M9 6h2l-1 8H9Z M4 10l5 3v1l-4-2Z M11 13l5-3-2 3-3 1Z',
  },
  Palm: {
    ink: '#3c5239', fill: '#72965d', accent: '#a76a3f',
    shape: 'M1 9 3 5 6 3 9 4 11 2 15 2 18 4 13 4 11 6 15 5 18 7 19 11 16 9 13 8 15 12 15 14 11 10 10 12 10 16 12 19H8L7 16 8 9 5 11 3 14 3 11 5 8Z',
    marks: 'M9 9h2l-1 5v2l1 2H9l-1-3Z',
  },
  Acorn: {
    ink: '#654832', fill: '#d29250', accent: '#835738',
    shape: 'M10 4 12 1 14 1 12 5 15 6 17 8 18 10 16 11 15 15 12 18 10 19 7 17 5 14 4 11 2 10 3 7 6 5Z',
    marks: 'M4 7l3-2h5l4 2 1 3H3Z',
    glint: 'M6 11h2l1 4-2-1Z M6 7h2v1H6Z M11 6h2v1h-2Z',
  },
};

export function LeafPairFace({name}) {
  const {ink, fill, accent, shape, marks, glint} = faces[name];
  return <g transform="translate(3 2.5)" data-leaf-face={name}>
    <path d={shape} fill={fill} stroke={ink} strokeWidth="1.2" strokeLinejoin="round"/>
    <path d={marks} fill={accent}/>
    {glint && <path d={glint} fill="#f7dba1"/>}
  </g>;
}
