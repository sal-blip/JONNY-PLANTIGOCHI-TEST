// All voices are synthesized here so the instrument also plays offline.
// Buffers belong to their AudioContext. The bed loops in audio time without JS timers.
const TAU = 2 * Math.PI;
const buffersByContext = new WeakMap();
const waveform = Float32Array.from({ length: 2049 }, (_, i) => Math.sin(TAU * i / 2048));

// Interpolate a cycle to keep the first render responsive on phone CPUs.
function sine(cycles) {
  const sample = cycles * 2048;
  const whole = Math.floor(sample), index = whole & 2047;
  return waveform[index] + (waveform[index + 1] - waveform[index]) * (sample - whole);
}

function bufferFor(ctx, key, build) {
  let buffers = buffersByContext.get(ctx);
  if (!buffers) {
    buffers = new Map();
    buffersByContext.set(ctx, buffers);
  }
  if (!buffers.has(key)) buffers.set(key, build());
  return buffers.get(key);
}

function noise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
}

function oneShot(ctx, bus, buffer) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(bus);
  source.onended = () => source.disconnect();
  source.start();
}

function woodenClick(ctx, care, variant) {
  const rate = 24000;
  const length = care ? 0.25 : 0.16;
  const buffer = ctx.createBuffer(1, Math.ceil(length * rate), rate);
  const data = buffer.getChannelData(0);
  const random = noise(1149 + 443 * variant);
  const variation = [1, 1.045, 0.968, 1.019, 0.982][variant];
  const root = (care ? 427 : 378) * variation;
  let phase = 0, grit = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    phase += TAU * root * (1 + 0.21 * Math.exp(-t / 0.008)) / rate;
    grit += 0.50 * (random() - grit);
    const tap = 0.115 * Math.sin(phase) * Math.exp(-t / 0.027)
      + 0.077 * Math.sin(phase * 2.62) * Math.exp(-t / 0.012)
      + 0.043 * grit * Math.exp(-t / 0.006);
    const rebound = Math.max(0, t - 0.043);
    const echo = care ? 0.052 * Math.sin(TAU * root * 1.5 * rebound)
      * (1 - Math.exp(-rebound / 0.004)) * Math.exp(-rebound / 0.040) : 0;
    data[i] = (tap + echo) * Math.min(1, t / 0.002, (length - t) / 0.012);
  }
  return buffer;
}

// A breath-shaped train of low pulses. Its soft upper harmonics carry the
// purr on small phone speakers even when they roll off the fundamental.
function catPurr(ctx){
  const rate=16000,seconds=1.65,buf=ctx.createBuffer(1,Math.ceil(rate*seconds),rate);
  const data=buf.getChannelData(0),random=noise(3817);
  let phase=0,breathNoise=0;
  for(let i=0;i<data.length;i++){
    const t=i/rate;
    phase+=(25+.9*sine(t*.8))/rate;
    const breath=.55+.45*Math.abs(sine(t*.57+.09));
    const pulse=Math.pow(.5+.5*sine(phase),2);
    const envelope=Math.min(1,t/.10,(seconds-t)/.26)*breath;
    breathNoise+=.075*(random()-breathNoise);
    data[i]=envelope*(.045*sine(phase*3)+pulse*(.068*sine(phase*5)+.032*sine(phase*7)+.12*breathNoise));
  }
  return buf;
}

export function playButton(ctx, bus, kind = 'tap', variation = 0) {
  if(kind==='purr'){
    oneShot(ctx,bus,bufferFor(ctx,'cat-purr',()=>catPurr(ctx)));
    return;
  }
  const variant = Math.abs(Math.trunc(Number(variation) || 0)) % 5;
  const care = kind === 'care';
  oneShot(ctx, bus, bufferFor(ctx, 'button-' + care + '-' + variant, () => woodenClick(ctx, care, variant)));
}

function canopyRustle(ctx) {
  const rate = 24000;
  const buffer = ctx.createBuffer(2, Math.ceil(rate * 6), rate);
  const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
  // Each pass has independent fibers and travels across the listener's head.
  const sweeps = [
    { start: 0.07, length: 2.30, from: -0.85, to: 0.54, volume: 0.78 },
    { start: 1.66, length: 2.91, from: 0.81, to: -0.78, volume: 1.00 },
    { start: 3.58, length: 2.34, from: -0.58, to: 0.55, volume: 0.63 },
  ];
  sweeps.forEach(({ start, length, from, to, volume }, index) => {
    const random = noise(37063 + index * 409);
    const base = Math.round(start * rate);
    let smooth = 0, body = 0, edge = 0, treble = 0;
    let flutter = 0.7, nextFlutter = 0.7, nextFrame = 0, step = 0;
    for (let i = 0; i < length * rate; i++) {
      const t = i / rate, u = t / length;
      if (i >= nextFrame) {
        nextFlutter = 0.71 + 0.28 * random();
        const frames = Math.round(rate * (0.052 + 0.026 * random()));
        step = (nextFlutter - flutter) / frames;
        nextFrame = i + frames;
      }
      flutter += step;
      const light = Math.sin(Math.PI * u);
      const sample = random();
      smooth += (0.20 + 0.18 * light) * (sample - smooth);
      body += 0.065 * (smooth - body);
      treble += 0.58 * (random() - treble);
      edge += 0.33 * (treble - edge);
      const swish = (smooth - body) * 0.32 + (treble - edge) * 0.078;
      const amplitude = light * light * volume * flutter;
      const pan = (from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * u)) + 1) * Math.PI / 4;
      left[base + i] += swish * amplitude * Math.cos(pan);
      right[base + i] += swish * amplitude * Math.sin(pan);
    }
  });
  return buffer;
}

