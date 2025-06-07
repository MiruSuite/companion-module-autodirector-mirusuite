/* eslint-disable n/no-unsupported-features/node-builtins */
import Jimp from 'jimp'
import { InstanceStatus } from '@companion-module/base'
import { MiruSuiteModuleInstance } from '../main.js'
import { getComponentOfType } from '../scripts/helpers.js'
import createClient, { type Client } from 'openapi-fetch'
import { paths } from './openapi.js'
import type { ActivePreset, Device, FaceIdEntity, PresetEntity, ShotSize, TrackingMode } from './types.js'

export default class Backend {
	private self: MiruSuiteModuleInstance
	private baseUrl: string | undefined = undefined
	private _client: Client<paths> | undefined = undefined

	get client(): Client<paths> {
		if (this._client === undefined) {
			throw new Error('Client not initialized')
		}
		return this._client
	}

	constructor(self: MiruSuiteModuleInstance) {
		this.self = self
	}

	async setup(serverIP: string, serverPort: number, username: string = '', password: string = ''): Promise<void> {
		this.self.updateStatus(InstanceStatus.Connecting)
		try {
			serverIP = serverIP.trim()
			if (serverIP === 'localhost') {
				serverIP = '127.0.0.1'
			}
			this.baseUrl = `http://${serverIP}:${serverPort}`
			this.self.log('debug', `Setting up backend for base url ${this.baseUrl}`)
			// We override the fetch function to update connection status and throw in case of errors
			const checkedFetch: typeof fetch = async (input, init) => {
				const response = await fetch(input, init)
				if (!response.ok) {
					this.self.updateStatus(InstanceStatus.ConnectionFailure)
					this.self.log('error', 'Backend returned code ' + response.status + ' - ' + response.statusText)
				}
				this.self.updateStatus(InstanceStatus.Ok)
				return response
			}
			let headers = undefined
			if (username && password) {
				headers = {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
				}
			} else {
				headers = {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				}
			}

			this._client = createClient<paths>({
				baseUrl: this.baseUrl,
				fetch: checkedFetch,
				headers: headers,
			})
			this.self.log('debug', 'Backend setup complete')
		} catch (error) {
			this.self.log('error', 'Error setting up backend' + error)
			this.self.updateStatus(InstanceStatus.ConnectionFailure)
			throw error
		}
	}

	async loadDevices(): Promise<Device[]> {
		const response = await this.client.GET('/api/devices')
		return response.data ?? []
	}

	/**
	 * Enables, disables or toggles the director component of a device.
	 * @param device device to update
	 * @param enabled true = enable, false = disable, undefined = toggle
	 * @returns after completion
	 */
	async toggleDirector(device: Device | undefined, enabled?: boolean): Promise<void> {
		if (device === undefined) {
			return
		}
		const directorId = getComponentOfType(device, 'DIRECTOR')
		if (!directorId) {
			return
		}
		enabled ??= device.feedback[(directorId ?? '') as string]?.state !== 'RUNNING'
		await this.client.POST(enabled ? '/api/devices/{id}/{component}/enable' : '/api/devices/{id}/{component}/disable', {
			params: { path: { id: device.id ?? -1, component: directorId } },
		})
	}

	async setShotSize(device: Device | undefined, shotSize: ShotSize): Promise<void> {
		if (device === undefined) {
			return
		}
		const settings = device.components?.headTrackingDirector
		if (settings !== null && settings !== undefined) {
			settings.targetShotSize = shotSize
			await this.client.PUT('/api/devices/{id}', {
				params: { path: { id: device.id ?? -1 } },
				body: {
					patch: {
						headTrackingDirector: settings,
					},
				},
			})
		}
	}

	async listFaces(): Promise<FaceIdEntity[]> {
		const response = await this.client.GET('/api/faces/persistent')
		return response?.data ?? []
	}

	async learnTargetFace(device: Device | undefined): Promise<void> {
		await this.client.POST('/api/devices/{id}/tracker/learn', {
			params: { path: { id: device?.id ?? -1 } },
		})
	}

	async listPresets(): Promise<PresetEntity[]> {
		const response = await this.client.GET('/api/projects/active')
		if (response?.data !== undefined) {
			const project = response.data
			const presets = project.presets ?? []
			// Remove preview images to save memory
			return presets.map((p) => ({ ...p, previewBase64: undefined }))
		}
		return []
	}

	async playPreset(id: number): Promise<void> {
		await this.client.POST('/api/projects/active/presets/{id}/play', {
			params: { path: { id } },
		})
	}

	async playActivePreset(device: number): Promise<void> {
		await this.client.POST('/api/projects/active/presets/reapply/{device}', {
			params: { path: { device } },
		})
	}

	async overwritePreset(id: number): Promise<void> {
		await this.client.POST('/api/projects/active/presets/{id}/overwrite', {
			params: { path: { id } },
		})
	}

	async loadActivePresetMap(): Promise<{ [key: number]: ActivePreset }> {
		const response = await this.client.GET('/api/projects/active/presets/active')
		return response?.data ?? {}
	}

	async setTrackingMode(device: Device | undefined, mode: TrackingMode, targetFaceId: number): Promise<void> {
		if (device === undefined) {
			return
		}
		const { personTracker } = device.components
		if (personTracker !== undefined && personTracker !== null) {
			personTracker.trackingMode = mode
			personTracker.targetFaceId = targetFaceId
			await this.client.PUT('/api/devices/{id}', {
				params: { path: { id: device.id ?? -1 } },
				body: { patch: { personTracker } },
			})
		}
	}

	async loadPreviewImage(personId: number): Promise<Jimp | undefined> {
		try {
			return await Jimp.read(`${this.baseUrl}/api/faces/${personId}/img`)
		} catch (error) {
			this.self.log('warn', 'Error loading preview image for person' + personId + ' - ' + error)
			return undefined
		}
	}

	async getLiveInputs(): Promise<string[]> {
		const response = await this.client.GET('/api/switcher')
		if (response.data?.connectionStatus !== 'CONNECTED') {
			this.self.log('warn', 'Switcher not connected')
			return []
		}
		return response.data.programs ?? []
	}

	async triggerRandomMove(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/automove', {
			params: { path: { id } },
		})
	}

	async triggerPresetTransitionMove(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/presetmove', {
			params: { path: { id } },
		})
	}

	async stopAutoMove(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/stop', {
			params: { path: { id } },
		})
	}

	async triggerReturnToHome(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/controller/control', {
			params: { path: { id } },
			body: { returnToHome: true },
		})
	}

	async isAutoCutRunning(): Promise<boolean> {
		const response = await this.client.GET('/api/autocut')
		return response.data?.running ?? false
	}

	async setAutoCut(activate: boolean): Promise<void> {
		await this.client.PUT(activate ? '/api/autocut/start' : '/api/autocut/stop')
	}

	async toggleAutoCut(): Promise<void> {
		const enabled = this.self.store.isAutoCutRunning()
		await this.client.PUT(enabled ? '/api/autocut/stop' : '/api/autocut/start')
	}

	async cutTo(input: string): Promise<void> {
		await this.client.POST('/api/switcher/program/{input}', {
			params: { path: { input } },
		})
	}

	async exitSteadyMode(id: number): Promise<void> {
		await this.client.POST('/api/devices/{id}/director/steady/exit', {
			params: { path: { id } },
		})
	}
}
