// src/utils.ts
import Decimal from "decimal.js";

// src/flow.operators.ts
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
    this.items = Array(size);
  }
  push(item) {
    const index2 = this.length % this.size;
    const current = this.items[index2];
    this.items[index2] = item;
    this.length += 1;
    return current;
  }
  get(index2) {
    invariant(index2 >= 0 && index2 < this.length && index2 >= this.length - this.size, "RollingList index out of bounds");
    const item = this.items[index2 % this.size];
    invariant(item, "Rolling List item is undefined");
    return item;
  }
};
var self = (x) => x;
function identity() {
  return new Stream(self);
}
function map(callback) {
  return makeStatefulMap(() => {
    let i = 0;
    return (value) => callback(value, i++);
  });
}
function scan(callback, initialValue) {
  return makeStatefulMap(() => {
    let state = initialValue;
    let i = 0;
    return (value) => {
      state = callback(state, value, i++);
      return state;
    };
  });
}
function skip(count) {
  return makeOperator((next) => {
    let i = 0;
    return (value) => {
      if (++i > count) {
        next(value);
      }
    };
  }, count);
}
function flatMap(mapper) {
  return makeStatefulMap(() => (value) => mapper(...value));
}
function mapWithLast(mapper, firstResult) {
  return makeOperator((next) => {
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
}
function lag(period, initialValue) {
  invariant(period > 0, "Lag period must be at least 1");
  return makeOperator((next) => {
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
        const value = tail != null ? tail : initialValue;
        if (value !== void 0)
          next(value);
      };
    }
  }, initialValue !== void 0 ? 0 : period);
}
function forkWithLag(period, initialValue) {
  return makeOperator((next) => {
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
        var _a;
        const tail = (_a = inputs.push(head)) != null ? _a : initialValue;
        if (tail !== void 0)
          next([head, tail]);
      };
    }
  }, initialValue !== void 0 ? 0 : period);
}
function memAll(period) {
  return makeStatefulMap(() => {
    const inputs = new RollingList(period);
    return (head) => {
      inputs.push(head);
      return inputs;
    };
  });
}
function matchItem(period, matcher) {
  return makeOperator((next) => {
    const inputs = new RollingList(period);
    let result;
    let resultIndex = -1;
    let index2 = -1;
    return (input) => {
      index2 += 1;
      inputs.push(input);
      if (index2 < inputs.size - 1) {
        return;
      }
      const trail = index2 - inputs.size + 1;
      if (resultIndex < trail) {
        result = inputs.get(trail);
        resultIndex = trail;
        for (let i = trail; i <= index2; i += 1) {
          const item = inputs.get(i);
          if (matcher(result, item)) {
            result = item;
            resultIndex = i;
          }
        }
      } else if (matcher(result, input)) {
        result = input;
        resultIndex = index2;
      }
      next([result, resultIndex]);
    };
  }, period - 1);
}
function mapFork(ops) {
  const keys = Object.keys(ops);
  let lb = 0;
  for (const key of keys) {
    if (ops[key].lb > lb)
      lb = ops[key].lb;
  }
  return makeOperator((next) => {
    let values = {};
    const subject = new Router();
    for (const key of keys) {
      subject.add(ops[key], (value) => {
        values[key] = value;
      });
    }
    let i = 0;
    return (value) => {
      subject.push(value);
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
    const subject = new Router();
    for (let i2 = 0; i2 < ops.length; i2++) {
      const index2 = i2;
      subject.add(ops[index2], (value) => {
        values[index2] = value;
      });
    }
    let i = 0;
    return (value) => {
      subject.push(value);
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
    const subject = new Router();
    for (let i = 0; i < ops.length; i++) {
      const index2 = i;
      subject.add(ops[index2], (value) => {
        values[index2] = value;
      });
    }
    return (value) => {
      subject.push(value);
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

// src/utils.ts
var ZERO = new Decimal(0);
var ONE = new Decimal(1);
var HUNDRED = new Decimal(100);
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
var IndicatorType;
(function(IndicatorType2) {
  IndicatorType2["overlay"] = "overlay";
  IndicatorType2["indicator"] = "indicator";
  IndicatorType2["math"] = "math";
})(IndicatorType || (IndicatorType = {}));
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message ? "Invariant failed: " + message : "Invariant failed");
  }
}
function makeOperator(fn, lb = 0) {
  return new Stream((source) => (next) => source(fn(next)), lb);
}
function makeStatefulMap(fn) {
  return new Stream((source) => (next) => {
    const mapper = fn();
    source((value) => next(mapper(value)));
  });
}
function makeDescriptor(key, name, type, options, outputs) {
  return {
    key,
    name,
    type,
    options: options.map((option) => typeof option === "string" ? { name: option, min: 1, step: 1 } : option),
    outputs: outputs.map((output) => typeof output === "string" ? { name: output } : output)
  };
}
var makeRaw = (op) => () => op;
var makeFromPrice = (op) => (...args) => pipe(map((candle) => candle.close), op(...args));
function makeMapper(mapper) {
  return (indicator) => (...args) => pipe(map(mapper), indicator(...args));
}

// src/descriptors.ts
var descriptors_default = {
  open: makeDescriptor("open", "Open Price", IndicatorType.overlay, [], ["open"]),
  high: makeDescriptor("high", "High Price", IndicatorType.overlay, [], ["high"]),
  low: makeDescriptor("low", "Low Price", IndicatorType.overlay, [], ["low"]),
  close: makeDescriptor("close", "Close Price", IndicatorType.overlay, [], ["close"]),
  volume: makeDescriptor("volume", "Volume", IndicatorType.indicator, [], ["volume"]),
  ad: makeDescriptor("ad", "Accumulation/Distribution Line", IndicatorType.indicator, [], ["ad"]),
  adosc: makeDescriptor("adosc", "Accumulation/Distribution Oscillator", IndicatorType.indicator, ["short period", "long period"], ["adosc"]),
  adx: makeDescriptor("adx", "Average Directional Movement Index", IndicatorType.indicator, ["period"], ["dx"]),
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
  hma: makeDescriptor("hma", "Hull Moving Average", IndicatorType.overlay, ["period"], ["hma"]),
  kama: makeDescriptor("kama", "Kaufman Adaptive Moving Average", IndicatorType.overlay, ["period"], ["kama"]),
  kvo: makeDescriptor("kvo", "Klinger Volume Oscillator", IndicatorType.indicator, ["short period", "long period"], ["kvo"]),
  linreg: makeDescriptor("linreg", "Linear Regression", IndicatorType.overlay, ["period"], ["linreg"]),
  linregintercept: makeDescriptor("linregintercept", "Linear Regression Intercept", IndicatorType.indicator, ["period"], ["linregintercept"]),
  linregslope: makeDescriptor("linregslope", "Linear Regression Slope", IndicatorType.indicator, ["period"], ["linregslope"]),
  macd: makeDescriptor("macd", "Moving Average Convergence/Divergence", IndicatorType.indicator, ["short period", "long period", "signal period"], ["macd", "macd_signal", "macd_histogram"]),
  marketfi: makeDescriptor("marketfi", "Market Facilitation Index", IndicatorType.indicator, [], ["marketfi"]),
  mass: makeDescriptor("mass", "Mass Index", IndicatorType.indicator, ["period"], ["mass"]),
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

// src/math.operators.ts
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
var match_item = (period, matcher) => {
  return pipe(matchItem(period, matcher), map((match) => match[0]));
};
var match_distance = (period, matcher) => {
  return pipe(fork(matchItem(period, matcher), index), flatMap((match, index2) => index2 - match[1]));
};
var max = (period) => match_item(period, (current, next) => next.gte(current));
var min = (period) => match_item(period, (current, next) => next.lte(current));
var max_distance = (period) => match_distance(period, (current, next) => next.gte(current));
var min_distance = (period) => match_distance(period, (current, next) => next.lte(current));
var ema = (factor) => scan((ema3, val, index2) => index2 === 0 ? val : val.times(factor).plus(ema3.times(1 - factor)), ZERO);
var double_ema = (period, factor) => pipe(ema(factor), skip(period - 1), ema(factor), skip(period - 1));
var triple_ema = (period, factor) => pipe(ema(factor), skip(period - 1), ema(factor), skip(period - 1), ema(factor), skip(period - 1));
var dema = (period, factor) => pipe(fork(ema(factor), double_ema(period, factor)), flatMap((ema1, ema22) => ema1.times(2).minus(ema22)));
var tema = (period, factor) => pipe(fork(ema(factor), double_ema(period, factor), triple_ema(period, factor)), flatMap((ema1, ema22, ema3) => ema1.times(3).minus(ema22.times(3)).plus(ema3)));
var trix = (period, factor) => pipe(triple_ema(period, factor), forkWithLag(1), oscillate.diff_over_short);
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
var zlema = (factor, lag2) => pipe(forkWithLag(lag2, ZERO), skip(lag2 - 1), map(([head, tail], index2) => index2 === 0 ? head : head.plus(head.minus(tail))), ema(factor));
var kama = (period) => {
  const f = new Decimal(2).div(3);
  const s = new Decimal(2).div(31);
  const fs = f.minus(s);
  return pipe(fork(pipe(div(pipe(forkWithLag(period, ZERO), flatMap((head, tail) => head.minus(tail).abs())), pipe(mapWithLast((head, tail) => head.minus(tail).abs(), ZERO), sum(period))), map((e) => e.times(fs).plus(s).pow(2))), identity()), scan((kama2, [s2, val], index2) => index2 > 0 ? val.minus(kama2).times(s2).plus(kama2) : val, ZERO));
};
var trima = (period) => pipe(fork(identity(), pipe(forkWithLag(Math.floor(period / 2), ZERO), scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO), lag(1, ZERO), map((sum2, index2) => index2 < Math.floor(period / 2) + 1 ? ZERO : sum2)), pipe(forkWithLag(Math.ceil(period / 2), ZERO), scan((sum2, [head, tail]) => sum2.plus(head).minus(tail), ZERO), lag(Math.floor(period / 2) + 1, ZERO), map((sum2, index2) => index2 < period ? ZERO : sum2))), map(([value, lsum, tsum]) => value.plus(lsum).minus(tsum)), scan((wsum, delta) => wsum.plus(delta), ZERO), skip(period - 1), divideBy(period % 2 ? (Math.floor(period / 2) + 1) * (Math.floor(period / 2) + 1) : (Math.floor(period / 2) + 1) * Math.floor(period / 2)));
var md = (period) => pipe(fork(index, sma(period), memAll(period)), flatMap((index2, sma2, inputs) => {
  let sum2 = ZERO;
  for (let i = 0; i < period; i += 1) {
    sum2 = sum2.plus(inputs.get(index2 - i).minus(sma2).abs());
  }
  return sum2.div(period);
}));
var variance = (smoother) => pipe(fork(pipe(map((n) => n.pow(2)), smoother), pipe(smoother, map((n) => n.pow(2)))), flatMap((p2, p1) => p2.minus(p1)));
var stddev = (smoother) => pipe(variance(smoother), map((n) => n.sqrt()));
var stderr = (period, smoother) => pipe(stddev(smoother), divideBy(new Decimal(period).sqrt()));
var volatility = (duration, smoother) => pipe(mapWithLast((input, last) => input.div(last).minus(1)), stddev(smoother), multiplyBy(new Decimal(duration).sqrt()));
var apo = (short, long) => minus(short, long);
var ppo = (short, long) => oscillators.diff_over_long(short, long);
var macd = (short, long, signal, longPeriod) => pipe(minus(short, long), skip(longPeriod - 1), fork(identity(), signal), flatMap((macd3, signal2) => [
  macd3,
  signal2,
  macd3.minus(signal2)
]));
var gains = mapWithLast((input, last) => input.gt(last) ? input.minus(last) : ZERO);
var losses = mapWithLast((input, last) => input.lt(last) ? last.minus(input) : ZERO);
var cmo = (smoother) => oscillators.diff_over_sum(pipe(gains, smoother), pipe(losses, smoother));
var rsi = (smoother) => oscillators.short_over_sum(pipe(gains, smoother), pipe(losses, smoother));
var stochrsi = (period, smoother) => pipe(rsi(smoother), stoch(identity(), max(period), min(period)));
var dpo = (period, smoother) => minus(lag(Math.floor(period / 2) + 1, ZERO), smoother);
var mom = (period) => pipe(forkWithLag(period), flatMap((head, tail) => head.minus(tail)));
var roc = (period) => pipe(forkWithLag(period), flatMap((head, tail) => head.minus(tail).div(tail)));
var rocr = (period) => pipe(forkWithLag(period), flatMap((head, tail) => head.div(tail)));
var vhf = (period) => pipe(fork(pipe(mapWithLast((val, last) => val.minus(last).abs()), sum(period)), max(period), min(period)), flatMap((sum2, max2, min2) => max2.minus(min2).abs().div(sum2)));
var bbands = (period, scale) => pipe(fork(sma(period), stddev(sma(period))), flatMap((middle, stddev3) => {
  const dev = stddev3.times(scale);
  return [middle.minus(dev), middle, middle.plus(dev)];
}));
var vidya = (short, long, factor, long_period) => pipe(fastFork(pipe(fork(stddev(short), stddev(long)), flatMap((short2, long2) => short2.div(long2).times(factor))), identity()), skip(long_period - 2), scan((vidya3, [s, val], index2) => index2 > 0 ? val.times(s).plus(vidya3.times(ONE.minus(s))) : val, ZERO));
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
var msw = (period) => pipe(memAll(period), skip(period), map((inputs, i) => {
  let rp = ZERO;
  let ip = ZERO;
  for (let j = 0; j < period; j += 1) {
    const weight = inputs.get(period + i - j);
    const a = new Decimal(2 * Math.PI * j / period);
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
var MIN_VOLUME = new Decimal(1e-8);
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
var ad = scan((ad2, candle) => {
  const hl = candle.high.minus(candle.low);
  if (hl.eq(0))
    return ad2;
  return ad2.plus(candle.close.minus(candle.low).minus(candle.high).plus(candle.close).div(hl).times(candle.volume));
}, ZERO);
var adosc = (short, long) => pipe(ad, minus(short, long));
var ao = pipe(medprice, minus(sma(5), sma(34)));
var aroonify = (period) => {
  const factor = HUNDRED.div(period);
  return map((distance) => factor.times(period - distance));
};
var aroon_up = (period) => pipe(highprice, max_distance(period + 1), aroonify(period));
var aroon_down = (period) => pipe(lowprice, min_distance(period + 1), aroonify(period));
var aroon = (period) => fork(aroon_down(period), aroon_up(period));
var aroonosc = (period) => minus(aroon_up(period), aroon_down(period));
var adx = (dm_smoother, dx_smoother) => pipe(dx(dm_smoother), dx_smoother);
var adxr = (dm_smoother, dx_smoother, period) => pipe(adx(dm_smoother, dx_smoother), forkWithLag(period - 1), flatMap((head, tail) => head.plus(tail).div(2)));
var atr = (smoother, skipFirst) => pipe(tr(skipFirst), smoother);
var di = (dm_smoother, tr_smoother) => fork(div(dm_up_smooth(dm_smoother), atr(tr_smoother, true), HUNDRED), div(dm_down_smooth(dm_smoother), atr(tr_smoother, true), HUNDRED));
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
var dm = (smoother) => fork(dm_up_smooth(smoother), dm_down_smooth(smoother));
var dx = (dm_smoother) => pipe(oscillators.diff_over_sum(dm_up_smooth(dm_smoother), dm_down_smooth(dm_smoother)), map((val) => val.abs()));
var tr = (skipFirst = false) => makeStatefulMap(() => {
  let prev;
  return (candle) => {
    const last = prev;
    prev = candle;
    return last ? Decimal.max(candle.high.minus(candle.low), candle.high.minus(last.close).abs(), candle.low.minus(last.close).abs()) : skipFirst ? ZERO : candle.high.minus(candle.low);
  };
});
var cci = (period) => pipe(typprice, fork(identity(), sma(period), md(period)), skip(period - 1), flatMap((tp, atp, md2) => tp.minus(atp).div(md2.times(0.015))));
var bop = map((candle) => candle.close.minus(candle.open).div(candle.high.minus(candle.low)));
var cvi = (period, smoother) => pipe(range, smoother, roc(period), multiplyBy(HUNDRED));
var emv = (scale) => pipe(fork(pipe(medprice, mapWithLast((hl, last) => hl.minus(last))), marketfi), flatMap((hl, marketfi2) => hl.times(marketfi2).times(scale)));
var marketfi = map((candle) => candle.high.minus(candle.low).div(candle.volume));
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
var kvo_cm = pipe(fork(pipe(kvo_trend, mapWithLast((trend, last) => trend === last, true)), pipe(range, forkWithLag(1))), scan((cm, [trend, [dm3, last_dm]]) => (trend ? cm : last_dm).plus(dm3), ZERO));
var kvo = (short, long) => pipe(fork(volume, kvo_trend, range, kvo_cm), flatMap((volume2, trend, dm3, cm) => HUNDRED.times(volume2).times(trend).times(dm3.div(cm).times(2).minus(1).abs())), minus(short, long));
var mass = (period, ema_period, factor) => pipe(range, div(ema(factor), double_ema(ema_period, factor)), sum(period));
var mfi = (period) => pipe(fork(pipe(typprice, forkWithLag(1)), nzvolume), oscillators.short_over_sum(pipe(flatMap(([tp, last_tp], volume2) => tp.gt(last_tp) ? tp.times(volume2) : ZERO), sum(period)), pipe(flatMap(([tp, last_tp], volume2) => tp.lt(last_tp) ? tp.times(volume2) : ZERO), sum(period))));
var natr = (smoother) => div(atr(smoother, false), closeprice, HUNDRED);
var vi = (condition) => pipe(fork(pipe(volume, mapWithLast(condition, false)), pipe(closeprice, mapWithLast((close, last) => close.minus(last).div(last), ZERO))), flatMap((check, close) => check ? close : ZERO), scan((vi2, extra) => vi2.plus(vi2.times(extra)), new Decimal(1e3)));
var pvi = vi((volume2, last) => volume2.gt(last));
var nvi = vi((volume2, last) => volume2.lt(last));
var obv = pipe(fork(pipe(closeprice, mapWithLast((close, last) => close.comparedTo(last), 0)), volume), scan((obv2, [change, volume2]) => obv2.plus(volume2.times(change)), ZERO));
var qstick = (period) => pipe(map((candle) => candle.close.minus(candle.open)), sma(period));
var stoch2 = (fast_k_period, k_smoother, d_smoother) => pipe(stoch(closeprice, pipe(highprice, max(fast_k_period)), pipe(lowprice, min(fast_k_period)), HUNDRED), k_smoother, fork(identity(), d_smoother));
var ultosc = (period1, period2, period3) => pipe(fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))), flatMap((high, low, [close, prevClose]) => {
  const tl = Decimal.min(low, prevClose);
  const th = Decimal.max(high, prevClose);
  return [close.minus(tl), th.minus(tl)];
}), fork(pipe(map((bpr) => bpr[0]), fork(sum(period1), sum(period2), sum(period3))), pipe(map((bpr) => bpr[1]), fork(sum(period1), sum(period2), sum(period3)))), flatMap(([bp1, bp2, bp3], [r1, r2, r3]) => bp1.div(r1).times(4).plus(bp2.div(r2).times(2)).plus(bp3.div(r3)).times(HUNDRED).div(7)));
var vosc = (fast, slow) => pipe(nzvolume, oscillators.diff_over_long(sma(fast), sma(slow)));
var wad = pipe(fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))), flatMap((high, low, [close, prevClose]) => {
  if (close.gt(prevClose)) {
    return close.minus(Decimal.min(low, prevClose));
  }
  if (close.lt(prevClose)) {
    return close.minus(Decimal.max(high, prevClose));
  }
  return ZERO;
}), scan((wad2, ad2) => wad2.plus(ad2), ZERO));
var willr = (period) => stoch(closeprice, pipe(lowprice, min(period)), pipe(highprice, max(period)), -100);
var vwma = (period) => div(pipe(map((candle) => candle.volume.times(candle.close)), sum(period)), pipe(nzvolume, sum(period)));
var fisher = (period) => pipe(medprice, stoch(identity(), max(period), min(period)), scan((res, val) => val.minus(0.5).times(0.66).plus(res.times(0.67)), ZERO), map((val) => val.gt(0.99) ? new Decimal(0.999) : val.lt(-0.99) ? new Decimal(-0.999) : val), map((val) => ONE.plus(val).div(ONE.minus(val)).ln()), scan((fisher2, val) => val.times(0.5).plus(fisher2.times(0.5)), ZERO), forkWithLag(1, ZERO));
var psar = (accel_step, accel_max) => pipe(fork(pipe(highprice, memAll(3)), pipe(lowprice, memAll(3)), index), skip(1), makeStatefulMap(() => {
  let lng;
  let sar;
  let extreme;
  let accel = accel_step;
  return ([highs, lows, index2]) => {
    const high = highs.get(index2);
    const low = lows.get(index2);
    if (index2 === 1) {
      const lastHigh = highs.get(index2 - 1);
      const lastLow = lows.get(index2 - 1);
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
      if (index2 >= 2) {
        sar = Decimal.min(sar, lows.get(index2 - 2));
      }
      sar = Decimal.min(sar, lows.get(index2 - 1));
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
      if (index2 >= 2) {
        sar = Decimal.max(sar, highs.get(index2 - 2));
      }
      sar = Decimal.max(sar, highs.get(index2 - 1));
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

// src/tulind.ts
var factors = {
  d: (period) => (period - 1) / period,
  e: (period) => 2 / (period + 1)
};
var custom_dm_smoother2 = (period) => custom_dm_smoother(period, factors.d(period));
var adosc2 = (shortPeriod, longPeriod) => pipe(adosc(ema2(shortPeriod), ema2(longPeriod)), skip(longPeriod - 1));
var adx2 = (period) => {
  const smoother = custom_dm_smoother2(period);
  return adx(smoother, pipe(smoother, map((val) => val.div(period))));
};
var adxr2 = (period) => {
  const smoother = custom_dm_smoother2(period);
  return adxr(smoother, pipe(smoother, map((val) => val.div(period))), period);
};
var tr2 = () => tr(false);
var atr2 = (period) => atr(wilders(period), false);
var dm2 = (period) => dm(custom_dm_smoother2(period));
var dx2 = (period) => dx(custom_dm_smoother2(period));
var di2 = (period) => {
  const smoother = custom_dm_smoother2(period);
  return di(smoother, smoother);
};
var ema2 = (period) => ema(factors.e(period));
var dema2 = (period) => dema(period, factors.e(period));
var variance2 = (period) => variance(sma(period));
var stddev2 = (period) => stddev(sma(period));
var stderr2 = (period) => stderr(period, sma(period));
var volatility2 = (period) => volatility(252, sma(period));
var apo2 = (short, long) => pipe(apo(ema2(short), ema2(long)), skip(1));
var ppo2 = (short, long) => pipe(ppo(ema2(short), ema2(long)), skip(1));
var macd2 = (short, long, signal) => {
  const isSpecial = short === 12 && long === 26;
  return macd(ema(isSpecial ? 0.15 : factors.e(short)), ema(isSpecial ? 0.075 : factors.e(long)), ema2(signal), long);
};
var cvi2 = (period) => cvi(period, pipe(ema2(period), skip(period - 1)));
var dpo2 = (period) => dpo(period, sma(period));
var emv2 = emv(1e4);
var kvo2 = (short, long) => kvo(ema2(short), ema2(long));
var mass2 = (period) => mass(period, 9, factors.e(9));
var natr2 = (period) => natr(wilders(period));
var trix2 = (period) => trix(period, factors.e(period));
var tema2 = (period) => tema(period, factors.e(period));
var stoch3 = (period1, period2, period3) => stoch2(period1, sma(period2), sma(period3));
var rsi2 = (period) => rsi(wilders(period));
var stochrsi2 = (period) => stochrsi(period, wilders(period));
var cmo2 = (period) => cmo(sum(period));
var vidya2 = (short, long, factor) => vidya(sma(short), sma(long), factor, long);
var zlema2 = (period) => zlema(factors.e(period), Math.floor((period - 1) / 2));

// src/preset.ts
var operators = {
  apo: apo2,
  bbands,
  cmo: cmo2,
  decay,
  dema: dema2,
  dpo: dpo2,
  edecay,
  ema: ema2,
  fosc,
  hma,
  kama,
  linreg,
  linregintercept,
  linregslope,
  macd: macd2,
  max,
  min,
  mom,
  msw,
  ppo: ppo2,
  roc,
  rocr,
  rsi: rsi2,
  sma,
  stddev: stddev2,
  stderr: stderr2,
  stochrsi: stochrsi2,
  tema: tema2,
  trima,
  trix: trix2,
  tsf,
  variance: variance2,
  vhf,
  vidya: vidya2,
  volatility: volatility2,
  wilders,
  wma,
  zlema: zlema2
};
var indicators = {
  open: makeRaw(openprice),
  high: makeRaw(highprice),
  low: makeRaw(lowprice),
  close: makeRaw(closeprice),
  volume: makeRaw(volume),
  ad: makeRaw(ad),
  adosc: adosc2,
  adx: adx2,
  adxr: adxr2,
  ao: makeRaw(ao),
  apo: makeFromPrice(apo2),
  aroon,
  aroonosc,
  atr: atr2,
  avgprice: makeRaw(avgprice),
  bbands: makeFromPrice(bbands),
  bop: makeRaw(bop),
  cci,
  cmo: makeFromPrice(cmo2),
  cvi: cvi2,
  dema: makeFromPrice(dema2),
  di: di2,
  dm: dm2,
  dpo: makeFromPrice(dpo2),
  dx: dx2,
  ema: makeFromPrice(ema2),
  emv: makeRaw(emv2),
  fisher,
  fosc: makeFromPrice(fosc),
  hma: makeFromPrice(hma),
  kama: makeFromPrice(kama),
  kvo: kvo2,
  linreg: makeFromPrice(linreg),
  linregintercept: makeFromPrice(linregintercept),
  linregslope: makeFromPrice(linregslope),
  macd: makeFromPrice(macd2),
  marketfi: makeRaw(marketfi),
  mass: mass2,
  medprice: makeRaw(medprice),
  mfi,
  mom: makeFromPrice(mom),
  msw: makeFromPrice(msw),
  natr: natr2,
  nvi: makeRaw(nvi),
  obv: makeRaw(obv),
  ppo: makeFromPrice(ppo2),
  psar,
  pvi: makeRaw(pvi),
  qstick,
  roc: makeFromPrice(roc),
  rocr: makeFromPrice(rocr),
  rsi: makeFromPrice(rsi2),
  sma: makeFromPrice(sma),
  stoch: stoch3,
  stochrsi: makeFromPrice(stochrsi2),
  tema: makeFromPrice(tema2),
  tr: tr2,
  trima: makeFromPrice(trima),
  trix: makeFromPrice(trix2),
  tsf: makeFromPrice(tsf),
  typprice: makeRaw(typprice),
  ultosc,
  vhf: makeFromPrice(vhf),
  vidya: makeFromPrice(vidya2),
  volatility: makeFromPrice(volatility2),
  vosc,
  vwma,
  wad: makeRaw(wad),
  wcprice: makeRaw(wcprice),
  wilders: makeFromPrice(wilders),
  willr,
  wma: makeFromPrice(wma),
  zlema: makeFromPrice(zlema2)
};
function initIndicators(mapper) {
  const m = makeMapper(mapper);
  return {
    open: m(indicators.open),
    high: m(indicators.high),
    low: m(indicators.low),
    close: m(indicators.close),
    volume: m(indicators.volume),
    avgprice: m(indicators.avgprice),
    bbands: m(indicators.bbands),
    dema: m(indicators.dema),
    ema: m(indicators.ema),
    hma: m(indicators.hma),
    kama: m(indicators.kama),
    linreg: m(indicators.linreg),
    medprice: m(indicators.medprice),
    psar: m(indicators.psar),
    sma: m(indicators.sma),
    tema: m(indicators.tema),
    trima: m(indicators.trima),
    tsf: m(indicators.tsf),
    typprice: m(indicators.typprice),
    vidya: m(indicators.vidya),
    vwma: m(indicators.vwma),
    wcprice: m(indicators.wcprice),
    wilders: m(indicators.wilders),
    wma: m(indicators.wma),
    zlema: m(indicators.zlema),
    ad: m(indicators.ad),
    adosc: m(indicators.adosc),
    adx: m(indicators.adx),
    adxr: m(indicators.adxr),
    ao: m(indicators.ao),
    apo: m(indicators.apo),
    aroon: m(indicators.aroon),
    aroonosc: m(indicators.aroonosc),
    atr: m(indicators.atr),
    bop: m(indicators.bop),
    cci: m(indicators.cci),
    cmo: m(indicators.cmo),
    cvi: m(indicators.cvi),
    di: m(indicators.di),
    dm: m(indicators.dm),
    dpo: m(indicators.dpo),
    dx: m(indicators.dx),
    emv: m(indicators.emv),
    fisher: m(indicators.fisher),
    fosc: m(indicators.fosc),
    kvo: m(indicators.kvo),
    linregslope: m(indicators.linregslope),
    linregintercept: m(indicators.linregintercept),
    macd: m(indicators.macd),
    marketfi: m(indicators.marketfi),
    mass: m(indicators.mass),
    mfi: m(indicators.mfi),
    mom: m(indicators.mom),
    msw: m(indicators.msw),
    natr: m(indicators.natr),
    nvi: m(indicators.nvi),
    obv: m(indicators.obv),
    ppo: m(indicators.ppo),
    pvi: m(indicators.pvi),
    qstick: m(indicators.qstick),
    roc: m(indicators.roc),
    rocr: m(indicators.rocr),
    rsi: m(indicators.rsi),
    stoch: m(indicators.stoch),
    stochrsi: m(indicators.stochrsi),
    tr: m(indicators.tr),
    trix: m(indicators.trix),
    ultosc: m(indicators.ultosc),
    vhf: m(indicators.vhf),
    volatility: m(indicators.volatility),
    vosc: m(indicators.vosc),
    wad: m(indicators.wad),
    willr: m(indicators.willr)
  };
}

// src/index.ts
var descriptorMap = descriptors_default;
export {
  IndicatorType,
  Stream,
  decay,
  descriptorMap,
  descriptors_default as descriptors,
  edecay,
  fastFork,
  fastListFork,
  fork,
  initIndicators,
  lag,
  listFork,
  makeDescriptor,
  makeStatefulMap,
  map,
  mapFork,
  max,
  min,
  operators,
  pipe,
  scan,
  skip
};
