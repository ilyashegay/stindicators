import { DescriptorRecord } from './utils'
import descriptors from './descriptors'

export { initIndicators, operators } from './preset'
export { default as descriptors } from './descriptors'
export type {
	Candle,
	Stream,
	IndicatorFn,
	IndicatorMap,
	DescriptorRecord,
	IndicatorFnRecord,
	IndicatorDescriptor,
	IndicatorType,
} from './utils'
export { makeStatefulMap, makeDescriptor } from './utils'
export { decay, edecay, max, min } from './math.operators'
export {
	pipe,
	fork,
	fastFork,
	mapFork,
	listFork,
	fastListFork,
	map,
	skip,
	scan,
	lag,
} from './flow.operators'

export const descriptorMap = descriptors as DescriptorRecord
