// src/stream.ts
var Stream = class {
  constructor(fn, lb = 0) {
    this.fn = fn;
    this.lb = lb;
  }
  pipe(op) {
    return new Stream((source) => op.fn(this.fn(source)), this.lb + op.lb);
  }
  init() {
    let n;
    let v;
    this.fn((next) => {
      n = next;
    })((value) => {
      v = value;
    });
    return (value) => {
      n == null ? void 0 : n(value);
      return v;
    };
  }
};
function invariant(condition, message) {
  if (!condition)
    throw new Error(message);
}
var Router = class {
  constructor() {
    this.h = [];
    this.s = (next) => {
      this.h.push(next);
    };
  }
  push(value) {
    for (let i = 0; i < this.h.length; i++) {
      this.h[i](value);
    }
  }
  add(op, next) {
    op.fn(this.s)(next);
  }
};
var RollingList = class {
  constructor(size) {
    this.size = size;
    this.length = 0;
    this.index = -1;
    invariant(size > 0);
    this.items = Array(size);
  }
  push(item) {
    const index2 = this.length % this.size;
    const current = this.items[index2];
    this.items[index2] = item;
    this.length++;
    this.index++;
    return current;
  }
  get(index2 = 0) {
    invariant(index2 >= 0 && index2 < this.size && index2 < this.length, "RollingList index out of bounds");
    return this.items[(this.index - index2) % this.size];
  }
};
var identity = () => new Stream((x) => x);
var makeOperator = (fn, lb = 0) => new Stream((source) => (next) => source(fn(next)), lb);
var makeStatefulMap = (fn) => new Stream((source) => (next) => {
  const mapper = fn();
  source((value) => next(mapper(value)));
});
var map = (callback) => makeStatefulMap(() => {
  let i = 0;
  return (value) => callback(value, i++);
});
var scan = (callback, initialValue) => makeStatefulMap(() => {
  let state = initialValue;
  let i = 0;
  return (value) => {
    state = callback(state, value, i++);
    return state;
  };
});
var skip = (count) => makeOperator((next) => {
  let i = 0;
  return (value) => {
    if (++i > count) {
      next(value);
    }
  };
}, count);
var flatMap = (mapper) => makeStatefulMap(() => (value) => mapper(...value));
var mapWithLast = (mapper, firstResult) => makeOperator((next) => {
  let prev;
  return (val) => {
    if (prev !== void 0) {
      next(mapper(val, prev));
    } else if (firstResult !== void 0) {
      next(firstResult);
    }
    prev = val;
  };
}, firstResult !== void 0 ? 0 : 1);
var lag = (period, initialValue) => makeOperator((next) => {
  if (period === 1) {
    let prev = initialValue;
    return (val) => {
      const value = prev;
      if (value !== void 0)
        next(value);
      prev = val;
    };
  } else {
    const inputs = new RollingList(period);
    return (head) => {
      const tail = inputs.push(head);
      const value = tail ?? initialValue;
      if (value !== void 0)
        next(value);
    };
  }
}, initialValue !== void 0 ? 0 : period);
var forkWithLag = (period, initialValue) => makeOperator((next) => {
  if (period === 1) {
    let prev = initialValue;
    return (val) => {
      if (prev !== void 0)
        next([val, prev]);
      prev = val;
    };
  } else {
    const inputs = new RollingList(period);
    return (head) => {
      const tail = inputs.push(head) ?? initialValue;
      if (tail !== void 0)
        next([head, tail]);
    };
  }
}, initialValue !== void 0 ? 0 : period);
var memAll = (period, skip2 = false) => makeOperator((next) => {
  const inputs = new RollingList(period);
  return (head) => {
    inputs.push(head);
    if (!skip2 || inputs.length >= inputs.size)
      next(inputs);
  };
}, skip2 ? period - 1 : 0);
var matchItem = (period, matcher) => memAll(period, true).pipe(makeStatefulMap(() => {
  let d = period - 1;
  return (inputs) => {
    if (++d < period) {
      if (matcher(inputs.get(d), inputs.get())) {
        d = 0;
      }
      return inputs.get(d);
    }
    d = period - 1;
    for (let i = period - 2; i >= 0; i--) {
      if (matcher(inputs.get(d), inputs.get(i))) {
        d = i;
      }
    }
    return inputs.get(d);
  };
}));
var matchDistance = (period, matcher) => memAll(period, true).pipe(scan((prev, inputs) => {
  let next = prev + 1;
  if (next < period) {
    return matcher(inputs.get(next), inputs.get()) ? 0 : next;
  }
  next = prev;
  for (let i = period - 2; i >= 0; i--) {
    if (matcher(inputs.get(next), inputs.get(i))) {
      next = i;
    }
  }
  return next;
}, period - 1));
function mapFork(ops) {
  const keys = Object.keys(ops);
  let lb = 0;
  for (const key of keys) {
    if (ops[key].lb > lb)
      lb = ops[key].lb;
  }
  return makeOperator((next) => {
    let values = {};
    const router = new Router();
    for (const key of keys) {
      router.add(ops[key], (value) => {
        values[key] = value;
      });
    }
    let i = 0;
    return (value) => {
      router.push(value);
      if (++i > lb) {
        next(values);
        values = {};
      }
    };
  }, lb);
}
function listFork(ops) {
  let lb = ops[0].lb;
  for (let i = 1; i < ops.length; i++) {
    if (ops[i].lb > lb)
      lb = ops[i].lb;
  }
  return makeOperator((next) => {
    let values = Array(ops.length);
    const router = new Router();
    for (let i2 = 0; i2 < ops.length; i2++) {
      const index2 = i2;
      router.add(ops[index2], (value) => {
        values[index2] = value;
      });
    }
    let i = 0;
    return (value) => {
      router.push(value);
      if (++i > lb) {
        next(values);
        values = Array(ops.length);
      }
    };
  }, lb);
}
function fastListFork(ops) {
  return makeOperator((next) => {
    let values = Array(ops.length);
    const router = new Router();
    for (let i = 0; i < ops.length; i++) {
      const index2 = i;
      router.add(ops[index2], (value) => {
        values[index2] = value;
      });
    }
    return (value) => {
      router.push(value);
      next(values);
      values = Array(ops.length);
    };
  });
}
function fork(...ops) {
  return listFork(ops);
}
function fastFork(...ops) {
  return fastListFork(ops);
}
function pipe(...ops) {
  let lb = 0;
  for (let i = 0; i < ops.length; i++) {
    lb += ops[i].lb;
  }
  return new Stream((input) => {
    let s = input;
    for (let i = 0; i < ops.length; i++) {
      s = ops[i].fn(s);
    }
    return s;
  }, lb);
}

