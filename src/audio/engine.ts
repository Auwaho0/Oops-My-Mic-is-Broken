/**
 * ============================================================================
 * audio/engine.ts — Real-time Audio Engine based on Web Audio API
 * ============================================================================
 * 
 * Web Audio API architecture & core principles (learning guide):
 * 
 * 1. `AudioContext` - The central audio processing graph manager in the browser.
 *    It coordinates the lifecycle of audio nodes and audio decoding/synthesis.
 * 2. `AudioNode` - Modular building blocks of the audio processing pipeline:
 *    - Sources: `OscillatorNode` (synthesizing sine, saw, square, triangle waves),
 *      `AudioBufferSourceNode` (playing white/pink noise buffers or audio files).
 *    - Modifiers: `BiquadFilterNode` (lowpass, highpass, bandpass frequency shaping),
 *      `GainNode` (volume and envelope control).
 *    - Destination: `ctx.destination` (user's hardware speakers/headphones).
 * 3. Routing (graph chain):
 *    [Noise/Oscillator Source] -> [Biquad Filter] -> [Sound Gain] -> [Master Gain] -> [Destination]
 * 4. Benefits of procedural sound synthesis:
 *    - Zero network bandwidth: zero MBs of audio assets downloaded over the wire.
 *    - Natural variety: random noise seeds ensure sounds never loop repetitively.
 *    - Hardware gain control without causing React re-renders.
 */

export type BuiltinSoundId =
  | "drill"
  | "jackhammer"
  | "hammer"
  | "baby"
  | "dog"
  | "socks"
  | "static"
  | "robot"
  | "doorbell";

export type SoundId = BuiltinSoundId | (string & {});

type StopFn = () => void;

/**
 * Generate white noise buffer with uniform random values (-1.0 to 1.0)
 * Serves as the raw audio foundation for hammer drills, jackhammers, and static interference
 */
