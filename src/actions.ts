import { DropdownChoice } from '@companion-module/base'
import { ShotSize, TrackingMode } from './api/types.js'
import type { ModuleInstance } from './main.js'
import {
	createVideoDeviceOptions,
	getDeviceSelector,
	getFaceSelector,
	getInstrumentGroupSelector,
	getPresetSelector,
	createFaceOptions,
	getPresetChoices,
} from './scripts/helpers.js'
import {
	AutoConfiguredButton,
	addAutoButton as learnAutoButton,
	clearLearnedButtons,
	getIndexOfButton,
	getPresetToButton,
	setSelectedDevices,
	clearAllAutoButtons,
	setSelectedInstruments,
	setDisplayDeviceName,
} from './scripts/autolearning.js'

export function UpdateActions(self: ModuleInstance): void {
	const backend = self.backend
	const store = self.store
	const faceChoices: DropdownChoice[] = createFaceOptions(self)
	const videoDevices = store.getVideoDevices()
	const videoDeviceOptions: DropdownChoice[] = createVideoDeviceOptions(videoDevices)
	const presetChoices: DropdownChoice[] = getPresetChoices(self, videoDeviceOptions)
	const presets = store.getPresets()

	self.setActionDefinitions({
		setShotSize: {
			name: 'Set Shot Size',
			description:
				'Set the shot size for a device. To select a device, you first need to create a device in MiruSuite and add a video input to it.',
			options: [
				{
					id: 'size',
					type: 'dropdown',
					label: 'Size',
					choices: [
						{ id: 'CLOSE_UP', label: 'Close' },
						{ id: 'MEDIUM', label: 'Medium' },
						{ id: 'WIDE', label: 'Wide' },
					],
					default: 'WIDE',
				},
				getDeviceSelector(self, videoDeviceOptions),
			],
			async callback(event) {
				const size = event.options.size as ShotSize
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				self.log('info', 'Setting shot size for device ' + deviceId + ' to ' + size)
				await backend?.setShotSize(device, size)
			},
		},
		toggleDirector: {
			name: 'Toggle Director',
			description:
				'Enables/disables the director. Use this if you want to temporarily disable tracking. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a director to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				self.log('info', 'Toggling director for device ' + deviceId)
				await backend?.toggleDirector(device)
			},
		},
		setDirector: {
			name: 'Enable/Disable Director',
			description:
				'Enable or disable the director for a device. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a director to be installed on the device.',
			options: [
				getDeviceSelector(self, videoDeviceOptions),
				{
					id: 'enabled',
					type: 'dropdown',
					label: 'Enable',
					choices: [
						{ id: 'true', label: 'Enable' },
						{ id: 'false', label: 'Disable' },
					],
					default: 'true',
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const enable = event.options.enabled == 'true'
				self.log('info', 'Setting director for device ' + deviceId + ' to ' + enable)
				await backend?.toggleDirector(device, enable)
			},
		},
		setTrackingMode: {
			name: 'Set Tracking Mode',
			description:
				'Set the tracking mode for a device. The person option is only used in SINGLE mode. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a head tracking director to be installed on the device.',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'ALL', label: 'ALL' },
						{ id: 'MANUAL', label: 'MANUAL' },
						{ id: 'SINGLE', label: 'SINGLE' },
					],
					default: 'ALL',
				},
				getFaceSelector(self, faceChoices),
				getDeviceSelector(self, videoDeviceOptions),
			],
			async callback(event) {
				const mode = event.options.mode as TrackingMode
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				const person = Number(event.options.person)
				self.log('info', 'Setting tracking mode for device ' + deviceId + ' to ' + mode + ' with person ' + person)
				await backend?.setTrackingMode(device, mode, person)
			},
		},
		learnTargetFace: {
			name: 'Learn Target Face',
			description:
				'Learn the face of the current target person. Use this action to teach the director the face of a person. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a person tracker to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				const device = store.getDeviceById(deviceId)
				self.log('info', 'Learning face for device ' + deviceId)
				await backend?.learnTargetFace(device)
			},
		},
		playPreset: {
			name: 'Play Preset',
			description:
				'Play a preset. To select a device, you first need to create a device in MiruSuite and add a video input to it.',
			options: [getPresetSelector(self, presetChoices)],
			async callback(event) {
				const presetId = Number(event.options.preset)
				self.log('info', 'Playing preset ' + presetId)
				await backend?.playPreset(presetId)
			},
		},
		playActivePreset: {
			name: 'Play Active Preset',
			description:
				'Re-apply the active preset of a camera. Use this action if you want to return a camera to its active preset if it has moved away. To select a device, you first need to create a device in MiruSuite and add a video input to it.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				self.log('info', 'Re-applying preset of device ' + deviceId)
				await backend?.playActivePreset(deviceId)
			},
		},
		overwritePreset: {
			name: 'Overwrite Preset',
			description: 'Overwrite a preset with the current device position',
			options: [getPresetSelector(self, presetChoices)],
			async callback(event) {
				const presetId = Number(event.options.preset)
				self.log('info', 'Overwriting preset ' + presetId)
				await backend?.overwritePreset(presetId)
			},
		},
		learnAutoButtons: {
			name: 'Learn Auto Preset Buttons',
			description:
				'1. Press this button to start learning. 2. Press your auto preset buttons in the order you want them to be used. 3. Press this button again to finish the learning. Available presets for the configured devices will be automatically arranged on the learned buttons. WARNING: When changing the configuration of this button, you will need to repeat the learning process.',
			options: [
				getDeviceSelector(self, videoDeviceOptions, true, 'Select devices'),
				getInstrumentGroupSelector(),
				{
					id: 'displayName',
					type: 'checkbox',
					label: 'Display Device Names',
					default: 'false',
				},
			],
			async callback(event) {
				if (self.getVariableValue('learningMode') === 'disabled') {
					let devices = []
					if (event.options.deviceIds instanceof String) {
						devices = (event.options.deviceIds as string).split(',').map((id) => Number(id.trim()))
					} else {
						devices = event.options.deviceIds as number[]
					}
					self.log('debug', 'Learning auto preset buttons for ' + event.controlId)
					self.log('debug', 'Selected devices: ' + JSON.stringify(devices))
					if (devices.length === 0) {
						self.log('warn', 'No devices selected')
						return
					}
					self.setVariableValues({ learningMode: event.controlId })
					clearLearnedButtons(self, event.controlId)
					setSelectedDevices(self, event.controlId, devices)
					setDisplayDeviceName(self, event.controlId, event.options.displayName as boolean)
					const instrumentGroups = event.options.instrumentGroups as string[]
					if (!instrumentGroups || instrumentGroups.includes('All')) {
						setSelectedInstruments(self, event.controlId, [])
					} else {
						setSelectedInstruments(self, event.controlId, instrumentGroups)
					}
					self.checkFeedbacks('learnMode', 'autoPreset')
				} else {
					self.log('debug', 'Stopping learning auto preset buttons for ' + event.controlId + '...')
					self.setVariableValues({ learningMode: 'disabled' })
					self.checkFeedbacks('learnMode', 'autoPreset')
				}
			},
		},
		playAutoPreset: {
			name: 'Play Auto Preset',
			description: 'Play the automatically linked preset',
			options: [],
			async callback(event) {
				const thisButton: AutoConfiguredButton = {
					id: event.controlId,
				}
				const [index, bank] = getIndexOfButton(thisButton)
				const learningMode = String(self.getVariableValue('learningMode'))
				if (learningMode != 'disabled') {
					// Learning mode
					if (index > -1 && bank === learningMode) {
						// Already learned by this bank
						return
					}
					learnAutoButton(self, learningMode, {
						id: event.controlId,
					})
				} else {
					self.log('info', 'Playing auto preset...')
					const preset = getPresetToButton(presets, thisButton)
					if (preset === undefined) {
						self.log('warn', 'Preset not set for button ' + index)
						return
					}
					const presetId = Number(preset?.id ?? -1)
					await backend?.playPreset(presetId)
				}
				self.checkFeedbacks('autoPreset', 'learnMode')
			},
		},
		overwriteAutoPreset: {
			name: 'Overwrite Auto Preset',
			description: 'Overwrite the automatically linked preset with the current position',
			options: [],
			async callback(event) {
				const thisButton: AutoConfiguredButton = {
					id: event.controlId,
				}
				const [index] = getIndexOfButton(thisButton)
				const learningMode = String(self.getVariableValue('learningMode'))
				if (learningMode !== 'disabled') {
					// do nothing
					return
				}
				self.log('debug', 'Overwriting auto preset...')
				const preset = getPresetToButton(presets, thisButton)
				if (preset == undefined) {
					self.log('warn', 'Preset not set for button ' + index)
					return
				}
				const presetId = Number(preset?.id ?? -1)
				await backend?.overwritePreset(presetId)
				self.checkFeedbacks('autoPreset', 'learnMode')
			},
		},
		clearAllAutoButtons: {
			name: 'Clear All Auto Buttons',
			description: 'Clear all auto button data. This action is only for debugging purposes.',
			options: [],
			async callback() {
				clearAllAutoButtons(self)
				self.checkFeedbacks('learnMode', 'autoPreset')
			},
		},
		triggerMovement: {
			name: 'Trigger move',
			description:
				'Execute a preset or random move on an auto-move director. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs an auto-move director to be installed on the device.',
			options: [
				getDeviceSelector(self, videoDeviceOptions),
				{
					id: 'type',
					type: 'dropdown',
					label: 'Movement type',
					choices: [
						{ id: 'preset', label: 'Nearby preset' },
						{ id: 'random', label: 'Random direction' },
					],
					default: 'preset',
				},
			],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				if (event.options.type === 'preset') {
					self.log('info', 'Triggering preset transition move for device ' + deviceId)
					await backend?.triggerPresetTransitionMove(deviceId)
				} else if (event.options.type === 'random') {
					self.log('info', 'Triggering random move for device ' + deviceId)
					await backend?.triggerRandomMove(deviceId)
				}
			},
		},
		triggerReturnToHome: {
			name: 'Return to home',
			description:
				'Return device to home position. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a PTZ controller to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				await backend?.triggerReturnToHome(deviceId)
			},
		},
		exitSteadyMode: {
			name: 'Exit steady mode',
			description:
				'Exit steady mode of device. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs a head tracking director to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				await backend?.exitSteadyMode(deviceId)
			},
		},
		stopAutoMove: {
			name: 'Stop move',
			description:
				'Stop auto-movement of device. To select a device, you first need to create a device in MiruSuite and add a video input to it. This action needs an auto-move director to be installed on the device.',
			options: [getDeviceSelector(self, videoDeviceOptions)],
			async callback(event) {
				const deviceId = Number(event.options.deviceId)
				await backend?.stopAutoMove(deviceId)
			},
		},
		toggleAutoCut: {
			name: 'Toggle Auto Cut',
			description: 'Enable or disable Auto cut. You first need to correctly setup AutoCut in MiruSuite.',
			options: [],
			callback: async (_) => {
				await backend?.toggleAutoCut()
			},
		},
		cutToInput: {
			name: 'Cut',
			description: 'Cut to an input of the connected switcher.',
			options: [
				{
					id: 'input',
					type: 'textinput',
					label: 'Input',
					default: '',
				},
			],
			async callback(event) {
				await backend?.cutTo(event.options.input?.toString() ?? '')
			},
		},
	})
}