// src/math.ts
import Decimal from "decimal.js";
var ZERO = new Decimal(0);
var ONE = new Decimal(1);
var HUNDRED = new Decimal(100);
var factors = {
  d: (period) => (period - 1) / period,
  e: (period) => 2 / (period + 1)
};
var wrapBinaryOperator = (op) => (short, long) => pipe(fork(short, long), op);
var oscillate = {
  diff_over_long: flatMap((short, long) => short.minus(long).div(long).times(HUNDRED)),
  diff_over_short: flatMap((short, long) => short.minus(long).div(short).times(HUNDRED)),
  short_over_sum: flatMap((short, long) => short.div(short.plus(long)).times(HUNDRED)),
  diff_over_sum: flatMap((short, long) => short.minus(long).div(short.plus(long)).times(HUNDRED))
};
var oscillators = {
  diff_over_long: wrapBinaryOperator(oscillate.diff_over_long),
  diff_over_short: wrapBinaryOperator(oscillate.diff_over_short),
  short_over_sum: wrapBinaryOperator(oscillate.short_over_sum),
  diff_over_sum: wrapBinaryOperator(oscillate.diff_over_sum)
};
var minus = wrapBinaryOperator(flatMap((a, b) => a.minus(b)));
var div = (short, long, multiplier = ONE) => pipe(fork(short, long), flatMap((a, b) => a.div(b).times(multiplier)));
var stoch = (close, short, long, multiplier = ONE) => pipe(fork(close, short, long), flatMap((close2, short2, long2) => close2.minus(long2).div(short2.minus(long2)).times(multiplier)));
var multiplyBy = (factor) => map((n) => n.times(factor));
var divideBy = (divider) => map((n) => n.div(divider));
var index = scan((count) => count + 1, -1);
var sum = (period) => pipe(forkWithLag(period, ZERO), scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO), skip(period - 1));
var weighted_sum = (period) => pipe(fork(map((value, index2) => value.times(Math.min(period, index2 + 1))), pipe(forkWithLag(period, ZERO), scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO), lag(1, ZERO), map((sum2, index2) => index2 < period ? ZERO : sum2))), scan((wsum, [wvalue, sum2]) => wsum.plus(wvalue).minus(sum2), ZERO), skip(period - 1));
var crossany = mapWithLast(([a, b], [last_a, last_b]) => a.gt(b) && last_a.lte(last_b) || a.lt(b) && last_a.gte(last_b) ? 1 : 0);
var crossover = mapWithLast(([a, b], [last_a, last_b]) => a.gt(b) && last_a.lte(last_b) ? 1 : 0);
var decay = (period) => scan((decay2, value) => Decimal.max(value, decay2.minus(1 / period), ZERO), ZERO);
var edecay = (period) => scan((decay2, value) => Decimal.max(value, decay2.times(period - 1).div(period), ZERO), ZERO);
var max = (period) => matchItem(period, (current, next) => next.gte(current));
var min = (period) => matchItem(period, (current, next) => next.lte(current));
var max_distance = (period) => matchDistance(period, (current, next) => next.gte(current));
var min_distance = (period) => matchDistance(period, (current, next) => next.lte(current));
var custom_ema = (factor) => scan((ema2, val, index2) => index2 === 0 ? val : val.times(factor).plus(ema2.times(1 - factor)), ZERO);
var ema = (period) => custom_ema(factors.e(period));
var double_ema = (period, factor) => pipe(custom_ema(factor), skip(period - 1), custom_ema(factor), skip(period - 1));
var triple_ema = (period, factor) => pipe(custom_ema(factor), skip(period - 1), custom_ema(factor), skip(period - 1), custom_ema(factor), skip(period - 1));
var custom_dema = (period, factor) => pipe(fork(custom_ema(factor), double_ema(period, factor)), flatMap((ema1, ema2) => ema1.times(2).minus(ema2)));
var dema = (period) => custom_dema(period, factors.e(period));
var custom_tema = (period, factor) => pipe(fork(custom_ema(factor), double_ema(period, factor), triple_ema(period, factor)), flatMap((ema1, ema2, ema3) => ema1.times(3).minus(ema2.times(3)).plus(ema3)));
var tema = (period) => custom_tema(period, factors.e(period));
var custom_trix = (period, factor) => pipe(triple_ema(period, factor), forkWithLag(1), oscillate.diff_over_short);
var trix = (period) => custom_trix(period, factors.e(period));
var custom_dm_smoother = (period, factor) => pipe(scan((val, input, index2) => index2 < period ? val.plus(input) : val.times(factor).plus(input), ZERO), skip(period - 1));
var sma = (period) => pipe(sum(period), divideBy(period));
var wilders = (period) => pipe(scan((wilders2, input, index2) => {
  if (index2 < period) {
    wilders2 = wilders2.plus(input);
  }
  if (index2 === period - 1) {
    wilders2 = wilders2.div(period);
  }
  if (index2 > period - 1) {
    wilders2 = input.minus(wilders2).div(period).plus(wilders2);
  }
  return wilders2;
}, ZERO), skip(period - 1));
var wma = (period) => pipe(weighted_sum(period), divideBy(period * (period + 1) / 2));
var hma = (period) => pipe(fork(wma(Math.floor(period / 2)), wma(period)), flatMap((wma1, wma2) => wma1.times(2).minus(wma2)), wma(Math.floor(Math.sqrt(period))));
var custom_zlema = (factor, lag2) => pipe(forkWithLag(lag2, ZERO), skip(lag2 - 1), map(([head, tail], index2) => index2 === 0 ? head : head.plus(head.minus(tail))), custom_ema(factor));
var zlema = (period) => custom_zlema(factors.e(period), Math.floor((period - 1) / 2));
var kama = (period) => {
  const f = new Decimal(2).div(3);
  const s = new Decimal(2).div(31);
  const fs = f.minus(s);
  return pipe(fork(pipe(div(pipe(forkWithLag(period, ZERO), flatMap((head, tail) => head.minus(tail).abs())), pipe(mapWithLast((head, tail) => head.minus(tail).abs(), ZERO), sum(period))), map((e) => e.times(fs).plus(s).pow(2))), identity()), scan((kama2, [s2, val], index2) => index2 > 0 ? val.minus(kama2).times(s2).plus(kama2) : val, ZERO));
};
var trima = (period) => pipe(fork(identity(), pipe(forkWithLag(Math.floor(period / 2), ZERO), scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO), lag(1, ZERO), map((sum2, index2) => index2 < Math.floor(period / 2) + 1 ? ZERO : sum2)), pipe(forkWithLag(Math.ceil(period / 2), ZERO), scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO), lag(Math.floor(period / 2) + 1, ZERO), map((sum2, index2) => index2 < period ? ZERO : sum2))), map(([value, lsum, tsum]) => value.plus(lsum).minus(tsum)), scan((wsum, delta) => wsum.plus(delta), ZERO), skip(period - 1), divideBy(period % 2 ? (Math.floor(period / 2) + 1) * (Math.floor(period / 2) + 1) : (Math.floor(period / 2) + 1) * Math.floor(period / 2)));
var md = (period) => pipe(fork(sma(period), memAll(period, true)), flatMap((sma2, inputs) => {
  let sum2 = ZERO;
  for (let i = 0; i < period; i++) {
    sum2 = sum2.plus(inputs.get(i).minus(sma2).abs());
  }
  return sum2.div(period);
}));
var custom_variance = (smoother) => pipe(fork(pipe(map((n) => n.pow(2)), smoother), pipe(smoother, map((n) => n.pow(2)))), flatMap((p2, p1) => p2.minus(p1)));
var custom_stddev = (smoother) => pipe(custom_variance(smoother), map((n) => n.sqrt()));
var custom_stderr = (period, smoother) => pipe(custom_stddev(smoother), divideBy(new Decimal(period).sqrt()));
var custom_volatility = (duration, smoother) => pipe(mapWithLast((input, last) => input.div(last).minus(1)), custom_stddev(smoother), multiplyBy(new Decimal(duration).sqrt()));
var variance = (period) => custom_variance(sma(period));
var stddev = (period) => custom_stddev(sma(period));
var stderr = (period) => custom_stderr(period, sma(period));
var volatility = (period) => custom_volatility(252, sma(period));
var custom_apo = (short, long) => minus(short, long);
var custom_ppo = (short, long) => oscillators.diff_over_long(short, long);
var apo = (short, long) => pipe(custom_apo(ema(short), ema(long)), skip(1));
var ppo = (short, long) => pipe(custom_ppo(ema(short), ema(long)), skip(1));
var custom_macd = (short, long, signal, longPeriod) => pipe(minus(short, long), skip(longPeriod - 1), fork(identity(), signal), flatMap((macd2, signal2) => [
  macd2,
  signal2,
  macd2.minus(signal2)
]));
var macd = (short, long, signal) => {
  const isSpecial = short === 12 && long === 26;
  return custom_macd(custom_ema(isSpecial ? 0.15 : factors.e(short)), custom_ema(isSpecial ? 0.075 : factors.e(long)), ema(signal), long);
};
var gains = mapWithLast((input, last) => input.gt(last) ? input.minus(last) : ZERO);
var losses = mapWithLast((input, last) => input.lt(last) ? last.minus(input) : ZERO);
var custom_cmo = (smoother) => oscillators.diff_over_sum(pipe(gains, smoother), pipe(losses, smoother));
var custom_rsi = (smoother) => oscillators.short_over_sum(pipe(gains, smoother), pipe(losses, smoother));
var custom_stochrsi = (period, smoother) => pipe(custom_rsi(smoother), stoch(identity(), max(period), min(period)));
var rsi = (period) => custom_rsi(wilders(period));
var stochrsi = (period) => custom_stochrsi(period, wilders(period));
var cmo = (period) => custom_cmo(sum(period));
var custom_dpo = (period, smoother) => minus(lag(Math.floor(period / 2) + 1, ZERO), smoother);
var dpo = (period) => custom_dpo(period, sma(period));
var mom = (period) => pipe(forkWithLag(period), flatMap((head, tail) => head.minus(tail)));
var roc = (period) => pipe(forkWithLag(period), flatMap((head, tail) => head.minus(tail).div(tail)));
var rocr = (period) => pipe(forkWithLag(period), flatMap((head, tail) => head.div(tail)));
var vhf = (period) => pipe(fork(pipe(mapWithLast((val, last) => val.minus(last).abs()), sum(period)), max(period), min(period)), flatMap((sum2, max2, min2) => max2.minus(min2).abs().div(sum2)));
var bbands = (period, scale) => pipe(fork(sma(period), custom_stddev(sma(period))), flatMap((middle, stddev2) => {
  const dev = stddev2.times(scale);
  return [middle.minus(dev), middle, middle.plus(dev)];
}));
var custom_vidya = (short, long, factor, long_period) => pipe(fastFork(pipe(fork(custom_stddev(short), custom_stddev(long)), flatMap((short2, long2) => short2.div(long2).times(factor))), identity()), skip(long_period - 2), scan((vidya2, [s, val], index2) => index2 > 0 ? val.times(s).plus(vidya2.times(ONE.minus(s))) : val, ZERO));
var vidya = (short, long, factor) => custom_vidya(sma(short), sma(long), factor, long);
var linregslope = (period) => {
  const x = period * (period + 1) / 2;
  const x2 = period * (period + 1) * (period * 2 + 1) / 6;
  const bd = period * x2 - x * x;
  return pipe(fork(weighted_sum(period), sum(period)), flatMap((xy, y) => xy.times(period).minus(y.times(x)).div(bd)));
};
var linreg_forecast = (period, forecast) => {
  const x = forecast - (period + 1) / 2;
  return pipe(fork(sma(period), linregslope(period)), flatMap((y, b) => y.plus(b.times(x))));
};
var linregintercept = (period) => linreg_forecast(period, 1);
var linreg = (period) => linreg_forecast(period, period);
var tsf = (period) => linreg_forecast(period, period + 1);
var fosc = (period) => oscillators.diff_over_short(identity(), pipe(tsf(period), lag(1)));
var msw = (period) => pipe(memAll(period, true), skip(1), map((inputs) => {
  let rp = ZERO;
  let ip = ZERO;
  for (let i = 0; i < period; i++) {
    const weight = inputs.get(i);
    const a = new Decimal(2 * Math.PI * i / period);
    rp = rp.plus(a.cos().times(weight));
    ip = ip.plus(a.sin().times(weight));
  }
  let phase = rp.abs().gt(1e-3) ? ip.div(rp).atan() : new Decimal(Math.PI * (ip.lt(0) ? -1 : 1));
  if (rp.lt(0)) {
    phase = phase.plus(Math.PI);
  }
  phase = phase.plus(Math.PI / 2);
  if (phase.lt(0)) {
    phase = phase.plus(2 * Math.PI);
  }
  if (phase.gt(2 * Math.PI)) {
    phase = phase.minus(2 * Math.PI);
  }
  return [phase.sin(), phase.plus(Math.PI / 4).sin()];
}));

