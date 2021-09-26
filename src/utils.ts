import Decimal from 'decimal.js'
import { pipe, map } from './flow.operators'

export { Decimal }

export const ZERO = new Decimal(0)
export const ONE = new Decimal(1)
export const HUNDRED = new Decimal(100)

export type Candle = {
	open: Decimal
	high: Decimal
	low: Decimal
	close: Decimal
	volume: Decimal
}

export type Handler<T> = (value: T) => void

export class Stream<P, R> {
	constructor(
		public fn: (
			stream: (next: Handler<P>) => void,
		) => (next: Handler<R>) => void,
		public lb = 0,
	) {}
	public pipe<T>(op: Stream<R, T>) {
		return new Stream<P, T>((source) => op.fn(this.fn(source)), this.lb + op.lb)
	}
	public init() {
		let n: Handler<P> | undefined
		let v: R | undefined
		this.fn((next) => {
			n = next
		})((value) => {
			v = value
		})
		return (value: P) => {
			n?.(value)
			return v
		}
	}
}

export type IndicatorFn<T, R, P extends number[] = number[]> = (
	...args: P
) => Stream<T, R>
export type Smoother = Stream<Decimal, Decimal>
export type Matcher<T> = (current: T, next: T) => boolean

export type IndicatorFnRecord<T, R = IndicatorResult> = Record<
	string,
	IndicatorFn<T, R>
>

export type IndicatorMap<T, R extends Record<string, unknown>> = {
	[key in keyof R]: Stream<T, R[key]>
}

type IndicatorOption = {
	name: string
	step: number
	min: number
	max?: number
}

type IndicatorResult = Decimal | Decimal[]

type IndicatorOutput = {
	name: string
	range?: [number, number]
}

export enum IndicatorType {
	overlay = 'overlay',
	indicator = 'indicator',
	math = 'math',
}

export type IndicatorDescriptor = {
	key: string
	name: string
	type: IndicatorType
	options: IndicatorOption[]
	outputs: IndicatorOutput[]
}

export type DescriptorRecord = Record<string, IndicatorDescriptor>

export function invariant(
	condition: unknown,
	message?: string,
): asserts condition {
	if (!condition) {
		throw new Error(
			message ? 'Invariant failed: ' + message : 'Invariant failed',
		)
	}
}

export function makeOperator<P, R>(
	fn: (next: Handler<R>) => Handler<P>,
	lb = 0,
) {
	return new Stream<P, R>((source) => (next) => source(fn(next)), lb)
}

export function makeStatefulMap<P, R>(fn: () => (value: P) => R) {
	return new Stream<P, R>((source) => (next) => {
		const mapper = fn()
		source((value) => next(mapper(value)))
	})
}

export function makeDescriptor(
	key: string,
	name: string,
	type: IndicatorType,
	options: (IndicatorOption | string)[],
	outputs: (IndicatorOutput | string)[],
): IndicatorDescriptor {
	return {
		key,
		name,
		type,
		options: options.map(
			(option): IndicatorOption =>
				typeof option === 'string' ? { name: option, min: 1, step: 1 } : option,
		),
		outputs: outputs.map(
			(output): IndicatorOutput =>
				typeof output === 'string' ? { name: output } : output,
		),
	}
}

export const makeRaw =
	<R>(op: Stream<Candle, R>): IndicatorFn<Candle, R, []> =>
	() =>
		op

export const makeFromPrice =
	<R, P extends number[]>(
		op: IndicatorFn<Decimal, R, P>,
	): IndicatorFn<Candle, R, P> =>
	(...args) =>
		pipe(
			map((candle) => candle.close),
			op(...args),
		)

export function makeMapper<T>(mapper: (input: T) => Candle) {
	return <R, P extends number[]>(indicator: IndicatorFn<Candle, R, P>) =>
		(...args: P) =>
			pipe(map(mapper), indicator(...args))
}
