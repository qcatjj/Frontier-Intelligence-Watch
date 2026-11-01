import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

export default function handler(req) {
  let title = '', kicker = '';
  try {
    const u = new URL(req.url);
    title = (u.searchParams.get('title') || '').slice(0, 160);
    kicker = (u.searchParams.get('kicker') || '').slice(0, 80);
  } catch (e) {}
  if (title) return articleCard(title, kicker);

  const text = (value, size, color = '#ffffff', weight = 700, extra = {}) =>
    React.createElement('div', { style: { fontFamily: 'sans-serif', fontWeight: weight, fontSize: size, color, lineHeight: 1.05, letterSpacing: '-1.5px', ...extra } }, value);

  const F = React.createElement('svg', { width: 250, height: 255, viewBox: '0 0 216 216', xmlns: 'http://www.w3.org/2000/svg' },
    React.createElement('defs', null,
      React.createElement('linearGradient', { id: 'f', x1: '0', y1: '0', x2: '1', y2: '1' },
        React.createElement('stop', { offset: '0%', stopColor: '#a9f9ff' }),
        React.createElement('stop', { offset: '27%', stopColor: '#29c5ff' }),
        React.createElement('stop', { offset: '65%', stopColor: '#5245ff' }),
        React.createElement('stop', { offset: '100%', stopColor: '#e93bff' })
      )
    ),
    React.createElement('path', { d: 'M28 18H188L155 56H83V85H150L117 122H83V174L28 207Z', fill: 'url(#f)' }),
    React.createElement('path', { d: 'M83 18H188L155 56H83Z', fill: '#b9edff', opacity: 0.72 }),
    React.createElement('path', { d: 'M83 85H150L117 122H83Z', fill: '#85ccff', opacity: 0.65 })
  );

  const layout = React.createElement('div', {
    style: { display: 'flex', position: 'relative', width: '1200px', height: '630px', background: 'linear-gradient(118deg,#050a1b 0%,#0b1330 55%,#180d37 100%)', color: '#fff', overflow: 'hidden', alignItems: 'center', padding: '75px 70px' }
  },
    React.createElement('div', { style: { position: 'absolute', right: '-140px', bottom: '-390px', width: '950px', height: '670px', borderRadius: '50%', border: '10px solid #526aff', boxShadow: '0 0 85px #5e4bff, inset 0 0 85px #1a4ab5', background: 'radial-gradient(ellipse at 50% 5%,#17295c 0%,#0c1338 48%,#050818 100%)' } }),
    React.createElement('div', { style: { position: 'absolute', right: '270px', bottom: '152px', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle,#e5edff 0%,#987cff 8%,#5266f888 20%,#5266f800 75%)' } }),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', zIndex: 1, width: '100%', gap: '27px', marginTop: '-70px' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '250px', height: '270px' } }, F),
      React.createElement('div', { style: { width: '3px', height: '245px', background: '#6577c7' } }),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
        text('FRONTIER', 69),
        text('INTELLIGENCE', 63),
        text('WATCH', 84, '#71b5ff')
      )
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', position: 'absolute', left: '78px', bottom: '55px', gap: '17px' } },
      text('DEEP AI RESEARCH. EXPLAINED FOR EVERYONE.', 23, '#e6edff', 600, { letterSpacing: '1.5px' }),
      text('frontier-intelligence-watch.vercel.app', 18, '#9bb2d9', 400, { letterSpacing: '0' })
    ),
    React.createElement('div', { style: { position: 'absolute', left: '0px', top: '0px', width: '1200px', height: '6px', background: 'linear-gradient(90deg,#35d5ff,#4659ff,#d640fb)' } })
  );
  return new ImageResponse(layout, { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
}

// Per-page social card: neutral editorial layout with the page title. Used by issue and story pages.
function articleCard(title, kicker) {
  const h = React.createElement;
  const size = title.length > 110 ? 50 : title.length > 70 ? 60 : 72;
  const layout = h('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '1200px', height: '630px', background: '#faf9f6', color: '#16181d', padding: '64px 72px', fontFamily: 'serif' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
      h('svg', { width: 44, height: 44, viewBox: '0 0 216 216', xmlns: 'http://www.w3.org/2000/svg' },
        h('path', { d: 'M28 18H188L155 56H83V85H150L117 122H83V174L28 207Z', fill: '#1d4ed8' })),
      h('div', { style: { display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px' } }, 'Frontier Intelligence Watch')
    ),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '22px' } },
      kicker ? h('div', { style: { display: 'flex', fontFamily: 'sans-serif', fontSize: 24, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#5d6370' } }, kicker) : null,
      h('div', { style: { display: 'flex', fontSize: size, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-1px', maxWidth: '1050px' } }, title)
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e3e0d7', paddingTop: '22px', fontFamily: 'sans-serif', fontSize: 24, color: '#3a3f4a' } },
      h('div', { style: { display: 'flex', fontWeight: 700 } }, 'Evidence, not hype.'),
      h('div', { style: { display: 'flex' } }, 'frontier-intelligence-watch.vercel.app')
    )
  );
  return new ImageResponse(layout, { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
}