// src/indicators.ts
import Decimal2 from "decimal.js";
var MIN_VOLUME = new Decimal2(1e-8);
var openprice = map((candle) => candle.open);
var highprice = map((candle) => candle.high);
var lowprice = map((candle) => candle.low);
var closeprice = map((candle) => candle.close);
var volume = map((candle) => candle.volume);
var nzvolume = map((candle) => candle.volume.gt(0) ? candle.volume : MIN_VOLUME);
var range = map((candle) => candle.high.minus(candle.low));
var avgprice = map((candle) => candle.open.plus(candle.high).plus(candle.low).plus(candle.close).div(4));
var medprice = map((candle) => candle.high.plus(candle.low).div(2));
var typprice = map((candle) => candle.high.plus(candle.low).plus(candle.close).div(3));
var wcprice = map((candle) => candle.high.plus(candle.low).plus(candle.close).plus(candle.close).div(4));
var ha_close = avgprice;
var ha_open = pipe(ha_close, scan((open, close, index2) => index2 === 0 ? close : open.plus(close).div(2), ZERO));
var ha_high = pipe(fork(highprice, ha_open, ha_close), flatMap((high, open, close) => Decimal2.max(high, open, close)));
var ha_low = pipe(fork(lowprice, ha_open, ha_close), flatMap((low, open, close) => Decimal2.min(low, open, close)));
var ad = scan((ad2, candle) => {
  const hl = candle.high.minus(candle.low);
  if (hl.eq(0))
    return ad2;
  return ad2.plus(candle.close.minus(candle.low).minus(candle.high).plus(candle.close).div(hl).times(candle.volume));
}, ZERO);
var custom_adosc = (short, long) => pipe(ad, minus(short, long));
var adosc = (shortPeriod, longPeriod) => pipe(custom_adosc(ema(shortPeriod), ema(longPeriod)), skip(longPeriod - 1));
var ao = pipe(medprice, minus(sma(5), sma(34)));
var aroonify = (period) => {
  const factor = HUNDRED.div(period);
  return map((distance) => factor.times(period - distance));
};
var aroon_up = (period) => pipe(highprice, max_distance(period + 1), aroonify(period));
var aroon_down = (period) => pipe(lowprice, min_distance(period + 1), aroonify(period));
var aroon = (period) => fork(aroon_down(period), aroon_up(period));
var aroonosc = (period) => minus(aroon_up(period), aroon_down(period));
var custom_dm_smoother2 = (period) => custom_dm_smoother(period, factors.d(period));
var custom_adx = (dm_smoother, dx_smoother) => pipe(custom_dx(dm_smoother), dx_smoother);
var adx = (period) => {
  const smoother = custom_dm_smoother2(period);
  return custom_adx(smoother, pipe(smoother, map((val) => val.div(period))));
};
var adx_slope = (adx_period, slope_period) => pipe(adx(adx_period), forkWithLag(slope_period), flatMap((adx2, prev) => adx2.minus(prev).div(slope_period)));
var custom_adxr = (dm_smoother, dx_smoother, period) => pipe(custom_adx(dm_smoother, dx_smoother), forkWithLag(period - 1), flatMap((head, tail) => head.plus(tail).div(2)));
var adxr = (period) => {
  const smoother = custom_dm_smoother2(period);
  return custom_adxr(smoother, pipe(smoother, map((val) => val.div(period))), period);
};
var custom_atr = (smoother, skipFirst) => pipe(custom_tr(skipFirst), smoother);
var atr = (period) => custom_atr(wilders(period), false);
var custom_di = (dm_smoother, tr_smoother) => fork(div(dm_up_smooth(dm_smoother), custom_atr(tr_smoother, true), HUNDRED), div(dm_down_smooth(dm_smoother), custom_atr(tr_smoother, true), HUNDRED));
var di = (period) => {
  const smoother = custom_dm_smoother2(period);
  return custom_di(smoother, smoother);
};
var dm_up = mapWithLast((candle, last) => {
  const up = candle.high.minus(last.high);
  const down = last.low.minus(candle.low);
  return up.gt(down) && up.gt(0) ? up : ZERO;
}, ZERO);
var dm_down = mapWithLast((candle, last) => {
  const up = candle.high.minus(last.high);
  const down = last.low.minus(candle.low);
  return down.gt(up) && down.gt(0) ? down : ZERO;
}, ZERO);
var dm_up_smooth = (smoother) => pipe(dm_up, smoother);
var dm_down_smooth = (smoother) => pipe(dm_down, smoother);
var custom_dm = (smoother) => fork(dm_up_smooth(smoother), dm_down_smooth(smoother));
var custom_dx = (dm_smoother) => pipe(oscillators.diff_over_sum(dm_up_smooth(dm_smoother), dm_down_smooth(dm_smoother)), map((val) => val.abs()));
var dm = (period) => custom_dm(custom_dm_smoother2(period));
var dx = (period) => custom_dx(custom_dm_smoother2(period));
var custom_tr = (skipFirst = false) => makeStatefulMap(() => {
  let prev;
  return (candle) => {
    const last = prev;
    prev = candle;
    return last ? Decimal2.max(candle.high.minus(candle.low), candle.high.minus(last.close).abs(), candle.low.minus(last.close).abs()) : skipFirst ? ZERO : candle.high.minus(candle.low);
  };
});
var tr = () => custom_tr(false);
var cci = (period) => pipe(typprice, fork(identity(), sma(period), md(period)), skip(period - 1), flatMap((tp, atp, md2) => tp.minus(atp).div(md2.times(0.015))));
var bop = map((candle) => candle.close.minus(candle.open).div(candle.high.minus(candle.low)));
var custom_cvi = (period, smoother) => pipe(range, smoother, roc(period), multiplyBy(HUNDRED));
var cvi = (period) => custom_cvi(period, pipe(ema(period), skip(period - 1)));
var marketfi = map((candle) => candle.high.minus(candle.low).div(candle.volume));
var custom_emv = (scale) => pipe(fork(pipe(medprice, mapWithLast((hl, last) => hl.minus(last))), marketfi), flatMap((hl, marketfi2) => hl.times(marketfi2).times(scale)));
var emv = custom_emv(1e4);
var kvo_trend = pipe(map((candle) => candle.high.plus(candle.low).plus(candle.close)), makeStatefulMap(() => {
  let trend = -1;
  let prev;
  return (hlc) => {
    if (prev && hlc.gt(prev)) {
      trend = 1;
    }
    if (prev && hlc.lt(prev)) {
      trend = -1;
    }
    prev = hlc;
    return trend;
  };
}));
var kvo_cm = pipe(fork(pipe(kvo_trend, mapWithLast((trend, last) => trend === last, true)), pipe(range, forkWithLag(1))), scan((cm, [trend, [dm2, last_dm]]) => (trend ? cm : last_dm).plus(dm2), ZERO));
var custom_kvo = (short, long) => pipe(fork(volume, kvo_trend, range, kvo_cm), flatMap((volume2, trend, dm2, cm) => HUNDRED.times(volume2).times(trend).times(dm2.div(cm).times(2).minus(1).abs())), minus(short, long));
var kvo = (short, long) => custom_kvo(ema(short), ema(long));
var custom_mass = (period, ema_period, factor) => pipe(range, div(custom_ema(factor), double_ema(ema_period, factor)), sum(period));
var mass = (period) => custom_mass(period, 9, factors.e(9));
var mfi = (period) => pipe(fork(pipe(typprice, forkWithLag(1)), nzvolume), oscillators.short_over_sum(pipe(flatMap(([tp, last_tp], volume2) => tp.gt(last_tp) ? tp.times(volume2) : ZERO), sum(period)), pipe(flatMap(([tp, last_tp], volume2) => tp.lt(last_tp) ? tp.times(volume2) : ZERO), sum(period))));
var custom_natr = (smoother) => div(custom_atr(smoother, false), closeprice, HUNDRED);
var natr = (period) => custom_natr(wilders(period));
var vi = (condition) => pipe(fork(pipe(volume, mapWithLast(condition, false)), pipe(closeprice, mapWithLast((close, last) => close.minus(last).div(last), ZERO))), flatMap((check, close) => check ? close : ZERO), scan((vi2, extra) => vi2.plus(vi2.times(extra)), new Decimal2(1e3)));
var pvi = vi((volume2, last) => volume2.gt(last));
var nvi = vi((volume2, last) => volume2.lt(last));
var obv = pipe(fork(pipe(closeprice, mapWithLast((close, last) => close.comparedTo(last), 0)), volume), scan((obv2, [change, volume2]) => obv2.plus(volume2.times(change)), ZERO));
var qstick = (period) => pipe(map((candle) => candle.close.minus(candle.open)), sma(period));
var custom_stoch = (fast_k_period, k_smoother, d_smoother) => pipe(stoch(closeprice, pipe(highprice, max(fast_k_period)), pipe(lowprice, min(fast_k_period)), HUNDRED), k_smoother, fork(identity(), d_smoother));
var stoch2 = (period1, period2, period3) => custom_stoch(period1, sma(period2), sma(period3));
var ultosc = (period1, period2, period3) => pipe(fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))), flatMap((high, low, [close, prevClose]) => {
  const tl = Decimal2.min(low, prevClose);
  const th = Decimal2.max(high, prevClose);
  return [close.minus(tl), th.minus(tl)];
}), fork(pipe(map((bpr) => bpr[0]), fork(sum(period1), sum(period2), sum(period3))), pipe(map((bpr) => bpr[1]), fork(sum(period1), sum(period2), sum(period3)))), flatMap(([bp1, bp2, bp3], [r1, r2, r3]) => bp1.div(r1).times(4).plus(bp2.div(r2).times(2)).plus(bp3.div(r3)).times(HUNDRED).div(7)));
var vosc = (fast, slow) => pipe(nzvolume, oscillators.diff_over_long(sma(fast), sma(slow)));
var wad = pipe(fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))), flatMap((high, low, [close, prevClose]) => {
  if (close.gt(prevClose)) {
    return close.minus(Decimal2.min(low, prevClose));
  }
  if (close.lt(prevClose)) {
    return close.minus(Decimal2.max(high, prevClose));
  }
  return ZERO;
}), scan((wad2, ad2) => wad2.plus(ad2), ZERO));
var willr = (period) => stoch(closeprice, pipe(lowprice, min(period)), pipe(highprice, max(period)), -100);
var vwma = (period) => div(pipe(map((candle) => candle.volume.times(candle.close)), sum(period)), pipe(nzvolume, sum(period)));
var fisher = (period) => pipe(medprice, stoch(identity(), max(period), min(period)), scan((res, val) => val.minus(0.5).times(0.66).plus(res.times(0.67)), ZERO), map((val) => val.gt(0.99) ? new Decimal2(0.999) : val.lt(-0.99) ? new Decimal2(-0.999) : val), map((val) => ONE.plus(val).div(ONE.minus(val)).ln()), scan((fisher2, val) => val.times(0.5).plus(fisher2.times(0.5)), ZERO), forkWithLag(1, ZERO));
var psar = (accel_step, accel_max) => pipe(fork(pipe(highprice, memAll(3)), pipe(lowprice, memAll(3))), skip(1), makeStatefulMap(() => {
  let lng;
  let sar;
  let extreme;
  let accel = accel_step;
  return ([highs, lows]) => {
    const high = highs.get();
    const low = lows.get();
    if (highs.index === 1) {
      const lastHigh = highs.get(1);
      const lastLow = lows.get(1);
      lng = lastHigh.plus(lastLow).lte(high.plus(low));
      if (lng) {
        extreme = lastHigh;
        sar = lastLow;
      } else {
        extreme = lastLow;
        sar = lastHigh;
      }
    }
    sar = extreme.minus(sar).times(accel).plus(sar);
    if (lng) {
      if (highs.index >= 2) {
        sar = Decimal2.min(sar, lows.get(2));
      }
      sar = Decimal2.min(sar, lows.get(1));
      if (high > extreme) {
        extreme = high;
        accel = Math.min(accel_max, accel + accel_step);
      }
      if (low < sar) {
        sar = extreme;
        extreme = low;
        accel = accel_step;
        lng = false;
      }
    } else {
      if (highs.index >= 2) {
        sar = Decimal2.max(sar, highs.get(2));
      }
      sar = Decimal2.max(sar, highs.get(1));
      if (low < extreme) {
        extreme = low;
        accel = Math.min(accel_max, accel + accel_step);
      }
      if (high > sar) {
        sar = extreme;
        extreme = high;
        accel = accel_step;
        lng = true;
      }
    }
    return sar;
  };
}));

