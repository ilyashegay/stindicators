export type IndicatorOption = {
	name: string
	step: number
	def: number
	min: number
	max?: number
}

export type IndicatorOutput = {
	name: string
	min?: number
	max?: number
}

export class IndicatorDescriptor {
	constructor(
		public key: string,
		public name: string,
		public isOverlay: boolean,
		public options: IndicatorOption[],
		public outputs: IndicatorOutput[],
	) {}
}

export const descriptors: Record<string, IndicatorDescriptor> = {}

const nat = (name: string, def: number): IndicatorOption => ({
	name,
	min: 1,
	step: 1,
	def,
})

const flt = (
	name: string,
	def: number,
	min: number,
	max?: number,
): IndicatorOption => ({
	name,
	min,
	max,
	step: 0.1,
	def,
})

const out: Record<
	'any' | 'pval' | 'uosc' | 'cosc' | 'pct' | 'npct',
	(name: string) => IndicatorOutput
> = {
	any: (name) => ({ name }),
	pval: (name) => ({ name, min: 0 }),
	uosc: (name) => ({ name, min: -1, max: 1 }),
	cosc: (name) => ({ name, min: -100, max: 100 }),
	pct: (name) => ({ name, min: 0, max: 100 }),
	npct: (name) => ({ name, min: -100, max: 0 }),
}

