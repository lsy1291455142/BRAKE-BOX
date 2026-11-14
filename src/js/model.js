/* ============================================================
   Brake Lab · vehicle model & brake physics
   All formulas are explicit and unit-consistent (SI internally).
   ============================================================ */
(function (BT) {
  'use strict';

  const G = 9.80665;

  function finite(x, def) {
    return (typeof x === 'number' && isFinite(x)) ? x : def;
  }
  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }
  BT.finite = finite;
  BT.clamp = clamp;
  /** Numeric input sanitizer used by module forms: fallback + optional range. */
  BT.num = function (value, def, min, max) {
    let x = finite(value, def);
    if (min !== undefined) x = Math.max(min, x);
    if (max !== undefined) x = Math.min(max, x);
    return x;
  };

  BT.PRESETS = [
    {
      id: 'a', name: 'A级燃油轿车（示例）', short: 'A级轿车',
      mass: 1420, L: 2700, h: 560, frontShare: 61, wheelR: 316,
      front: { re: 122, pistons: 1, pistonD: 57, mu: 0.38, discMass: 9.2, discOD: 300, discID: 180, padArea: 52, padThk: 11 },
      rear: { re: 105, pistons: 1, pistonD: 34, mu: 0.38, discMass: 6.8, discOD: 260, discID: 160, padArea: 38, padThk: 10 },
      mcD: 25.4, pedalRatio: 4.0, boost: 5.8, jumpIn: 22, boostMax: 3200,
      deadTravel: 6, clearance: 0.18, calStiff: 13000, lineComp: 110, maxPressure: 12
    },
    {
      id: 'b', name: 'B级燃油轿车（示例）', short: 'B级轿车',
      mass: 1620, L: 2870, h: 555, frontShare: 59, wheelR: 334,
      front: { re: 130, pistons: 1, pistonD: 60, mu: 0.39, discMass: 11.5, discOD: 320, discID: 200, padArea: 62, padThk: 11 },
      rear: { re: 110, pistons: 1, pistonD: 36, mu: 0.38, discMass: 8.0, discOD: 280, discID: 170, padArea: 42, padThk: 10 },
      mcD: 26.99, pedalRatio: 4.2, boost: 6.0, jumpIn: 25, boostMax: 4200,
      deadTravel: 6, clearance: 0.18, calStiff: 13000, lineComp: 120, maxPressure: 12
    },
    {
      id: 'suv', name: '中大型SUV（示例）', short: '中大型SUV',
      mass: 2050, L: 2950, h: 640, frontShare: 55, wheelR: 372,
      front: { re: 140, pistons: 2, pistonD: 48, mu: 0.40, discMass: 14.5, discOD: 350, discID: 220, padArea: 78, padThk: 12 },
      rear: { re: 118, pistons: 1, pistonD: 42, mu: 0.38, discMass: 10.5, discOD: 300, discID: 190, padArea: 52, padThk: 10 },
      mcD: 27.0, pedalRatio: 4.3, boost: 6.2, jumpIn: 28, boostMax: 4800,
      deadTravel: 6, clearance: 0.28, calStiff: 14000, lineComp: 140, maxPressure: 12
    },
    {
      id: 'ev', name: '纯电轿车（示例）', short: '纯电轿车',
      mass: 1980, L: 2920, h: 520, frontShare: 54, wheelR: 350,
      front: { re: 135, pistons: 2, pistonD: 46, mu: 0.38, discMass: 13.0, discOD: 340, discID: 210, padArea: 72, padThk: 11 },
      rear: { re: 118, pistons: 1, pistonD: 46, mu: 0.38, discMass: 10.0, discOD: 300, discID: 190, padArea: 48, padThk: 10 },
      mcD: 26.99, pedalRatio: 4.1, boost: 6.0, jumpIn: 25, boostMax: 4500,
      deadTravel: 6, clearance: 0.27, calStiff: 13500, lineComp: 130, maxPressure: 12
    },
    {
      id: 'mpv', name: '家用MPV（示例）', short: '家用MPV',
      mass: 1850, L: 2850, h: 610, frontShare: 57, wheelR: 340,
      front: { re: 140, pistons: 2, pistonD: 45, mu: 0.38, discMass: 12.0, discOD: 330, discID: 205, padArea: 68, padThk: 11 },
      rear: { re: 115, pistons: 1, pistonD: 40, mu: 0.38, discMass: 9.0, discOD: 290, discID: 180, padArea: 46, padThk: 10 },
      mcD: 26.99, pedalRatio: 4.2, boost: 6.0, jumpIn: 26, boostMax: 4500,
      deadTravel: 6, clearance: 0.26, calStiff: 12500, lineComp: 125, maxPressure: 12
    }
  ];

  BT.deepClone = function (o) { return JSON.parse(JSON.stringify(o)); };
  BT.defaultVehicle = function () {
    const v = BT.deepClone(BT.PRESETS[1]);
    v.name = 'B级轿车 · 项目基准';
    return v;
  };
  BT.vehicle = BT.defaultVehicle();

  BT.presetById = function (id) { return BT.PRESETS.find(function (p) { return p.id === id; }); };

  /** Structural validation before a project/vehicle is used by the formulas. */
  BT.isValidVehicle = function (v) {
    if (!v || !v.front || !v.rear) return false;
    const pos = [v.mass, v.wheelR, v.L, v.h, v.mcD, v.pedalRatio, v.maxPressure,
      v.front.re, v.front.pistonD, v.front.pistons, v.front.mu, v.front.discMass, v.front.padArea,
      v.rear.re, v.rear.pistonD, v.rear.pistons, v.rear.mu, v.rear.discMass, v.rear.padArea,
      v.calStiff];
    if (pos.some(function (x) { return !(typeof x === 'number' && isFinite(x) && x > 0); })) return false;
    const sf = finite(v.frontShare, 0);
    return sf > 20 && sf < 85 && finite(v.boost, 0) >= 1;
  };

  /* ---------- areas & torque ---------- */
  BT.areaMC = function (v) {
    const d = finite(v && v.mcD, 0);
    return d > 0 ? Math.PI / 4 * d * d : 0;                 // mm2
  };
  BT.areaCaliper = function (ax) {
    if (!ax) return 0;
    const n = finite(ax.pistons, 0), d = finite(ax.pistonD, 0);
    return n > 0 && d > 0 ? n * Math.PI / 4 * d * d : 0;   // mm2, one side
  };

  /** Nm per MPa for one caliper (2 pads, effective radius) */
  BT.torquePerMPa = function (ax) {
    if (!ax) return 0;
    const mu = finite(ax.mu, 0), re = finite(ax.re, 0);
    return mu > 0 && re > 0 ? 2 * mu * BT.areaCaliper(ax) * re / 1000 : 0;
  };

  BT.derived = function (v) {
    v = v || BT.vehicle;
    const tf = BT.torquePerMPa(v.front);
    const tr = BT.torquePerMPa(v.rear);
    const sumT = tf + tr;
    const beta = sumT > 0 ? tf / sumT : 0.5;
    const wheelR = finite(v.wheelR, 0) / 1000;               // m
    const forcePerMPa = wheelR > 0 ? 2 * sumT / wheelR : 0;  // N per MPa at wheel
    const mass = finite(v.mass, 0);
    const decelPerMPa = mass > 0 && forcePerMPa > 0 ? forcePerMPa / (mass * G) : 0;
    return {
      areaMC: BT.areaMC(v),
      areaF: BT.areaCaliper(v.front),
      areaR: BT.areaCaliper(v.rear),
      torqueF: tf, torqueR: tr, beta: beta,
      forcePerMPa: forcePerMPa,
      decelPerMPa: decelPerMPa,
      staticFront: clamp(finite(v.frontShare, 0) / 100, 0, 1),
      phi0: BT.phi0(beta, v)
    };
  };

  /* ---------- load transfer ---------- */
  BT.axleLoads = function (z, v) {
    v = v || BT.vehicle;
    const mass = finite(v.mass, 0), L = finite(v.L, 0), h = finite(v.h, 0);
    const sf = clamp(finite(v.frontShare, 0) / 100, 0, 1);
    const zz = Math.max(0, finite(z, 0));
    if (!(mass > 0) || !(L > 0)) return { front: 0, rear: 0, total: 0, rearLift: false };
    const mg = mass * G;
    const frontRaw = mg * (sf + zz * h / L);
    const rearRaw = mg * (1 - sf - zz * h / L);
    return {
      front: Math.max(0, frontRaw),
      rear: Math.max(0, rearRaw),
      total: mg,
      rearLift: rearRaw <= 0
    };
  };

  BT.idealFrontShare = function (z, v) {
    v = v || BT.vehicle;
    const L = finite(v.L, 0), h = finite(v.h, 0);
    const sf = clamp(finite(v.frontShare, 0) / 100, 0, 1);
    if (!(L > 0)) return sf;
    return clamp(sf + Math.max(0, finite(z, 0)) * h / L, 0, 1);
  };

  BT.phi0 = function (beta, v) {
    v = v || BT.vehicle;
    const L = finite(v.L, 0), h = finite(v.h, 0);
    const sf = clamp(finite(v.frontShare, 0) / 100, 0, 1);
    if (!(L > 0) || !(h > 0)) return 0;
    return (clamp(finite(beta, 0.5), 0, 1) - sf) * L / h;
  };

  BT.betaForPhi0 = function (phi, v) {
    v = v || BT.vehicle;
    const L = finite(v.L, 0), h = finite(v.h, 0);
    const sf = clamp(finite(v.frontShare, 0) / 100, 0, 1);
    if (!(L > 0)) return sf;
    return clamp(sf + Math.max(0, finite(phi, 0)) * h / L, 0, 1);
  };

  BT.utilization = function (beta, z, v) {
    v = v || BT.vehicle;
    const L = finite(v.L, 0), h = finite(v.h, 0);
    const sf = clamp(finite(v.frontShare, 0) / 100, 0, 1);
    const b = clamp(finite(beta, 0.5), 0, 1);
    const zz = Math.max(0, finite(z, 0));
    if (!(L > 0)) return { front: 0, rear: 0, fzf: 0, fzr: 0 };
    const fzf = sf + zz * h / L;
    const fzr = 1 - sf - zz * h / L;
    return {
      front: zz > 0 && fzf > 0 ? b * zz / fzf : 0,
      rear: zz > 0 && fzr > 0 ? (1 - b) * zz / fzr : Infinity,
      fzf: fzf, fzr: fzr
    };
  };

  /** Maximum violation of the four sides of the f = z ± band. */
  BT.utilizationBandViolation = function (beta, z, v) {
    const u = BT.utilization(beta, z, v);
    const zz = Math.max(0, finite(z, 0));
    return Math.max(
      u.front - (zz + 0.07),
      (zz - 0.07) - u.front,
      u.rear - (zz + 0.07),
      (zz - 0.07) - u.rear
    );
  };

  /* ---------- brake force / torque ---------- */
  BT.brakeForceAtPressure = function (p, v) {
    v = v || BT.vehicle;
    const pp = Math.max(0, finite(p, 0));
    const wheelR = finite(v.wheelR, 0) / 1000;
    const mass = finite(v.mass, 0);
    const tf = BT.torquePerMPa(v.front) * pp;
    const tr = BT.torquePerMPa(v.rear) * pp;
    const ff = wheelR > 0 ? 2 * tf / wheelR : 0;
    const fr = wheelR > 0 ? 2 * tr / wheelR : 0;
    const total = ff + fr;
    return { tf: tf, tr: tr, ff: ff, fr: fr, total: total, decel: mass > 0 ? total / (mass * G) : 0 };
  };

  BT.pressureForDecel = function (z, v) {
    v = v || BT.vehicle;
    const d = BT.derived(v);
    const zz = Math.max(0, finite(z, 0));
    const mass = finite(v.mass, 0);
    if (!(d.forcePerMPa > 0) || !(mass > 0)) return Infinity;
    return zz * mass * G / d.forcePerMPa;
  };

  BT.maxDecel = function (v) {
    v = v || BT.vehicle;
    const pmax = Math.max(0, finite(v.maxPressure, 0));
    return BT.derived(v).decelPerMPa * pmax;
  };

  /* ---------- pedal / booster ---------- */
  /** Inverse simplified booster characteristic: rod force -> pedal force. */
  BT.pedalForceForPressure = function (p, v) {
    v = v || BT.vehicle;
    const pp = Math.max(0, finite(p, 0));
    if (!(pp > 0)) return 0;
    const A = BT.areaMC(v);
    if (!(A > 0)) return 0;
    const Frod = pp * A;                      // p[MPa] * A[mm2] = N
    const i = finite(v.pedalRatio, 0);
    const br = Math.max(1, finite(v.boost, 1));
    const Fj = Math.max(0, finite(v.jumpIn, 0));
    const Fmax = Math.max(0, finite(v.boostMax, 0));
    if (!(i > 0)) return 0;
    // Piecewise booster model: no boost below jump-in, rated boost above it,
    // then a linear no-boost segment once the maximum assist force is reached.
    let Fp;
    if (Frod <= i * Fj) {
      Fp = Frod / i;
    } else {
      Fp = Math.max(Fj, Frod / (i * br));
    }
    if (Frod > i * Fp + Fmax) Fp = (Frod - Fmax) / i;
    return Math.max(0, Fp);
  };

  /** Pedal travel (mm) at a given pressure, including clearances & compliance. */
  BT.pedalTravelAtPressure = function (p, v) {
    v = v || BT.vehicle;
    const pp = Math.max(0, finite(p, 0));
    const af = BT.areaCaliper(v.front), ar = BT.areaCaliper(v.rear);
    const A = BT.areaMC(v);
    const K = finite(v.calStiff, 0);
    const clearance = Math.max(0, finite(v.clearance, 0));
    const lineComp = Math.max(0, finite(v.lineComp, 0));
    const i = finite(v.pedalRatio, 0);
    if (!(A > 0) || !(K > 0)) return 0;
    const ff = pp * af, fr = pp * ar; // N per caliper
    const xf = clearance + ff / K;
    const xr = clearance + fr / K;
    const vol = 2 * af * xf + 2 * ar * xr + lineComp * pp; // mm3
    return (vol / A) * i + Math.max(0, finite(v.deadTravel, 0));
  };

  /* ---------- stopping distance ---------- */
  /** v0 m/s, tr reaction s, tb buildup s, a m/s2
   *  Braking distance assumes deceleration rises linearly from 0 to a over tb,
   *  then stays at a. Returns explicit build/steady segments so callers never
   *  have to re-derive them (which fails when the vehicle stops during build-up).
   */
  BT.stoppingDistance = function (o) {
    o = o || {};
    const v0 = Math.max(0, finite(o.v0, 0));
    const tr = Math.max(0, finite(o.tr, 0));
    const tb = Math.max(0, finite(o.tb, 0));
    const a = finite(o.a, 0);
    const reaction = v0 * tr;
    const zero = { total: reaction, reaction: reaction, braking: 0, build: 0, buildDistance: 0, steadyDistance: 0, tBuild: 0, tSteady: 0, stoppedDuringBuild: false };
    if (v0 <= 0) return zero;
    if (!(a > 0)) return { total: Infinity, reaction: reaction, braking: Infinity, build: tb, buildDistance: 0, steadyDistance: 0, tBuild: 0, tSteady: 0, stoppedDuringBuild: false };
    if (tb <= 0) {
      const steady = v0 * v0 / (2 * a);
      return { total: reaction + steady, reaction: reaction, braking: steady, build: 0, buildDistance: 0, steadyDistance: steady, tBuild: 0, tSteady: v0 / a, stoppedDuringBuild: false };
    }
    const tStopBuild = Math.sqrt(2 * v0 * tb / a);
    if (tStopBuild < tb) {
      const t = tStopBuild;
      const buildDistance = v0 * t - a * t * t * t / (6 * tb);
      return { total: reaction + buildDistance, reaction: reaction, braking: buildDistance, build: tb, buildDistance: buildDistance, steadyDistance: 0, tBuild: t, tSteady: 0, stoppedDuringBuild: true };
    }
    const buildDistance = v0 * tb - a * tb * tb / 6;
    const v1 = Math.max(0, v0 - a * tb / 2);
    const steadyDistance = v1 * v1 / (2 * a);
    return { total: reaction + buildDistance + steadyDistance, reaction: reaction, braking: buildDistance + steadyDistance, build: tb, buildDistance: buildDistance, steadyDistance: steadyDistance, tBuild: tb, tSteady: v1 / a, stoppedDuringBuild: false };
  };

  BT.avgDecelForDistance = function (v0, distance) {
    const v = Math.max(0, finite(v0, 0));
    const s = finite(distance, 0);
    if (!(v > 0) || !(s > 0)) return 0;
    return v * v / (2 * s);
  };

  /* ---------- thermal ---------- */
  BT.BRAKE_CP = 500; // J/(kg.K), cast iron / steel disc
  BT.thermal = function (o) {
    o = o || {};
    const m = Math.max(0, finite(o.mass, 0));
    const v0 = Math.max(0, finite(o.v0, 0));
    const betaF = clamp(finite(o.beta, 0.5), 0, 1);
    const discMassF = Math.max(0, finite(o.discMassF, 0));
    const discMassR = Math.max(0, finite(o.discMassR, 0));
    const discShare = clamp(finite(o.discShare, 0.86), 0, 1);
    const cp = Math.max(1, finite(o.cp, BT.BRAKE_CP));
    const E = 0.5 * m * v0 * v0;
    const shareF = betaF, shareR = 1 - betaF;
    return {
      energy: E,
      front: E * shareF,
      rear: E * shareR,
      dTF: discMassF > 0 ? E * shareF * discShare / (2 * discMassF * cp) : 0,
      dTR: discMassR > 0 ? E * shareR * discShare / (2 * discMassR * cp) : 0
    };
  };

  BT.coolCurve = function (o) {
    o = o || {};
    const n = Math.max(1, Math.round(finite(o.stops, 1)));
    const ambient = finite(o.ambient, 0);
    const deltaT = finite(o.deltaT, 0);
    const interval = Math.max(0, finite(o.interval, 0));
    const tau = Math.max(1e-6, finite(o.tau, 1));
    const out = [];
    let T = ambient;
    let peak = T;
    for (let i = 1; i <= n; i++) {
      T += deltaT;
      peak = Math.max(peak, T);
      out.push([i, T]);
      T = ambient + (T - ambient) * Math.exp(-interval / tau);
    }
    return { points: out, peak: peak };
  };

  /* ---------- parking ---------- */
  /** Grade-holding demand for a rear-axle parking brake.
   *  grade in %, mass kg, muPad pad friction, sf safety factor,
   *  wheelR/re in mm. Returns forces in N, torque in Nm, clamp in N.
   */
  BT.parkingDemand = function (o) {
    o = o || {};
    const grade = Math.max(0, finite(o.grade, 0));
    const mass = Math.max(0, finite(o.mass, 0));
    const mu = Math.max(0.01, finite(o.mu, 0.38));
    const sf = Math.max(1, finite(o.sf, 1));
    const rWheel = Math.max(0.001, finite(o.wheelR, 0) / 1000);
    const rEff = Math.max(0.001, finite(o.re, 0) / 1000);
    const theta = Math.atan(grade / 100);
    const F = mass * G * Math.sin(theta) * sf;
    const perWheel = F / 2;
    const torque = perWheel * rWheel;
    const clamp = torque / (2 * mu * rEff);
    return { theta: theta, F: F, perWheel: perWheel, torque: torque, clamp: clamp };
  };

  /* ---------- energy / regen ---------- */
  BT.kineticEnergy = function (mass, v0) {
    return 0.5 * Math.max(0, finite(mass, 0)) * Math.pow(Math.max(0, finite(v0, 0)), 2);
  };

  /* ---------- unit helpers ---------- */
  BT.kmh = function (ms) { return ms * 3.6; };
  BT.ms = function (kmh) { return kmh / 3.6; };
  BT.g = G;

  /* ---------- default scenario values ---------- */
  BT.defaults = {
    decel: 0.8,
    speed: 100,
    reaction: 0.35,
    buildup: 0.20,
    muRoad: 0.9,
    ambient: 30,
    cp: 500,
    discShare: 0.86
  };
})(window.BT);