// src/preset.ts
var makeMapper = (op) => (fn) => (...args) => op.pipe(fn(...args));
function initIndicators(mapper) {
  const m = makeMapper(map(mapper));
  const result = {};
  for (const key in indicators) {
    result[key] = m(indicators[key]);
  }
  return result;
}
var mp = makeMapper(closeprice);
var indicators = {
  open: () => openprice,
  high: () => highprice,
  low: () => lowprice,
  close: () => closeprice,
  volume: () => volume,
  ad: () => ad,
  adosc,
  adx,
  adx_slope,
  adxr,
  ao: () => ao,
  apo: mp(apo),
  aroon,
  aroonosc,
  atr,
  avgprice: () => avgprice,
  bbands: mp(bbands),
  bop: () => bop,
  cci,
  cmo: mp(cmo),
  cvi,
  dema: mp(dema),
  di,
  dm,
  dpo: mp(dpo),
  dx,
  ema: mp(ema),
  emv: () => emv,
  fisher,
  fosc: mp(fosc),
  ha_open: () => ha_open,
  ha_high: () => ha_high,
  ha_low: () => ha_low,
  ha_close: () => ha_close,
  hma: mp(hma),
  kama: mp(kama),
  kvo,
  linreg: mp(linreg),
  linregintercept: mp(linregintercept),
  linregslope: mp(linregslope),
  macd: mp(macd),
  marketfi: () => marketfi,
  mass,
  medprice: () => medprice,
  md: mp(md),
  mfi,
  mom: mp(mom),
  msw: mp(msw),
  natr,
  nvi: () => nvi,
  obv: () => obv,
  ppo: mp(ppo),
  psar,
  pvi: () => pvi,
  qstick,
  roc: mp(roc),
  rocr: mp(rocr),
  rsi: mp(rsi),
  sma: mp(sma),
  stoch: stoch2,
  stochrsi: mp(stochrsi),
  tema: mp(tema),
  tr,
  trima: mp(trima),
  trix: mp(trix),
  tsf: mp(tsf),
  typprice: () => typprice,
  ultosc,
  vhf: mp(vhf),
  vidya: mp(vidya),
  volatility: mp(volatility),
  vosc,
  vwma,
  wad: () => wad,
  wcprice: () => wcprice,
  wilders: mp(wilders),
  willr,
  wma: mp(wma),
  zlema: mp(zlema)
};
var operators = {
  apo,
  bbands,
  cmo,
  crossany: () => crossany,
  crossover: () => crossover,
  decay,
  dema,
  dpo,
  edecay,
  ema,
  fosc,
  hma,
  kama,
  lag,
  linreg,
  linregintercept,
  linregslope,
  macd,
  max,
  md,
  min,
  mom,
  msw,
  ppo,
  roc,
  rocr,
  rsi,
  sma,
  stddev,
  stderr,
  stochrsi,
  tema,
  trima,
  trix,
  tsf,
  variance,
  vhf,
  vidya,
  volatility,
  wilders,
  wma,
  zlema
};