export function playReveal(ctx, bus) {
  oneShot(ctx, bus, bufferFor(ctx, 'canopy', () => canopyRustle(ctx)));
}

function gardenScore(ctx) {
  const rate = 12000, seconds = 40, frames = rate * seconds;
  const buffer = ctx.createBuffer(2, frames, rate);
  const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
  // Integer cycle counts make the continuous D/A pedal seamless at the loop.
  const d = Math.round(146.832 * seconds), a = Math.round(220 * seconds);
  for (let i = 0; i < frames; i++) {
    const phase = i / frames;
    const warmth = 0.010 + 0.0035 * sine(phase);
    const low = warmth * (sine(d * phase) + 0.24 * sine(d * phase * 2));
    const upper = 0.0045 * sine(a * phase + (0.15 / TAU) * sine(phase * 2));
    left[i] = low + 0.82 * upper;
    right[i] = 0.88 * low + upper;
  }
  // D, E, G, A, B. Write the quiet tail of the last note across the downbeat.
  const phrases = [
    [0.6,293.66,0.023,-0.27], [4.1,440,0.020,0.30], [7.8,391.995,0.023,-0.06],
    [11.7,329.63,0.022,-0.32], [14.3,493.88,0.016,0.40], [18.2,440,0.022,0.16],
    [22.4,293.66,0.025,-0.23], [26.1,391.995,0.021,0.34], [28.8,329.63,0.021,-0.38],
    [33.4,246.94,0.025,0.14], [37.7,293.66,0.019,-0.18],
  ];
  for (const [start, hz, volume, pan] of phrases) {
    const lg = Math.sqrt((1 - pan) / 2), rg = Math.sqrt((1 + pan) / 2);
    const duration = 5.8;
    const attackStep = Math.exp(-1 / (0.31 * rate));
    const decayStep = Math.exp(-1 / (1.90 * rate));
    const overtoneStep = Math.exp(-1 / (1.2 * rate));
    let attack = 1, decay = 1, overtone = 0.23, k = Math.round(start * rate);
    for (let j = 0; j < duration * rate; j++) {
      const t = j / rate, phase = hz * t;
      const tail = Math.min(1, (duration - t) / 0.85);
      const amplitude = volume * (1 - attack) * decay * tail;
      const voice = sine(phase) + overtone * sine(2 * phase);
      left[k] += lg * amplitude * voice;
      right[k] += rg * amplitude * voice;
      k = k + 1 === frames ? 0 : k + 1;
      attack *= attackStep;
      decay *= decayStep;
      overtone *= overtoneStep;
    }
  }
  return buffer;
}

function sleepyBreathing(ctx) {
  const rate = 12000;
  const buffer = ctx.createBuffer(1, rate * 23, rate);
  const data = buffer.getChannelData(0);
  const random = noise(5713);
  // Two little snores with long rests; the second exhale is shorter and softer.
  for (const [start, duration, amount] of [[3.8,1.7,1], [14.6,1.38,0.80]]) {
    let phase = 0, breath = 0;
    for (let i = 0; i < duration * rate; i++) {
      const t = i / rate, u = t / duration, swell = Math.sin(Math.PI * u) ** 2;
      phase += TAU * (163 + 26 * swell - 9 * u) / rate;
      breath += 0.23 * (random() - breath);
      const purr = (Math.sin(phase) + 0.65 * Math.sin(phase * 2) + 0.14 * Math.sin(phase * 3))
        * (0.71 + 0.29 * Math.sin(TAU * (10 * t + 1.75 * t * t)));
      data[Math.round(start * rate) + i] = amount * swell * (0.011 * purr + 0.010 * breath);
    }
  }
  return buffer;
}

export function startGardenBed(ctx, bus, sleeping = false) {
  const noteBuffer = bufferFor(ctx, 'garden', () => gardenScore(ctx));
  const score = sleeping ? [noteBuffer, bufferFor(ctx, 'sleep', () => sleepyBreathing(ctx))] : [noteBuffer];
  const mix = ctx.createGain(), start = ctx.currentTime, fadeIn = 0.85;
  mix.gain.setValueAtTime(0, start);
  mix.gain.linearRampToValueAtTime(1, start + fadeIn);
  mix.connect(bus);
  let remaining = score.length;
  const sources = score.map(buffer => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(mix);
    source.onended = () => {
      source.disconnect();
      if (--remaining === 0) mix.disconnect();
    };
    source.start(start);
    return source;
  });
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const now = ctx.currentTime;
    mix.gain.cancelScheduledValues(now);
    mix.gain.setValueAtTime(Math.max(0, Math.min(1, (now - start) / fadeIn)), now);
    const end = now + 0.32;
    mix.gain.linearRampToValueAtTime(0, end);
    sources.forEach(source => source.stop(end));
  };
}
