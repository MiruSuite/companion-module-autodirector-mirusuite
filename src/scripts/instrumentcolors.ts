import { combineRgb } from '@companion-module/base'
import { getGroupForInstrument } from './metadata.js'

export const instrumentColors: { [key: string]: [number, number, number] } = {
	strings: [56, 80, 56],
	woodwinds: [77, 0, 80],
	brass: [125, 108, 0],
	percussion: [0, 13, 80],
	other: [0, 0, 0],
}

export const getColorByInstrument = (instrument: string): number => {
	const group = getGroupForInstrument(instrument)
	if (!instrumentColors[group] || group === 'other') {
		return combineRgb(0, 0, 0)
	}
	return combineRgb(...instrumentColors[group])
}
