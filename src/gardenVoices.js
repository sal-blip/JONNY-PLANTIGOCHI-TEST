// All voices are synthesized here so the instrument also plays offline.
// Buffers belong to their AudioContext.
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

// One soft bell strike. Every tutorial popup uses this exact recording.
function guideChime(ctx) {
  const rate = 24000, duration = .38;
  const buffer = ctx.createBuffer(1, Math.round(rate * duration), rate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate, phase = 784 * t;
    const envelope = (1 - Math.exp(-t / .006)) * Math.min(1, (duration - t) / .055);
    samples[i] = envelope * (.21 * sine(phase) * Math.exp(-t / .105)
      + .07 * sine(phase * 2.54) * Math.exp(-t / .055));
  }
  return buffer;
}

export function playGuideChime(ctx, bus) {
  bus.gain.value = .28;
  oneShot(ctx, bus, bufferFor(ctx, 'guide-chime', () => guideChime(ctx)));
}

export function playButton(ctx, bus, kind = 'tap', variation = 0) {
  if(kind==='purr'){
    oneShot(ctx,bus,bufferFor(ctx,'cat-purr',()=>catPurr(ctx)));
    return;
  }
  const variant = Math.abs(Math.trunc(Number(variation) || 0)) % 5;
  const care = kind === 'care';
  const buffer = bufferFor(ctx, 'button-' + care + '-' + variant, () => woodenClick(ctx, care, variant));
  oneShot(ctx, bus, buffer);
  return buffer.duration;
}

function canopyRustle(ctx) {
  const rate = 24000;
  const buffer = ctx.createBuffer(2, Math.ceil(rate * .8), rate);
  const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
  // Each pass has independent fibers and travels across the listener's head.
  const sweeps = [
    { start: 0.01, length: .32, from: -0.85, to: 0.54, volume: 0.39 },
    { start: .22, length: .39, from: 0.81, to: -0.78, volume: .50 },
    { start: .48, length: .31, from: -0.58, to: 0.55, volume: .315 },
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