// src/descriptors.ts
var IndicatorType;
(function(IndicatorType2) {
  IndicatorType2["overlay"] = "overlay";
  IndicatorType2["indicator"] = "indicator";
})(IndicatorType || (IndicatorType = {}));
var makeDescriptor = (key, name, type, options, outputs) => ({
  key,
  name,
  type,
  options: options.map((option) => typeof option === "string" ? { name: option, min: 1, step: 1 } : option),
  outputs: outputs.map((output) => typeof output === "string" ? { name: output } : output)
});
var descriptors = {
  open: makeDescriptor("open", "Open Price", IndicatorType.overlay, [], ["open"]),
  high: makeDescriptor("high", "High Price", IndicatorType.overlay, [], ["high"]),
  low: makeDescriptor("low", "Low Price", IndicatorType.overlay, [], ["low"]),
  close: makeDescriptor("close", "Close Price", IndicatorType.overlay, [], ["close"]),
  volume: makeDescriptor("volume", "Volume", IndicatorType.indicator, [], ["volume"]),
  ad: makeDescriptor("ad", "Accumulation/Distribution Line", IndicatorType.indicator, [], ["ad"]),
  adosc: makeDescriptor("adosc", "Accumulation/Distribution Oscillator", IndicatorType.indicator, ["short period", "long period"], ["adosc"]),
  adx: makeDescriptor("adx", "Average Directional Movement Index", IndicatorType.indicator, ["period"], ["dx"]),
  adx_slope: makeDescriptor("adx_slope", "Average Directional Movement Index Slope", IndicatorType.indicator, ["adx period", "slope period"], ["adx_slope"]),
  adxr: makeDescriptor("adxr", "Average Directional Movement Rating", IndicatorType.indicator, ["period"], ["dx"]),
  ao: makeDescriptor("ao", "Awesome Oscillator", IndicatorType.indicator, [], ["ao"]),
  apo: makeDescriptor("apo", "Absolute Price Oscillator", IndicatorType.indicator, ["short period", "long period"], ["apo"]),
  aroon: makeDescriptor("aroon", "Aroon", IndicatorType.indicator, ["period"], [
    { name: "aroon_down", range: [0, 100] },
    { name: "aroon_up", range: [0, 100] }
  ]),
  aroonosc: makeDescriptor("aroonosc", "Aroon Oscillator", IndicatorType.indicator, ["period"], [{ name: "aroonosc", range: [-100, 100] }]),
  atr: makeDescriptor("atr", "Average True Range", IndicatorType.indicator, ["period"], ["atr"]),
  avgprice: makeDescriptor("avgprice", "Average Price", IndicatorType.overlay, [], ["avgprice"]),
  bbands: makeDescriptor("bbands", "Bollinger Bands", IndicatorType.overlay, ["period", "stddev"], ["bbands_lower", "bbands_middle", "bbands_upper"]),
  bop: makeDescriptor("bop", "Balance of Power", IndicatorType.indicator, [], ["bop"]),
  cci: makeDescriptor("cci", "Commodity Channel Index", IndicatorType.indicator, ["period"], ["cci"]),
  cmo: makeDescriptor("cmo", "Chande Momentum Oscillator", IndicatorType.indicator, ["period"], [{ name: "cmo", range: [-100, 100] }]),
  cvi: makeDescriptor("cvi", "Chaikins Volatility", IndicatorType.indicator, ["period"], [{ name: "cvi", range: [-100, 100] }]),
  dema: makeDescriptor("dema", "Double Exponential Moving Average", IndicatorType.overlay, ["period"], ["dema"]),
  di: makeDescriptor("di", "Directional Indicator", IndicatorType.indicator, ["period"], [
    { name: "plus_di", range: [0, 100] },
    { name: "minus_di", range: [0, 100] }
  ]),
  dm: makeDescriptor("dm", "Directional Movement", IndicatorType.indicator, ["period"], ["plus_dm", "minus_dm"]),
  dpo: makeDescriptor("dpo", "Detrended Price Oscillator", IndicatorType.indicator, ["period"], ["dpo"]),
  dx: makeDescriptor("dx", "Directional Movement Index", IndicatorType.indicator, ["period"], [{ name: "dx", range: [0, 100] }]),
  ema: makeDescriptor("ema", "Exponential Moving Average", IndicatorType.overlay, ["period"], ["ema"]),
  emv: makeDescriptor("emv", "Ease of Movement", IndicatorType.indicator, [], ["emv"]),
  fisher: makeDescriptor("fisher", "Fisher Transform", IndicatorType.indicator, ["period"], ["fisher", "fisher_signal"]),
  fosc: makeDescriptor("fosc", "Forecast Oscillator", IndicatorType.indicator, ["period"], [{ name: "fosc", range: [-100, 100] }]),
  ha_open: makeDescriptor("ha_open", "Heikin Ashi Open", IndicatorType.overlay, [], ["ha_open"]),
  ha_high: makeDescriptor("ha_high", "Heikin Ashi High", IndicatorType.overlay, [], ["ha_high"]),
  ha_low: makeDescriptor("ha_low", "Heikin Ashi Low", IndicatorType.overlay, [], ["ha_low"]),
  ha_close: makeDescriptor("ha_close", "Heikin Ashi Close", IndicatorType.overlay, [], ["ha_close"]),
  hma: makeDescriptor("hma", "Hull Moving Average", IndicatorType.overlay, ["period"], ["hma"]),
  kama: makeDescriptor("kama", "Kaufman Adaptive Moving Average", IndicatorType.overlay, ["period"], ["kama"]),
  kvo: makeDescriptor("kvo", "Klinger Volume Oscillator", IndicatorType.indicator, ["short period", "long period"], ["kvo"]),
  linreg: makeDescriptor("linreg", "Linear Regression", IndicatorType.overlay, ["period"], ["linreg"]),
  linregintercept: makeDescriptor("linregintercept", "Linear Regression Intercept", IndicatorType.indicator, ["period"], ["linregintercept"]),
  linregslope: makeDescriptor("linregslope", "Linear Regression Slope", IndicatorType.indicator, ["period"], ["linregslope"]),
  macd: makeDescriptor("macd", "Moving Average Convergence/Divergence", IndicatorType.indicator, ["short period", "long period", "signal period"], ["macd", "macd_signal", "macd_histogram"]),
  marketfi: makeDescriptor("marketfi", "Market Facilitation Index", IndicatorType.indicator, [], ["marketfi"]),
  mass: makeDescriptor("mass", "Mass Index", IndicatorType.indicator, ["period"], ["mass"]),
  md: makeDescriptor("md", "Mean Deviation Over Period", IndicatorType.indicator, ["period"], ["md"]),
  medprice: makeDescriptor("medprice", "Median Price", IndicatorType.overlay, [], ["medprice"]),
  mfi: makeDescriptor("mfi", "Money Flow Index", IndicatorType.indicator, ["period"], [{ name: "mfi", range: [0, 100] }]),
  mom: makeDescriptor("mom", "Momentum", IndicatorType.indicator, ["period"], ["mom"]),
  msw: makeDescriptor("msw", "Mesa Sine Wave", IndicatorType.indicator, ["period"], [
    { name: "msw_sine", range: [-1, 1] },
    { name: "msw_lead", range: [-1, 1] }
  ]),
  natr: makeDescriptor("natr", "Normalized Average True Range", IndicatorType.indicator, ["period"], ["natr"]),
  nvi: makeDescriptor("nvi", "Negative Volume Index", IndicatorType.indicator, [], ["nvi"]),
  obv: makeDescriptor("obv", "On Balance Volume", IndicatorType.indicator, [], ["obv"]),
  ppo: makeDescriptor("ppo", "Percentage Price Oscillator", IndicatorType.indicator, ["short period", "long period"], ["ppo"]),
  psar: makeDescriptor("psar", "Parabolic SAR", IndicatorType.overlay, [
    {
      name: "acceleration factor step",
      step: 0.1,
      min: 0,
      max: 1
    },
    "acceleration factor maximum"
  ], ["psar"]),
  pvi: makeDescriptor("pvi", "Positive Volume Index", IndicatorType.indicator, [], ["pvi"]),
  qstick: makeDescriptor("qstick", "Qstick", IndicatorType.indicator, ["period"], ["qstick"]),
  roc: makeDescriptor("roc", "Rate of Change", IndicatorType.indicator, ["period"], ["roc"]),
  rocr: makeDescriptor("rocr", "Rate of Change Ratio", IndicatorType.indicator, ["period"], ["rocr"]),
  rsi: makeDescriptor("rsi", "Relative Strength Index", IndicatorType.indicator, ["period"], [{ name: "rsi", range: [0, 100] }]),
  sma: makeDescriptor("sma", "Simple Moving Average", IndicatorType.overlay, ["period"], ["sma"]),
  stoch: makeDescriptor("stoch", "Stochastic Oscillator", IndicatorType.indicator, ["%k period", "%k slowing period", "%d period"], [
    { name: "stoch_k", range: [0, 100] },
    { name: "stoch_d", range: [0, 100] }
  ]),
  stochrsi: makeDescriptor("stochrsi", "Stochastic RSI", IndicatorType.indicator, ["period"], [{ name: "stochrsi", range: [0, 100] }]),
  tema: makeDescriptor("tema", "Triple Exponential Moving Average", IndicatorType.overlay, ["period"], ["tema"]),
  tr: makeDescriptor("tr", "True Range", IndicatorType.indicator, [], ["tr"]),
  trima: makeDescriptor("trima", "Triangular Moving Average", IndicatorType.overlay, ["period"], ["trima"]),
  trix: makeDescriptor("trix", "Trix", IndicatorType.indicator, ["period"], ["trix"]),
  tsf: makeDescriptor("tsf", "Time Series Forecast", IndicatorType.overlay, ["period"], ["tsf"]),
  typprice: makeDescriptor("typprice", "Typical Price", IndicatorType.overlay, [], ["typprice"]),
  ultosc: makeDescriptor("ultosc", "Ultimate Oscillator", IndicatorType.indicator, ["short period", "medium period", "long period"], [{ name: "ultosc", range: [0, 100] }]),
  vhf: makeDescriptor("vhf", "Vertical Horizontal Filter", IndicatorType.indicator, ["period"], ["vhf"]),
  vidya: makeDescriptor("vidya", "Variable Index Dynamic Average", IndicatorType.overlay, [
    "short period",
    "long period",
    {
      name: "alpha",
      max: 1,
      min: 0,
      step: 0.1
    }
  ], ["vidya"]),
  volatility: makeDescriptor("volatility", "Annualized Historical Volatility", IndicatorType.indicator, ["period"], ["volatility"]),
  vosc: makeDescriptor("vosc", "Volume Oscillator", IndicatorType.indicator, ["short period", "long period"], ["vosc"]),
  vwma: makeDescriptor("vwma", "Volume Weighted Moving Average", IndicatorType.overlay, ["period"], ["vwma"]),
  wad: makeDescriptor("wad", "Williams Accumulation/Distribution", IndicatorType.indicator, [], ["wad"]),
  wcprice: makeDescriptor("wcprice", "Weighted Close Price", IndicatorType.overlay, [], ["wcprice"]),
  wilders: makeDescriptor("wilders", "Wilders Smoothing", IndicatorType.overlay, ["period"], ["wilders"]),
  willr: makeDescriptor("willr", "Williams %R", IndicatorType.indicator, ["period"], [{ name: "willr", range: [-100, 0] }]),
  wma: makeDescriptor("wma", "Weighted Moving Average", IndicatorType.overlay, ["period"], ["wma"]),
  zlema: makeDescriptor("zlema", "Zero-Lag Exponential Moving Average", IndicatorType.overlay, ["period"], ["zlema"])
};
export {
  IndicatorType,
  Stream,
  descriptors,
  fastFork,
  fastListFork,
  flatMap,
  fork,
  forkWithLag,
  identity,
  indicators,
  initIndicators,
  lag,
  listFork,
  makeDescriptor,
  makeOperator,
  makeStatefulMap,
  map,
  mapFork,
  mapWithLast,
  matchDistance,
  matchItem,
  memAll,
  operators,
  pipe,
  scan,
  skip
};
