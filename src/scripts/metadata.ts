import { PresetEntity } from '../api/types.js'

// Mostly copied from internal MiruSuite metadata.ts
export const knownMetadata = ['shotSize', 'scene', 'instrument']
type KnownMetadata = (typeof knownMetadata)[number]

type MetadataKey = {
	name: string
	knownValues: MetadataValue[]
}

type MetadataValue = {
	value: string
	name: string
	extraSearchString?: string
}

export const knownKeys: { [key in KnownMetadata]: MetadataKey } = {
	shotSize: {
		name: 'Shot size',
		knownValues: [
			{ value: 'wide', name: 'Wide' },
			{ value: 'medium', name: 'Medium' },
			{ value: 'close', name: 'Close up' },
		],
	},
	scene: {
		name: 'Scene',
		knownValues: [],
	},
	instrument: {
		name: 'Instrument',
		knownValues: [
			{ value: '1st violin', name: 'First violin', extraSearchString: '1' },
			{ value: '2nd violin', name: 'Second violin', extraSearchString: '2' },
			{ value: 'viola', name: 'Viola' },
			{ value: 'cello', name: 'Cello', extraSearchString: 'violoncello' },
			{ value: 'double bass', name: 'Double bass', extraSearchString: 'contrabass' },
			{ value: 'piccolo', name: 'Piccolo', extraSearchString: 'flute' },
			{ value: 'flute', name: 'Flute' },
			{ value: 'oboe', name: 'Oboe' },
			{ value: 'cor anglais', name: 'Cor anglais' },
			{ value: 'clarinet', name: 'Clarinet' },
			{ value: 'bass clarinet', name: 'Bass clarinet' },
			{ value: 'bassoon', name: 'Bassoon' },
			{ value: 'trumpet', name: 'Trumpet' },
			{ value: 'trombone', name: 'Trombone' },
			{ value: 'french horn', name: 'French horn' },
			{ value: 'tuba', name: 'Tuba' },
			{ value: 'timpani', name: 'Timpani' },
			{ value: 'tam tam', name: 'Tam tam' },
			{ value: 'bass drum', name: 'Bass drum' },
			{ value: 'cymbals', name: 'Cymbals' },
			{ value: 'xylophone', name: 'Xylophone' },
			{ value: 'vibraphone', name: 'Vibraphone' },
			{ value: 'marimba', name: 'Marimba' },
			{ value: 'chimes', name: 'Chimes' },
			{ value: 'snare drum', name: 'Snare drum' },
			{ value: 'tubular bells', name: 'Tubular bells' },
			{ value: 'harp', name: 'Harp' },
			{ value: 'piano', name: 'Piano' },
			{ value: 'conductor', name: 'Conductor' },
		],
	},
}

export const instrumentGroupMap: { [key: string]: string } = {
	'1st violin': 'strings',
	'2nd violin': 'strings',
	viola: 'strings',
	cello: 'strings',
	'double bass': 'strings',
	piccolo: 'woodwinds',
	flute: 'woodwinds',
	oboe: 'woodwinds',
	'cor anglais': 'woodwinds',
	clarinet: 'woodwinds',
	'bass clarinet': 'woodwinds',
	bassoon: 'woodwinds',
	trumpet: 'brass',
	trombone: 'brass',
	'french horn': 'brass',
	tuba: 'brass',
	timpani: 'percussion',
	'tam tam': 'percussion',
	'bass drum': 'percussion',
	cymbals: 'percussion',
	xylophone: 'percussion',
	vibraphone: 'percussion',
	marimba: 'percussion',
	chimes: 'percussion',
	'snare drum': 'percussion',
	'tubular bells': 'percussion',
	harp: 'other',
	piano: 'other',
	conductor: 'other',
}

export function presetSortFn(presetA: PresetEntity, presetB: PresetEntity): number {
	// Sort by Shot size
	const shotSizeA = presetA?.metadata?.shotSize ?? ''
	const shotSizeB = presetB?.metadata?.shotSize ?? ''
	const shotSizeAIndex = knownKeys.shotSize.knownValues.findIndex((value) => value.value === shotSizeA)
	const shotSizeBIndex = knownKeys.shotSize.knownValues.findIndex((value) => value.value === shotSizeB)
	return (
		instrumentSortFn(presetA?.metadata?.instrument, presetB?.metadata?.instrument) ||
		shotSizeAIndex - shotSizeBIndex ||
		deviceSortingFunction(presetA, presetB) ||
		nameSortingFunction(presetA, presetB) ||
		0
	)
}

function instrumentSortFn(instrumentA: string | undefined, instrumentB: string | undefined): number {
	const instrumentAIndex = knownKeys.instrument.knownValues.findIndex((value) => value.value === instrumentA)
	const instrumentBIndex = knownKeys.instrument.knownValues.findIndex((value) => value.value === instrumentB)
	return instrumentAIndex - instrumentBIndex || 0
}

function deviceSortingFunction(presetA: PresetEntity, presetB: PresetEntity): number {
	const minCamA = getAffectedDeviceIds(presetA).reduce((acc, deviceId) => Math.min(acc, deviceId), 1000)
	const minCamB = getAffectedDeviceIds(presetB).reduce((acc, deviceId) => Math.min(acc, deviceId), 1000)
	return minCamA - minCamB
}

function getAffectedDeviceIds(preset: PresetEntity): number[] {
	return preset.commands?.map((cmd) => cmd.deviceId).filter((deviceId) => deviceId !== undefined) as number[]
}

function nameSortingFunction(presetA: PresetEntity, presetB: PresetEntity): number {
	return presetA.name?.localeCompare(presetB?.name ?? '') || 0
}

export function getGroupForInstrument(instrument: string): string {
	return instrumentGroupMap[instrument] ?? 'other'
}

export function getInstrumentsForGroup(group: string): string[] {
	return Object.entries(instrumentGroupMap)
		.filter(([, value]) => value === group)
		.map(([key]) => key)
}

export function getInstrumentGroups(): string[] {
	return Array.from(new Set(Object.values(instrumentGroupMap)))
}

export function valueIncludes(value: MetadataValue, search: string): boolean {
	search = search.toLowerCase()
	return (
		value.value.toLowerCase().includes(search) ||
		value.name.toLowerCase().includes(search) ||
		value.extraSearchString?.toLowerCase().includes(search) ||
		false
	)
}
