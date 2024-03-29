"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  IndicatorDescriptor: () => IndicatorDescriptor,
  Stream: () => Stream,
  descriptors: () => descriptors,
  fastFork: () => fastFork,
  fastListFork: () => fastListFork,
  flatMap: () => flatMap,
  fork: () => fork,
  forkWithLag: () => forkWithLag,
  identity: () => identity,
  indicators: () => indicators,
  initIndicators: () => initIndicators,
  lag: () => lag,
  listFork: () => listFork,
  makeOperator: () => makeOperator,
  makeStatefulMap: () => makeStatefulMap,
  map: () => map,
  mapFork: () => mapFork,
  mapWithLast: () => mapWithLast,
  matchDistance: () => matchDistance,
  matchItem: () => matchItem,
  memAll: () => memAll,
  operators: () => operators,
  pipe: () => pipe,
  scan: () => scan,
  skip: () => skip
});
module.exports = __toCommonJS(src_exports);

// src/stream.ts
var Stream = class _Stream {
  constructor(fn, lb = 0) {
    this.fn = fn;
    this.lb = lb;
  }
  pipe(op) {
    return new _Stream((source) => op.fn(this.fn(source)), this.lb + op.lb);
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
    invariant(
      index2 >= 0 && index2 < this.size && index2 < this.length,
      "RollingList index out of bounds"
    );
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
var mapWithLast = (mapper, firstResult) => makeOperator(
  (next) => {
    let prev;
    return (val) => {
      if (prev !== void 0) {
        next(mapper(val, prev));
      } else if (firstResult !== void 0) {
        next(firstResult);
      }
      prev = val;
    };
  },
  firstResult !== void 0 ? 0 : 1
);
var lag = (period, initialValue) => makeOperator(
  (next) => {
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
  },
  initialValue !== void 0 ? 0 : period
);
var forkWithLag = (period, initialValue) => makeOperator(
  (next) => {
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
  },
  initialValue !== void 0 ? 0 : period
);
var memAll = (period, skip2 = false) => makeOperator(
  (next) => {
    const inputs = new RollingList(period);
    return (head) => {
      inputs.push(head);
      if (!skip2 || inputs.length >= inputs.size)
        next(inputs);
    };
  },
  skip2 ? period - 1 : 0
);
var matchItem = (period, matcher) => memAll(period, true).pipe(
  makeStatefulMap(() => {
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
  })
);
var matchDistance = (period, matcher) => memAll(period, true).pipe(
  scan((prev, inputs) => {
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
  }, period - 1)
);
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
var import_decimal = __toESM(require("decimal.js"));
var ZERO = new import_decimal.default(0);
var ONE = new import_decimal.default(1);
var HUNDRED = new import_decimal.default(100);
var factors = {
  d: (period) => (period - 1) / period,
  e: (period) => 2 / (period + 1)
};
var wrapBinaryOperator = (op) => (short, long) => pipe(fork(short, long), op);
var oscillate = {
  diff_over_long: flatMap(
    (short, long) => short.minus(long).div(long).times(HUNDRED)
  ),
  diff_over_short: flatMap(
    (short, long) => short.minus(long).div(short).times(HUNDRED)
  ),
  short_over_sum: flatMap(
    (short, long) => short.div(short.plus(long)).times(HUNDRED)
  ),
  diff_over_sum: flatMap(
    (short, long) => short.minus(long).div(short.plus(long)).times(HUNDRED)
  )
};
var oscillators = {
  diff_over_long: wrapBinaryOperator(oscillate.diff_over_long),
  diff_over_short: wrapBinaryOperator(oscillate.diff_over_short),
  short_over_sum: wrapBinaryOperator(oscillate.short_over_sum),
  diff_over_sum: wrapBinaryOperator(oscillate.diff_over_sum)
};
var minus = wrapBinaryOperator(flatMap((a, b) => a.minus(b)));
var div = (short, long, multiplier = ONE) => pipe(
  fork(short, long),
  flatMap((a, b) => a.div(b).times(multiplier))
);
var stoch = (close, short, long, multiplier = ONE) => pipe(
  fork(close, short, long),
  flatMap(
    (close2, short2, long2) => close2.minus(long2).div(short2.minus(long2)).times(multiplier)
  )
);
var multiplyBy = (factor) => map((n) => n.times(factor));
var divideBy = (divider) => map((n) => n.div(divider));
var index = scan((count) => count + 1, -1);
var sum = (period) => pipe(
  forkWithLag(period, ZERO),
  scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO),
  skip(period - 1)
);
var weighted_sum = (period) => pipe(
  fork(
    map((value, index2) => value.times(Math.min(period, index2 + 1))),
    pipe(
      forkWithLag(period, ZERO),
      scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO),
      lag(1, ZERO),
      map((sum2, index2) => index2 < period ? ZERO : sum2)
    )
  ),
  scan((wsum, [wvalue, sum2]) => wsum.plus(wvalue).minus(sum2), ZERO),
  skip(period - 1)
);
var crossany = mapWithLast(
  ([a, b], [last_a, last_b]) => a.gt(b) && last_a.lte(last_b) || a.lt(b) && last_a.gte(last_b) ? 1 : 0
);
var crossover = mapWithLast(
  ([a, b], [last_a, last_b]) => a.gt(b) && last_a.lte(last_b) ? 1 : 0
);
var decay = (period) => scan(
  (decay2, value) => import_decimal.default.max(value, decay2.minus(1 / period), ZERO),
  ZERO
);
var edecay = (period) => scan(
  (decay2, value) => import_decimal.default.max(value, decay2.times(period - 1).div(period), ZERO),
  ZERO
);
var max = (period) => matchItem(period, (current, next) => next.gte(current));
var min = (period) => matchItem(period, (current, next) => next.lte(current));
var max_distance = (period) => matchDistance(period, (current, next) => next.gte(current));
var min_distance = (period) => matchDistance(period, (current, next) => next.lte(current));
var custom_ema = (factor) => scan(
  (ema2, val, index2) => index2 === 0 ? val : val.times(factor).plus(ema2.times(1 - factor)),
  ZERO
);
var ema = (period) => custom_ema(factors.e(period));
var double_ema = (period, factor) => pipe(
  custom_ema(factor),
  skip(period - 1),
  custom_ema(factor),
  skip(period - 1)
);
var triple_ema = (period, factor) => pipe(
  custom_ema(factor),
  skip(period - 1),
  custom_ema(factor),
  skip(period - 1),
  custom_ema(factor),
  skip(period - 1)
);
var custom_dema = (period, factor) => pipe(
  fork(custom_ema(factor), double_ema(period, factor)),
  flatMap((ema1, ema2) => ema1.times(2).minus(ema2))
);
var dema = (period) => custom_dema(period, factors.e(period));
var custom_tema = (period, factor) => pipe(
  fork(
    custom_ema(factor),
    double_ema(period, factor),
    triple_ema(period, factor)
  ),
  flatMap(
    (ema1, ema2, ema3) => ema1.times(3).minus(ema2.times(3)).plus(ema3)
  )
);
var tema = (period) => custom_tema(period, factors.e(period));
var custom_trix = (period, factor) => pipe(triple_ema(period, factor), forkWithLag(1), oscillate.diff_over_short);
var trix = (period) => custom_trix(period, factors.e(period));
var custom_dm_smoother = (period, factor) => pipe(
  scan(
    (val, input, index2) => index2 < period ? val.plus(input) : val.times(factor).plus(input),
    ZERO
  ),
  skip(period - 1)
);
var sma = (period) => pipe(sum(period), divideBy(period));
var wilders = (period) => pipe(
  scan((wilders2, input, index2) => {
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
  }, ZERO),
  skip(period - 1)
);
var wma = (period) => pipe(weighted_sum(period), divideBy(period * (period + 1) / 2));
var hma = (period) => pipe(
  fork(wma(Math.floor(period / 2)), wma(period)),
  flatMap((wma1, wma2) => wma1.times(2).minus(wma2)),
  wma(Math.floor(Math.sqrt(period)))
);
var custom_zlema = (factor, lag2) => pipe(
  forkWithLag(lag2, ZERO),
  skip(lag2 - 1),
  map(
    ([head, tail], index2) => index2 === 0 ? head : head.plus(head.minus(tail))
  ),
  custom_ema(factor)
);
var zlema = (period) => custom_zlema(factors.e(period), Math.floor((period - 1) / 2));
var kama = (period) => {
  const f = new import_decimal.default(2).div(3);
  const s = new import_decimal.default(2).div(31);
  const fs = f.minus(s);
  return pipe(
    fork(
      pipe(
        div(
          pipe(
            forkWithLag(period, ZERO),
            flatMap((head, tail) => head.minus(tail).abs())
          ),
          pipe(
            mapWithLast((head, tail) => head.minus(tail).abs(), ZERO),
            sum(period)
          )
        ),
        map((e) => e.times(fs).plus(s).pow(2))
      ),
      identity()
    ),
    scan(
      (kama2, [s2, val], index2) => index2 > 0 ? val.minus(kama2).times(s2).plus(kama2) : val,
      ZERO
    )
  );
};
var trima = (period) => pipe(
  fork(
    identity(),
    pipe(
      forkWithLag(Math.floor(period / 2), ZERO),
      scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO),
      lag(1, ZERO),
      map((sum2, index2) => index2 < Math.floor(period / 2) + 1 ? ZERO : sum2)
    ),
    pipe(
      forkWithLag(Math.ceil(period / 2), ZERO),
      scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO),
      lag(Math.floor(period / 2) + 1, ZERO),
      map((sum2, index2) => index2 < period ? ZERO : sum2)
    )
  ),
  map(([value, lsum, tsum]) => value.plus(lsum).minus(tsum)),
  scan((wsum, delta) => wsum.plus(delta), ZERO),
  skip(period - 1),
  divideBy(
    period % 2 ? (Math.floor(period / 2) + 1) * (Math.floor(period / 2) + 1) : (Math.floor(period / 2) + 1) * Math.floor(period / 2)
  )
);
var md = (period) => pipe(
  fork(sma(period), memAll(period, true)),
  flatMap((sma2, inputs) => {
    let sum2 = ZERO;
    for (let i = 0; i < period; i++) {
      sum2 = sum2.plus(inputs.get(i).minus(sma2).abs());
    }
    return sum2.div(period);
  })
);
var custom_variance = (smoother) => pipe(
  fork(
    pipe(
      map((n) => n.pow(2)),
      smoother
    ),
    pipe(
      smoother,
      map((n) => n.pow(2))
    )
  ),
  flatMap((p2, p1) => p2.minus(p1))
);
var custom_stddev = (smoother) => pipe(
  custom_variance(smoother),
  map((n) => n.sqrt())
);
var custom_stderr = (period, smoother) => pipe(custom_stddev(smoother), divideBy(new import_decimal.default(period).sqrt()));
var custom_volatility = (duration, smoother) => pipe(
  mapWithLast((input, last) => input.div(last).minus(1)),
  custom_stddev(smoother),
  multiplyBy(new import_decimal.default(duration).sqrt())
);
var variance = (period) => custom_variance(sma(period));
var stddev = (period) => custom_stddev(sma(period));
var stderr = (period) => custom_stderr(period, sma(period));
var volatility = (period) => custom_volatility(252, sma(period));
var custom_apo = (short, long) => minus(short, long);
var custom_ppo = (short, long) => oscillators.diff_over_long(short, long);
var apo = (short, long) => pipe(custom_apo(ema(short), ema(long)), skip(1));
var ppo = (short, long) => pipe(custom_ppo(ema(short), ema(long)), skip(1));
var custom_macd = (short, long, signal, longPeriod) => pipe(
  minus(short, long),
  skip(longPeriod - 1),
  fork(identity(), signal),
  flatMap(
    (macd2, signal2) => [
      macd2,
      signal2,
      macd2.minus(signal2)
    ]
  )
);
var macd = (short, long, signal) => {
  const isSpecial = short === 12 && long === 26;
  return custom_macd(
    custom_ema(isSpecial ? 0.15 : factors.e(short)),
    custom_ema(isSpecial ? 0.075 : factors.e(long)),
    ema(signal),
    long
  );
};
var gains = mapWithLast(
  (input, last) => input.gt(last) ? input.minus(last) : ZERO
);
var losses = mapWithLast(
  (input, last) => input.lt(last) ? last.minus(input) : ZERO
);
var custom_cmo = (smoother) => oscillators.diff_over_sum(pipe(gains, smoother), pipe(losses, smoother));
var custom_rsi = (smoother) => oscillators.short_over_sum(pipe(gains, smoother), pipe(losses, smoother));
var custom_stochrsi = (period, smoother) => pipe(custom_rsi(smoother), stoch(identity(), max(period), min(period)));
var rsi = (period) => custom_rsi(wilders(period));
var stochrsi = (period) => custom_stochrsi(period, wilders(period));
var cmo = (period) => custom_cmo(sum(period));
var custom_dpo = (period, smoother) => minus(lag(Math.floor(period / 2) + 1, ZERO), smoother);
var dpo = (period) => custom_dpo(period, sma(period));
var mom = (period) => pipe(
  forkWithLag(period),
  flatMap((head, tail) => head.minus(tail))
);
var roc = (period) => pipe(
  forkWithLag(period),
  flatMap((head, tail) => head.minus(tail).div(tail))
);
var rocr = (period) => pipe(
  forkWithLag(period),
  flatMap((head, tail) => head.div(tail))
);
var vhf = (period) => pipe(
  fork(
    pipe(
      mapWithLast((val, last) => val.minus(last).abs()),
      sum(period)
    ),
    max(period),
    min(period)
  ),
  flatMap((sum2, max2, min2) => max2.minus(min2).abs().div(sum2))
);
var bbands = (period, scale) => pipe(
  fork(sma(period), custom_stddev(sma(period))),
  flatMap(
    (middle, stddev2) => {
      const dev = stddev2.times(scale);
      return [middle.minus(dev), middle, middle.plus(dev)];
    }
  )
);
var custom_vidya = (short, long, factor, long_period) => pipe(
  fastFork(
    pipe(
      fork(custom_stddev(short), custom_stddev(long)),
      flatMap((short2, long2) => short2.div(long2).times(factor))
    ),
    identity()
  ),
  skip(long_period - 2),
  scan(
    (vidya2, [s, val], index2) => index2 > 0 ? val.times(s).plus(vidya2.times(ONE.minus(s))) : val,
    ZERO
  )
);
var vidya = (short, long, factor) => custom_vidya(sma(short), sma(long), factor, long);
var linregslope = (period) => {
  const x = period * (period + 1) / 2;
  const x2 = period * (period + 1) * (period * 2 + 1) / 6;
  const bd = period * x2 - x * x;
  return pipe(
    fork(weighted_sum(period), sum(period)),
    flatMap((xy, y) => xy.times(period).minus(y.times(x)).div(bd))
  );
};
var linreg_forecast = (period, forecast) => {
  const x = forecast - (period + 1) / 2;
  return pipe(
    fork(sma(period), linregslope(period)),
    flatMap((y, b) => y.plus(b.times(x)))
  );
};
var linregintercept = (period) => linreg_forecast(period, 1);
var linreg = (period) => linreg_forecast(period, period);
var tsf = (period) => linreg_forecast(period, period + 1);
var fosc = (period) => oscillators.diff_over_short(identity(), pipe(tsf(period), lag(1)));
var msw = (period) => pipe(
  memAll(period, true),
  skip(1),
  map((inputs) => {
    let rp = ZERO;
    let ip = ZERO;
    for (let i = 0; i < period; i++) {
      const weight = inputs.get(i);
      const a = new import_decimal.default(2 * Math.PI * i / period);
      rp = rp.plus(a.cos().times(weight));
      ip = ip.plus(a.sin().times(weight));
    }
    let phase = rp.abs().gt(1e-3) ? ip.div(rp).atan() : new import_decimal.default(Math.PI * (ip.lt(0) ? -1 : 1));
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
  })
);