const data: ConstructorParameters<typeof IndicatorDescriptor>[] = [
	['open', 'Open Price', true, [], [out.pval('open')]],
	['high', 'High Price', true, [], [out.pval('high')]],
	['low', 'Low Price', true, [], [out.pval('low')]],
	['close', 'Close Price', true, [], [out.pval('close')]],
	['volume', 'Volume', false, [], [out.pval('volume')]],
	['ad', 'Accumulation/Distribution Line', false, [], [out.any('ad')]],
	[
		'adosc',
		'Accumulation/Distribution Oscillator',
		false,
		[nat('short period', 7), nat('long period', 14)],
		[out.any('adosc')],
	],
	[
		'adx',
		'Average Directional Movement Index',
		false,
		[nat('period', 14)],
		[out.pct('adx')],
	],
	[
		'adx_slope',
		'Average Directional Movement Index Slope',
		false,
		[nat('adx period', 14), nat('slope period', 14)],
		[out.any('adx_slope')],
	],
	[
		'adxr',
		'Average Directional Movement Rating',
		false,
		[nat('period', 14)],
		[out.pct('adxr')],
	],
	['ao', 'Awesome Oscillator', false, [], [out.any('ao')]],
	[
		'apo',
		'Absolute Price Oscillator',
		false,
		[nat('short period', 7), nat('long period', 14)],
		[out.any('apo')],
	],
	[
		'aroon',
		'Aroon',
		false,
		[nat('period', 14)],
		[out.pct('aroon_down'), out.pct('aroon_up')],
	],
	[
		'aroonosc',
		'Aroon Oscillator',
		false,
		[nat('period', 14)],
		[out.cosc('aroonosc')],
	],
	['atr', 'Average True Range', false, [nat('period', 14)], [out.pval('atr')]],
	['avgprice', 'Average Price', true, [], [out.pval('avgprice')]],
	[
		'bbands',
		'Bollinger Bands',
		true,
		[nat('period', 20), nat('stddev', 2)],
		[
			out.pval('bbands_lower'),
			out.pval('bbands_middle'),
			out.pval('bbands_upper'),
		],
	],
	['bop', 'Balance of Power', false, [], [out.uosc('bop')]],
	[
		'cci',
		'Commodity Channel Index',
		false,
		[nat('period', 14)],
		[out.any('cci')],
	],
	[
		'cmo',
		'Chande Momentum Oscillator',
		false,
		[nat('period', 14)],
		[out.cosc('cmo')],
	],
	['cvi', 'Chaikins Volatility', false, [nat('period', 14)], [out.cosc('cvi')]],
	[
		'dema',
		'Double Exponential Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('dema')],
	],
	[
		'di',
		'Directional Indicator',
		false,
		[nat('period', 14)],
		[out.pct('plus_di'), out.pct('minus_di')],
	],
	[
		'dm',
		'Directional Movement',
		false,
		[nat('period', 14)],
		[out.pct('plus_dm'), out.pct('minus_dm')],
	],
	[
		'dpo',
		'Detrended Price Oscillator',
		false,
		[nat('period', 14)],
		[out.any('dpo')],
	],
	[
		'dx',
		'Directional Movement Index',
		false,
		[nat('period', 14)],
		[out.pct('dx')],
	],
	[
		'ema',
		'Exponential Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('ema')],
	],
	['emv', 'Ease of Movement', false, [], [out.uosc('emv')]],
	[
		'fisher',
		'Fisher Transform',
		false,
		[nat('period', 14)],
		[out.any('fisher'), out.any('fisher_signal')],
	],
	[
		'fosc',
		'Forecast Oscillator',
		false,
		[nat('period', 14)],
		[out.cosc('fosc')],
	],
	['ha_open', 'Heikin Ashi Open', true, [], [out.pval('ha_open')]],
	['ha_high', 'Heikin Ashi High', true, [], [out.pval('ha_high')]],
	['ha_low', 'Heikin Ashi Low', true, [], [out.pval('ha_low')]],
	['ha_close', 'Heikin Ashi Close', true, [], [out.pval('ha_close')]],
	['hma', 'Hull Moving Average', true, [nat('period', 14)], [out.pval('hma')]],
	[
		'kama',
		'Kaufman Adaptive Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('kama')],
	],
	[
		'kvo',
		'Klinger Volume Oscillator',
		false,
		[nat('short period', 7), nat('long period', 14)],
		[out.any('kvo')],
	],
	[
		'linreg',
		'Linear Regression',
		true,
		[nat('period', 14)],
		[out.pval('linreg')],
	],
	[
		'linregintercept',
		'Linear Regression Intercept',
		false,
		[nat('period', 14)],
		[out.any('linregintercept')],
	],
	[
		'linregslope',
		'Linear Regression Slope',
		false,
		[nat('period', 14)],
		[out.any('linregslope')],
	],
	[
		'macd',
		'Moving Average Convergence/Divergence',
		false,
		[nat('short period', 12), nat('long period', 26), nat('signal period', 9)],
		[out.any('macd'), out.any('macd_signal'), out.any('macd_histogram')],
	],
	['marketfi', 'Market Facilitation Index', false, [], [out.any('marketfi')]],
	['mass', 'Mass Index', false, [nat('period', 14)], [out.any('mass')]],
	[
		'md',
		'Mean Deviation Over Period',
		false,
		[nat('period', 14)],
		[out.any('md')],
	],
	['medprice', 'Median Price', true, [], [out.pval('medprice')]],
	['mfi', 'Money Flow Index', false, [nat('period', 14)], [out.pct('mfi')]],
	['mom', 'Momentum', false, [nat('period', 14)], [out.any('mom')]],
	[
		'msw',
		'Mesa Sine Wave',
		false,
		[nat('period', 14)],
		[out.uosc('msw_sine'), out.uosc('msw_lead')],
	],
	[
		'natr',
		'Normalized Average True Range',
		false,
		[nat('period', 14)],
		[out.any('natr')],
	],
	['nvi', 'Negative Volume Index', false, [], [out.any('nvi')]],
	['obv', 'On Balance Volume', false, [], [out.any('obv')]],
	[
		'ppo',
		'Percentage Price Oscillator',
		false,
		[nat('short period', 7), nat('long period', 14)],
		[out.cosc('ppo')],
	],
	[
		'psar',
		'Parabolic SAR',
		true,
		[
			flt('acceleration factor step', 0.2, 0, 1),
			flt('acceleration factor maximum', 2, 0.1),
		],
		[out.pval('psar')],
	],
	['pvi', 'Positive Volume Index', false, [], [out.any('pvi')]],
	['qstick', 'Qstick', false, [nat('period', 14)], [out.any('qstick')]],
	['roc', 'Rate of Change', false, [nat('period', 14)], [out.any('roc')]],
	[
		'rocr',
		'Rate of Change Ratio',
		false,
		[nat('period', 14)],
		[out.any('rocr')],
	],
	[
		'rsi',
		'Relative Strength Index',
		false,
		[nat('period', 14)],
		[out.pct('rsi')],
	],
	[
		'sma',
		'Simple Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('sma')],
	],
	[
		'stoch',
		'Stochastic Oscillator',
		false,
		[nat('%k period', 14), nat('%k slowing period', 3), nat('%d period', 1)],
		[out.pct('stoch_k'), out.pct('stoch_d')],
	],
	[
		'stochrsi',
		'Stochastic RSI',
		false,
		[nat('period', 14)],
		[out.pct('stochrsi')],
	],
	[
		'tema',
		'Triple Exponential Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('tema')],
	],
	['tr', 'True Range', false, [], [out.pval('tr')]],
	[
		'trima',
		'Triangular Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('trima')],
	],
	['trix', 'Trix', false, [nat('period', 14)], [out.cosc('trix')]],
	['tsf', 'Time Series Forecast', true, [nat('period', 14)], [out.pval('tsf')]],
	['typprice', 'Typical Price', true, [], [out.pval('typprice')]],
	[
		'ultosc',
		'Ultimate Oscillator',
		false,
		[nat('short period', 7), nat('medium period', 14), nat('long period', 28)],
		[out.pct('ultosc')],
	],
	[
		'vhf',
		'Vertical Horizontal Filter',
		false,
		[nat('period', 14)],
		[out.any('vhf')],
	],
	[
		'vidya',
		'Variable Index Dynamic Average',
		false,
		[nat('short period', 7), nat('long period', 14), flt('alpha', 0.2, 0, 1)],
		[out.any('vidya')],
	],
	[
		'volatility',
		'Annualized Historical Volatility',
		false,
		[nat('period', 14)],
		[out.any('volatility')],
	],
	[
		'vosc',
		'Volume Oscillator',
		false,
		[nat('short period', 7), nat('long period', 14)],
		[out.cosc('vosc')],
	],
	[
		'vwma',
		'Volume Weighted Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('vwma')],
	],
	['wad', 'Williams Accumulation/Distribution', false, [], [out.any('wad')]],
	['wcprice', 'Weighted Close Price', true, [], [out.pval('wcprice')]],
	[
		'wilders',
		'Wilders Smoothing',
		true,
		[nat('period', 14)],
		[out.pval('wilders')],
	],
	['willr', 'Williams %R', false, [nat('period', 14)], [out.npct('willr')]],
	[
		'wma',
		'Weighted Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('wma')],
	],
	[
		'zlema',
		'Zero-Lag Exponential Moving Average',
		true,
		[nat('period', 14)],
		[out.pval('zlema')],
	],
]

for (const args of data) {
	descriptors[args[0]] = new IndicatorDescriptor(...args)
}
