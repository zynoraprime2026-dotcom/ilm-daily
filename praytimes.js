// praytimes.js — offline prayer time calculation (MWL method), Ilm Daily
// Standard solar-position algorithm (same formulas as PrayTimes.org / Salat Alarm app).
(function () {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const sin = d => Math.sin(d * D2R), cos = d => Math.cos(d * D2R),
        tan = d => Math.tan(d * D2R), asin = x => Math.asin(x) * R2D,
        acos = x => Math.acos(x) * R2D, atan2 = (y, x) => Math.atan2(y, x) * R2D;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPos(jd) {
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360);
    const q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = fix(atan2(cos(e) * sin(L), cos(L)), 360) / 15;
    return { decl: asin(sin(e) * sin(L)), eqT: q / 15 - RA };
  }

  // times in local hours; tz = hours offset from UTC (e.g. Ghana = 0)
  function computeTimes(date, lat, lng, tz) {
    const jdate = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    const jnoon = jdate + 0.5; // noon of that julian date at 0h
    const { decl, eqT } = sunPos(jnoon + 0.5 - lng / (15 * 24) * 0);
    const midDay = fix(12 - eqT, 24);
    const angleTime = (angle, dir) => {
      const t = (1 / 15) * acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat)));
      return dir === "ccw" ? midDay - t : midDay + t;
    };
    // Asr (Shafi'i, factor 1): shadow length 1 → sun altitude = arccot(1 + tan|lat - decl|)
    const asrAltitude = atan2(1, 1 + tan(Math.abs(lat - decl)));
    const sunAltTime = (alt, dir) => {
      const t = (1 / 15) * acos((sin(alt) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat)));
      return dir === "ccw" ? midDay - t : midDay + t;
    };
    let asr;
    // MWL: Fajr 18°, Isha 17°. Sunrise/sunset: altitude -0.833 (refraction).
    let fajr = angleTime(18, "ccw");
    let sunrise = sunAltTime(-0.833, "ccw");
    let dhuhr = midDay + 1 / 60; // small safety
    asr = sunAltTime(asrAltitude, "cw");
    let maghrib = sunAltTime(-0.833, "cw");
    let isha = angleTime(17, "cw");
    const toClock = t => { t = fix(t + tz - lng / 15, 24); return t; };
    return {
      fajr: toClock(fajr), sunrise: toClock(sunrise), dhuhr: toClock(dhuhr),
      asr: toClock(asr), maghrib: toClock(maghrib), isha: toClock(isha)
    };
  }

  // returns { fajr, sunrise, dhuhr, asr, maghrib, isha } as "HH:MM" (24h) strings
  window.prayTimes = function (date, lat, lng, tzOffsetHours) {
    const tz = tzOffsetHours !== undefined ? tzOffsetHours : -date.getTimezoneOffset() / 60;
    const t = computeTimes(date, lat, lng, tz);
    const fmt = h => {
      h = fix(h + 0.5 / 60, 24); // round half-minute up
      const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };
    const out = {};
    for (const k of ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]) out[k] = fmt(t[k]);
    return out;
  };
})();