// src/indicators.ts
var import_decimal2 = __toESM(require("decimal.js"));
var MIN_VOLUME = new import_decimal2.default(1e-8);
var openprice = map((candle) => candle.open);
var highprice = map((candle) => candle.high);
var lowprice = map((candle) => candle.low);
var closeprice = map((candle) => candle.close);
var volume = map((candle) => candle.volume);
var nzvolume = map(
  (candle) => candle.volume.gt(0) ? candle.volume : MIN_VOLUME
);
var range = map((candle) => candle.high.minus(candle.low));
var avgprice = map(
  (candle) => candle.open.plus(candle.high).plus(candle.low).plus(candle.close).div(4)
);
var medprice = map(
  (candle) => candle.high.plus(candle.low).div(2)
);
var typprice = map(
  (candle) => candle.high.plus(candle.low).plus(candle.close).div(3)
);
var wcprice = map(
  (candle) => candle.high.plus(candle.low).plus(candle.close).plus(candle.close).div(4)
);
var ha_close = avgprice;
var ha_open = pipe(
  ha_close,
  scan(
    (open, close, index2) => index2 === 0 ? close : open.plus(close).div(2),
    ZERO
  )
);
var ha_high = pipe(
  fork(highprice, ha_open, ha_close),
  flatMap((high, open, close) => import_decimal2.default.max(high, open, close))
);
var ha_low = pipe(
  fork(lowprice, ha_open, ha_close),
  flatMap((low, open, close) => import_decimal2.default.min(low, open, close))
);
var ad = scan((ad2, candle) => {
  const hl = candle.high.minus(candle.low);
  if (hl.eq(0))
    return ad2;
  return ad2.plus(
    candle.close.minus(candle.low).minus(candle.high).plus(candle.close).div(hl).times(candle.volume)
  );
}, ZERO);
var custom_adosc = (short, long) => pipe(ad, minus(short, long));
var adosc = (shortPeriod, longPeriod) => pipe(
  custom_adosc(ema(shortPeriod), ema(longPeriod)),
  skip(longPeriod - 1)
);
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
  return custom_adx(
    smoother,
    pipe(
      smoother,
      map((val) => val.div(period))
    )
  );
};
var adx_slope = (adx_period, slope_period) => pipe(
  adx(adx_period),
  forkWithLag(slope_period),
  flatMap((adx2, prev) => adx2.minus(prev).div(slope_period))
);
var custom_adxr = (dm_smoother, dx_smoother, period) => pipe(
  custom_adx(dm_smoother, dx_smoother),
  forkWithLag(period - 1),
  flatMap((head, tail) => head.plus(tail).div(2))
);
var adxr = (period) => {
  const smoother = custom_dm_smoother2(period);
  return custom_adxr(
    smoother,
    pipe(
      smoother,
      map((val) => val.div(period))
    ),
    period
  );
};
var custom_atr = (smoother, skipFirst) => pipe(custom_tr(skipFirst), smoother);
var atr = (period) => custom_atr(wilders(period), false);
var custom_di = (dm_smoother, tr_smoother) => fork(
  div(dm_up_smooth(dm_smoother), custom_atr(tr_smoother, true), HUNDRED),
  div(dm_down_smooth(dm_smoother), custom_atr(tr_smoother, true), HUNDRED)
);
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
var custom_dx = (dm_smoother) => pipe(
  oscillators.diff_over_sum(
    dm_up_smooth(dm_smoother),
    dm_down_smooth(dm_smoother)
  ),
  map((val) => val.abs())
);
var dm = (period) => custom_dm(custom_dm_smoother2(period));
var dx = (period) => custom_dx(custom_dm_smoother2(period));
var custom_tr = (skipFirst = false) => makeStatefulMap(() => {
  let prev;
  return (candle) => {
    const last = prev;
    prev = candle;
    return last ? import_decimal2.default.max(
      candle.high.minus(candle.low),
      candle.high.minus(last.close).abs(),
      candle.low.minus(last.close).abs()
    ) : skipFirst ? ZERO : candle.high.minus(candle.low);
  };
});
var tr = () => custom_tr(false);
var cci = (period) => pipe(
  typprice,
  fork(identity(), sma(period), md(period)),
  skip(period - 1),
  flatMap((tp, atp, md2) => tp.minus(atp).div(md2.times(0.015)))
);
var bop = map(
  (candle) => candle.close.minus(candle.open).div(candle.high.minus(candle.low))
);
var custom_cvi = (period, smoother) => pipe(range, smoother, roc(period), multiplyBy(HUNDRED));
var cvi = (period) => custom_cvi(period, pipe(ema(period), skip(period - 1)));
var marketfi = map(
  (candle) => candle.high.minus(candle.low).div(candle.volume)
);
var custom_emv = (scale) => pipe(
  fork(
    pipe(
      medprice,
      mapWithLast((hl, last) => hl.minus(last))
    ),
    marketfi
  ),
  flatMap((hl, marketfi2) => hl.times(marketfi2).times(scale))
);
var emv = custom_emv(1e4);
var kvo_trend = pipe(
  map((candle) => candle.high.plus(candle.low).plus(candle.close)),
  makeStatefulMap(() => {
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
  })
);
var kvo_cm = pipe(
  fork(
    pipe(
      kvo_trend,
      mapWithLast((trend, last) => trend === last, true)
    ),
    pipe(range, forkWithLag(1))
  ),
  scan((cm, [trend, [dm2, last_dm]]) => (trend ? cm : last_dm).plus(dm2), ZERO)
);
var custom_kvo = (short, long) => pipe(
  fork(volume, kvo_trend, range, kvo_cm),
  flatMap(
    (volume2, trend, dm2, cm) => HUNDRED.times(volume2).times(trend).times(dm2.div(cm).times(2).minus(1).abs())
  ),
  minus(short, long)
);
var kvo = (short, long) => custom_kvo(ema(short), ema(long));
var custom_mass = (period, ema_period, factor) => pipe(
  range,
  div(custom_ema(factor), double_ema(ema_period, factor)),
  sum(period)
);
var mass = (period) => custom_mass(period, 9, factors.e(9));
var mfi = (period) => pipe(
  fork(pipe(typprice, forkWithLag(1)), nzvolume),
  oscillators.short_over_sum(
    pipe(
      flatMap(
        ([tp, last_tp], volume2) => tp.gt(last_tp) ? tp.times(volume2) : ZERO
      ),
      sum(period)
    ),
    pipe(
      flatMap(
        ([tp, last_tp], volume2) => tp.lt(last_tp) ? tp.times(volume2) : ZERO
      ),
      sum(period)
    )
  )
);
var custom_natr = (smoother) => div(custom_atr(smoother, false), closeprice, HUNDRED);
var natr = (period) => custom_natr(wilders(period));
var vi = (condition) => pipe(
  fork(
    pipe(volume, mapWithLast(condition, false)),
    pipe(
      closeprice,
      mapWithLast((close, last) => close.minus(last).div(last), ZERO)
    )
  ),
  flatMap((check, close) => check ? close : ZERO),
  scan((vi2, extra) => vi2.plus(vi2.times(extra)), new import_decimal2.default(1e3))
);
var pvi = vi((volume2, last) => volume2.gt(last));
var nvi = vi((volume2, last) => volume2.lt(last));
var obv = pipe(
  fork(
    pipe(
      closeprice,
      mapWithLast((close, last) => close.comparedTo(last), 0)
    ),
    volume
  ),
  scan((obv2, [change, volume2]) => obv2.plus(volume2.times(change)), ZERO)
);
var qstick = (period) => pipe(
  map((candle) => candle.close.minus(candle.open)),
  sma(period)
);
var custom_stoch = (fast_k_period, k_smoother, d_smoother) => pipe(
  stoch(
    closeprice,
    pipe(highprice, max(fast_k_period)),
    pipe(lowprice, min(fast_k_period)),
    HUNDRED
  ),
  k_smoother,
  fork(identity(), d_smoother)
);
var stoch2 = (period1, period2, period3) => custom_stoch(period1, sma(period2), sma(period3));
var ultosc = (period1, period2, period3) => pipe(
  fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))),
  flatMap((high, low, [close, prevClose]) => {
    const tl = import_decimal2.default.min(low, prevClose);
    const th = import_decimal2.default.max(high, prevClose);
    return [close.minus(tl), th.minus(tl)];
  }),
  fork(
    pipe(
      map((bpr) => bpr[0]),
      fork(sum(period1), sum(period2), sum(period3))
    ),
    pipe(
      map((bpr) => bpr[1]),
      fork(sum(period1), sum(period2), sum(period3))
    )
  ),
  flatMap(
    ([bp1, bp2, bp3], [r1, r2, r3]) => bp1.div(r1).times(4).plus(bp2.div(r2).times(2)).plus(bp3.div(r3)).times(HUNDRED).div(7)
  )
);
var vosc = (fast, slow) => pipe(nzvolume, oscillators.diff_over_long(sma(fast), sma(slow)));
var wad = pipe(
  fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))),
  flatMap((high, low, [close, prevClose]) => {
    if (close.gt(prevClose)) {
      return close.minus(import_decimal2.default.min(low, prevClose));
    }
    if (close.lt(prevClose)) {
      return close.minus(import_decimal2.default.max(high, prevClose));
    }
    return ZERO;
  }),
  scan((wad2, ad2) => wad2.plus(ad2), ZERO)
);
var willr = (period) => stoch(
  closeprice,
  pipe(lowprice, min(period)),
  pipe(highprice, max(period)),
  -100
);
var vwma = (period) => div(
  pipe(
    map((candle) => candle.volume.times(candle.close)),
    sum(period)
  ),
  pipe(nzvolume, sum(period))
);
var fisher = (period) => pipe(
  medprice,
  stoch(identity(), max(period), min(period)),
  scan((res, val) => val.minus(0.5).times(0.66).plus(res.times(0.67)), ZERO),
  map(
    (val) => val.gt(0.99) ? new import_decimal2.default(0.999) : val.lt(-0.99) ? new import_decimal2.default(-0.999) : val
  ),
  map((val) => ONE.plus(val).div(ONE.minus(val)).ln()),
  scan((fisher2, val) => val.times(0.5).plus(fisher2.times(0.5)), ZERO),
  forkWithLag(1, ZERO)
);
var psar = (accel_step, accel_max) => pipe(
  fork(pipe(highprice, memAll(3)), pipe(lowprice, memAll(3))),
  skip(1),
  makeStatefulMap(() => {
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
          sar = import_decimal2.default.min(sar, lows.get(2));
        }
        sar = import_decimal2.default.min(sar, lows.get(1));
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
          sar = import_decimal2.default.max(sar, highs.get(2));
        }
        sar = import_decimal2.default.max(sar, highs.get(1));
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
  })
);

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
var IndicatorDescriptor = class {
  constructor(key, name, isOverlay, options, outputs) {
    this.key = key;
    this.name = name;
    this.isOverlay = isOverlay;
    this.options = options;
    this.outputs = outputs;
  }
};
var descriptors = {};
var nat = (name, def) => ({
  name,
  min: 1,
  step: 1,
  def
});
var flt = (name, def, min2, max2) => ({
  name,
  min: min2,
  max: max2,
  step: 0.1,
  def
});
var out = {
  any: (name) => ({ name }),
  pval: (name) => ({ name, min: 0 }),
  uosc: (name) => ({ name, min: -1, max: 1 }),
  cosc: (name) => ({ name, min: -100, max: 100 }),
  pct: (name) => ({ name, min: 0, max: 100 }),
  npct: (name) => ({ name, min: -100, max: 0 })
};
var data = [
  ["open", "Open Price", true, [], [out.pval("open")]],
  ["high", "High Price", true, [], [out.pval("high")]],
  ["low", "Low Price", true, [], [out.pval("low")]],
  ["close", "Close Price", true, [], [out.pval("close")]],
  ["volume", "Volume", false, [], [out.pval("volume")]],
  ["ad", "Accumulation/Distribution Line", false, [], [out.any("ad")]],
  [
    "adosc",
    "Accumulation/Distribution Oscillator",
    false,
    [nat("short period", 7), nat("long period", 14)],
    [out.any("adosc")]
  ],
  [
    "adx",
    "Average Directional Movement Index",
    false,
    [nat("period", 14)],
    [out.pct("adx")]
  ],
  [
    "adx_slope",
    "Average Directional Movement Index Slope",
    false,
    [nat("adx period", 14), nat("slope period", 14)],
    [out.any("adx_slope")]
  ],
  [
    "adxr",
    "Average Directional Movement Rating",
    false,
    [nat("period", 14)],
    [out.pct("adxr")]
  ],
  ["ao", "Awesome Oscillator", false, [], [out.any("ao")]],
  [
    "apo",
    "Absolute Price Oscillator",
    false,
    [nat("short period", 7), nat("long period", 14)],
    [out.any("apo")]
  ],
  [
    "aroon",
    "Aroon",
    false,
    [nat("period", 14)],
    [out.pct("aroon_down"), out.pct("aroon_up")]
  ],
  [
    "aroonosc",
    "Aroon Oscillator",
    false,
    [nat("period", 14)],
    [out.cosc("aroonosc")]
  ],
  ["atr", "Average True Range", false, [nat("period", 14)], [out.pval("atr")]],
  ["avgprice", "Average Price", true, [], [out.pval("avgprice")]],
  [
    "bbands",
    "Bollinger Bands",
    true,
    [nat("period", 20), nat("stddev", 2)],
    [
      out.pval("bbands_lower"),
      out.pval("bbands_middle"),
      out.pval("bbands_upper")
    ]
  ],
  ["bop", "Balance of Power", false, [], [out.uosc("bop")]],
  [
    "cci",
    "Commodity Channel Index",
    false,
    [nat("period", 14)],
    [out.any("cci")]
  ],
  [
    "cmo",
    "Chande Momentum Oscillator",
    false,
    [nat("period", 14)],
    [out.cosc("cmo")]
  ],
  ["cvi", "Chaikins Volatility", false, [nat("period", 14)], [out.cosc("cvi")]],
  [
    "dema",
    "Double Exponential Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("dema")]
  ],
  [
    "di",
    "Directional Indicator",
    false,
    [nat("period", 14)],
    [out.pct("plus_di"), out.pct("minus_di")]
  ],
  [
    "dm",
    "Directional Movement",
    false,
    [nat("period", 14)],
    [out.pct("plus_dm"), out.pct("minus_dm")]
  ],
  [
    "dpo",
    "Detrended Price Oscillator",
    false,
    [nat("period", 14)],
    [out.any("dpo")]
  ],
  [
    "dx",
    "Directional Movement Index",
    false,
    [nat("period", 14)],
    [out.pct("dx")]
  ],
  [
    "ema",
    "Exponential Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("ema")]
  ],
  ["emv", "Ease of Movement", false, [], [out.uosc("emv")]],
  [
    "fisher",
    "Fisher Transform",
    false,
    [nat("period", 14)],
    [out.any("fisher"), out.any("fisher_signal")]
  ],
  [
    "fosc",
    "Forecast Oscillator",
    false,
    [nat("period", 14)],
    [out.cosc("fosc")]
  ],
  ["ha_open", "Heikin Ashi Open", true, [], [out.pval("ha_open")]],
  ["ha_high", "Heikin Ashi High", true, [], [out.pval("ha_high")]],
  ["ha_low", "Heikin Ashi Low", true, [], [out.pval("ha_low")]],
  ["ha_close", "Heikin Ashi Close", true, [], [out.pval("ha_close")]],
  ["hma", "Hull Moving Average", true, [nat("period", 14)], [out.pval("hma")]],
  [
    "kama",
    "Kaufman Adaptive Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("kama")]
  ],
  [
    "kvo",
    "Klinger Volume Oscillator",
    false,
    [nat("short period", 7), nat("long period", 14)],
    [out.any("kvo")]
  ],
  [
    "linreg",
    "Linear Regression",
    true,
    [nat("period", 14)],
    [out.pval("linreg")]
  ],
  [
    "linregintercept",
    "Linear Regression Intercept",
    false,
    [nat("period", 14)],
    [out.any("linregintercept")]
  ],
  [
    "linregslope",
    "Linear Regression Slope",
    false,
    [nat("period", 14)],
    [out.any("linregslope")]
  ],
  [
    "macd",
    "Moving Average Convergence/Divergence",
    false,
    [nat("short period", 12), nat("long period", 26), nat("signal period", 9)],
    [out.any("macd"), out.any("macd_signal"), out.any("macd_histogram")]
  ],
  ["marketfi", "Market Facilitation Index", false, [], [out.any("marketfi")]],
  ["mass", "Mass Index", false, [nat("period", 14)], [out.any("mass")]],
  [
    "md",
    "Mean Deviation Over Period",
    false,
    [nat("period", 14)],
    [out.any("md")]
  ],
  ["medprice", "Median Price", true, [], [out.pval("medprice")]],
  ["mfi", "Money Flow Index", false, [nat("period", 14)], [out.pct("mfi")]],
  ["mom", "Momentum", false, [nat("period", 14)], [out.any("mom")]],
  [
    "msw",
    "Mesa Sine Wave",
    false,
    [nat("period", 14)],
    [out.uosc("msw_sine"), out.uosc("msw_lead")]
  ],
  [
    "natr",
    "Normalized Average True Range",
    false,
    [nat("period", 14)],
    [out.any("natr")]
  ],
  ["nvi", "Negative Volume Index", false, [], [out.any("nvi")]],
  ["obv", "On Balance Volume", false, [], [out.any("obv")]],
  [
    "ppo",
    "Percentage Price Oscillator",
    false,
    [nat("short period", 7), nat("long period", 14)],
    [out.cosc("ppo")]
  ],
  [
    "psar",
    "Parabolic SAR",
    true,
    [
      flt("acceleration factor step", 0.2, 0, 1),
      flt("acceleration factor maximum", 2, 0.1)
    ],
    [out.pval("psar")]
  ],
  ["pvi", "Positive Volume Index", false, [], [out.any("pvi")]],
  ["qstick", "Qstick", false, [nat("period", 14)], [out.any("qstick")]],
  ["roc", "Rate of Change", false, [nat("period", 14)], [out.any("roc")]],
  [
    "rocr",
    "Rate of Change Ratio",
    false,
    [nat("period", 14)],
    [out.any("rocr")]
  ],
  [
    "rsi",
    "Relative Strength Index",
    false,
    [nat("period", 14)],
    [out.pct("rsi")]
  ],
  [
    "sma",
    "Simple Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("sma")]
  ],
  [
    "stoch",
    "Stochastic Oscillator",
    false,
    [nat("%k period", 14), nat("%k slowing period", 3), nat("%d period", 1)],
    [out.pct("stoch_k"), out.pct("stoch_d")]
  ],
  [
    "stochrsi",
    "Stochastic RSI",
    false,
    [nat("period", 14)],
    [out.pct("stochrsi")]
  ],
  [
    "tema",
    "Triple Exponential Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("tema")]
  ],
  ["tr", "True Range", false, [], [out.pval("tr")]],
  [
    "trima",
    "Triangular Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("trima")]
  ],
  ["trix", "Trix", false, [nat("period", 14)], [out.cosc("trix")]],
  ["tsf", "Time Series Forecast", true, [nat("period", 14)], [out.pval("tsf")]],
  ["typprice", "Typical Price", true, [], [out.pval("typprice")]],
  [
    "ultosc",
    "Ultimate Oscillator",
    false,
    [nat("short period", 7), nat("medium period", 14), nat("long period", 28)],
    [out.pct("ultosc")]
  ],
  [
    "vhf",
    "Vertical Horizontal Filter",
    false,
    [nat("period", 14)],
    [out.any("vhf")]
  ],
  [
    "vidya",
    "Variable Index Dynamic Average",
    false,
    [nat("short period", 7), nat("long period", 14), flt("alpha", 0.2, 0, 1)],
    [out.any("vidya")]
  ],
  [
    "volatility",
    "Annualized Historical Volatility",
    false,
    [nat("period", 14)],
    [out.any("volatility")]
  ],
  [
    "vosc",
    "Volume Oscillator",
    false,
    [nat("short period", 7), nat("long period", 14)],
    [out.cosc("vosc")]
  ],
  [
    "vwma",
    "Volume Weighted Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("vwma")]
  ],
  ["wad", "Williams Accumulation/Distribution", false, [], [out.any("wad")]],
  ["wcprice", "Weighted Close Price", true, [], [out.pval("wcprice")]],
  [
    "wilders",
    "Wilders Smoothing",
    true,
    [nat("period", 14)],
    [out.pval("wilders")]
  ],
  ["willr", "Williams %R", false, [nat("period", 14)], [out.npct("willr")]],
  [
    "wma",
    "Weighted Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("wma")]
  ],
  [
    "zlema",
    "Zero-Lag Exponential Moving Average",
    true,
    [nat("period", 14)],
    [out.pval("zlema")]
  ]
];
for (const args of data) {
  descriptors[args[0]] = new IndicatorDescriptor(...args);
}