function createNoiseBuffer(ctx: AudioContext, durationSec = 2): AudioBuffer {
  const bufferSize = ctx.sampleRate * durationSec;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSounds: Map<SoundId, StopFn> = new Map();
  private volume: number = (35 / 100) * 0.9;

  /**
   * Lazy initialization of AudioContext on first user gesture.
   * Modern browser Autoplay policies require user interaction before
   * allowing audio graph activation.
   */
  private init(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return { ctx: this.ctx, master: this.masterGain! };
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  start(id: SoundId, fileUrl?: string) {
    if (this.activeSounds.has(id)) return;
    const { ctx, master } = this.init();

    let stopFn: StopFn;
    switch (id) {
      case "drill":
        stopFn = this.createDrill(ctx, master);
        break;
      case "jackhammer":
        stopFn = this.createJackhammer(ctx, master);
        break;
      case "hammer":
        stopFn = this.createHammer(ctx, master);
        break;
      case "baby":
        stopFn = this.createBaby(ctx, master);
        break;
      case "dog":
        stopFn = this.createDog(ctx, master);
        break;
      case "socks":
        stopFn = this.createSocks(ctx, master);
        break;
      case "static":
        stopFn = this.createStatic(ctx, master);
        break;
      case "robot":
        stopFn = this.createRobot(ctx, master);
        break;
      case "doorbell":
        stopFn = this.createDoorbell(ctx, master);
        break;
      default:
        if (fileUrl) {
          stopFn = this.createAudioElementSource(ctx, master, fileUrl);
        } else {
          return;
        }
    }
    this.activeSounds.set(id, stopFn);
  }

  /* Playback of custom user audio file via HTMLAudioElement + MediaElementAudioSourceNode -> masterGain */
  private createAudioElementSource(ctx: AudioContext, destination: AudioNode, url: string): StopFn {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = url;
    audio.loop = true;

    let sourceNode: MediaElementAudioSourceNode | null = null;
    try {
      sourceNode = ctx.createMediaElementSource(audio);
      sourceNode.connect(destination);
    } catch {
      // If MediaElementSource fails (e.g. cross-origin restrictions in some browsers), fallback to direct audio element volume
      audio.volume = Math.max(0, Math.min(1, this.volume));
    }

    audio.play().catch((err) => {
      console.warn("Audio playback failed or prevented by autoplay policy:", err);
    });

    return () => {
      try {
        audio.pause();
        audio.currentTime = 0;
        if (sourceNode) {
          sourceNode.disconnect();
        }
      } catch {
        // ignore
      }
    };
  }

  stop(id: SoundId) {
    const stopFn = this.activeSounds.get(id);
    if (stopFn) {
      try {
        stopFn();
      } catch (err) {
        console.error(err);
      }
      this.activeSounds.delete(id);
    }
  }

  stopAll() {
    for (const stopFn of this.activeSounds.values()) {
      try {
        stopFn();
      } catch (err) {
        console.error(err);
      }
    }
    this.activeSounds.clear();
  }

  isPlaying(id: SoundId): boolean {
    return this.activeSounds.has(id);
  }

  /* 1. Drill: high-frequency motor whine + wall friction resonance */
  private createDrill(ctx: AudioContext, destination: AudioNode): StopFn {
    const motor = ctx.createOscillator();
    motor.type = "sawtooth";
    motor.frequency.setValueAtTime(360, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.type = "triangle";
    lfo.frequency.setValueAtTime(26, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(45, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(motor.frequency);

    const motorGain = ctx.createGain();
    motorGain.gain.setValueAtTime(0.25, ctx.currentTime);
    motor.connect(motorGain);

    // Wall scraping friction (bandpass filtered white noise)
    const noiseBuffer = createNoiseBuffer(ctx, 1.5);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1400, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(3.0, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    const mainGain = ctx.createGain();
    motorGain.connect(mainGain);
    noiseGain.connect(mainGain);
    mainGain.connect(destination);

    motor.start();
    lfo.start();
    noise.start();

    return () => {
      try {
        motor.stop();
        lfo.stop();
        noise.stop();
        mainGain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 2. Jackhammer: rapid acoustic hammer blows at ~13 Hz */
  private createJackhammer(ctx: AudioContext, destination: AudioNode): StopFn {
    let timer: number | null = null;
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(0.4, ctx.currentTime);
    soundGain.connect(destination);

    const noiseBuffer = createNoiseBuffer(ctx, 0.5);

    const hit = () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.06);

      const hitGain = ctx.createGain();
      hitGain.gain.setValueAtTime(0.7, t);
      hitGain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

      osc.connect(hitGain);
      hitGain.connect(soundGain);
      osc.start(t);
      osc.stop(t + 0.07);

      const nSrc = ctx.createBufferSource();
      nSrc.buffer = noiseBuffer;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = "lowpass";
      nFilter.frequency.setValueAtTime(600, t);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.5, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

      nSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(soundGain);
      nSrc.start(t);
      nSrc.stop(t + 0.07);
    };

    timer = window.setInterval(hit, 80);
    hit();

    return () => {
      if (timer) clearInterval(timer);
      try {
        soundGain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 3. Hammer: periodic strikes every ~850ms */
  private createHammer(ctx: AudioContext, destination: AudioNode): StopFn {
    let timer: number | null = null;
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(0.5, ctx.currentTime);
    soundGain.connect(destination);

    const strike = () => {
      const t = ctx.currentTime;
      // Metallic ring of steel head
      const ping = ctx.createOscillator();
      ping.type = "sine";
      ping.frequency.setValueAtTime(980, t);

      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0.6, t);
      pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      ping.connect(pingGain);
      pingGain.connect(soundGain);
      ping.start(t);
      ping.stop(t + 0.09);

      // Deep physical impact thud
      const thud = ctx.createOscillator();
      thud.type = "triangle";
      thud.frequency.setValueAtTime(220, t);
      thud.frequency.exponentialRampToValueAtTime(60, t + 0.15);

      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.7, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      thud.connect(thudGain);
      thudGain.connect(soundGain);
      thud.start(t);
      thud.stop(t + 0.18);
    };

    timer = window.setInterval(strike, 850);
    strike();

    return () => {
      if (timer) clearInterval(timer);
      try {
        soundGain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 4. Baby crying: modulated whining vocal loops */
  private createBaby(ctx: AudioContext, destination: AudioNode): StopFn {
    let timer: number | null = null;
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(0.35, ctx.currentTime);
    soundGain.connect(destination);

    const wail = () => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.linearRampToValueAtTime(720, t + 0.4);
      osc.frequency.linearRampToValueAtTime(480, t + 0.9);

      // Vibrato LFO
      const vib = ctx.createOscillator();
      vib.type = "sine";
      vib.frequency.setValueAtTime(5.5, t);
      const vibGain = ctx.createGain();
      vibGain.gain.setValueAtTime(30, t);
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      // Formant vocal filter for child voice
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1500, t);
      filter.Q.setValueAtTime(2.5, t);

      const wailGain = ctx.createGain();
      wailGain.gain.setValueAtTime(0.01, t);
      wailGain.gain.linearRampToValueAtTime(0.4, t + 0.3);
      wailGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

      osc.connect(filter);
      filter.connect(wailGain);
      wailGain.connect(soundGain);

      vib.start(t);
      osc.start(t);
      vib.stop(t + 1.1);
      osc.stop(t + 1.1);
    };

    timer = window.setInterval(wail, 1400);
    wail();

    return () => {
      if (timer) clearInterval(timer);
      try {
        soundGain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 5. Dog barking: double-bark pattern with pauses */
  private createDog(ctx: AudioContext, destination: AudioNode): StopFn {
    let timer: number | null = null;
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(0.4, ctx.currentTime);
    soundGain.connect(destination);

    const singleBark = (timeOffset: number) => {
      const t = ctx.currentTime + timeOffset;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(2.0, t);

      const bGain = ctx.createGain();
      bGain.gain.setValueAtTime(0.6, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(filter);
      filter.connect(bGain);
      bGain.connect(soundGain);

      osc.start(t);
      osc.stop(t + 0.15);
    };

    const barkSequence = () => {
      singleBark(0);
      singleBark(0.18);
    };

    timer = window.setInterval(barkSequence, 2300);
    barkSequence();

    return () => {
      if (timer) clearInterval(timer);
      try {
        soundGain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 6. "Mom, where are my socks?": muffled shout through the wall */
  private createSocks(ctx: AudioContext, destination: AudioNode): StopFn {
    let timer: number | null = null;
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(0.35, ctx.currentTime);
    soundGain.connect(destination);

    const shout = () => {
      // 3 vocal syllables through the drywall: MOM! WHERE! ARE MY SOCKS?!
      const syllables = [
        { freq: 280, dur: 0.22, delay: 0 },
        { freq: 320, dur: 0.18, delay: 0.28 },
        { freq: 360, dur: 0.35, delay: 0.52 },
      ];

      for (const syl of syllables) {
        const t = ctx.currentTime + syl.delay;
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(syl.freq, t);
        osc.frequency.linearRampToValueAtTime(syl.freq * 0.9, t + syl.dur);

        // Muffled wall dampening filter (Lowpass 520Hz)
        const wallFilter = ctx.createBiquadFilter();
        wallFilter.type = "lowpass";
        wallFilter.frequency.setValueAtTime(520, t);

        const sylGain = ctx.createGain();
        sylGain.gain.setValueAtTime(0.01, t);
        sylGain.gain.linearRampToValueAtTime(0.5, t + 0.05);
        sylGain.gain.exponentialRampToValueAtTime(0.01, t + syl.dur);

        osc.connect(wallFilter);
        wallFilter.connect(sylGain);
        sylGain.connect(soundGain);

        osc.start(t);
        osc.stop(t + syl.dur + 0.02);
      }
    };

    timer = window.setInterval(shout, 3600);
    shout();

    return () => {
      if (timer) clearInterval(timer);
      try {
        soundGain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 7. Static noise: filtered white noise + fluctuations */
  private createStatic(ctx: AudioContext, destination: AudioNode): StopFn {
    const buffer = createNoiseBuffer(ctx, 2.0);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600, ctx.currentTime);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start();

    return () => {
      try {
        noise.stop();
        gain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 8. Robotic voice: ring modulation + choppy packet loss */
  private createRobot(ctx: AudioContext, destination: AudioNode): StopFn {
    const carrier = ctx.createOscillator();
    carrier.type = "sawtooth";
    carrier.frequency.setValueAtTime(130, ctx.currentTime);

    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.setValueAtTime(32, ctx.currentTime);

    const ringModGain = ctx.createGain();
    ringModGain.gain.setValueAtTime(0.5, ctx.currentTime);

    mod.connect(ringModGain.gain);
    carrier.connect(ringModGain);

    // Chopper (audio packet loss simulation)
    const chopper = ctx.createOscillator();
    chopper.type = "square";
    chopper.frequency.setValueAtTime(7, ctx.currentTime);

    const chopperGain = ctx.createGain();
    chopperGain.gain.setValueAtTime(0.3, ctx.currentTime);

    chopper.connect(chopperGain.gain);
    ringModGain.connect(chopperGain);
    chopperGain.connect(destination);

    carrier.start();
    mod.start();
    chopper.start();

    return () => {
      try {
        carrier.stop();
        mod.stop();
        chopper.stop();
        chopperGain.disconnect();
      } catch {
        // ignore
      }
    };
  }

  /* 9. Doorbell: classic two-tone ding-dong chime every ~4s */
  private createDoorbell(ctx: AudioContext, destination: AudioNode): StopFn {
    let timer: number | null = null;
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(0.4, ctx.currentTime);
    soundGain.connect(destination);

    const chime = () => {
      const t = ctx.currentTime;
      // Ding (E5 ~659 Hz)
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, t);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.6, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc1.connect(gain1);
      gain1.connect(soundGain);
      osc1.start(t);
      osc1.stop(t + 1.3);

      // Dong (C5 ~523 Hz) 350ms later
      const t2 = t + 0.35;
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(523.25, t2);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.6, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 1.6);

      osc2.connect(gain2);
      gain2.connect(soundGain);
      osc2.start(t2);
      osc2.stop(t2 + 1.7);
    };

    timer = window.setInterval(chime, 4200);
    chime();

    return () => {
      if (timer) clearInterval(timer);
      try {
        soundGain.disconnect();
      } catch {
        // ignore
      }
    };
  }
}

export const engine = new AudioEngine();
