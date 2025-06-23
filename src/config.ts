import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	host: string
	port: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Server IP',
			width: 8,
			tooltip: 'The IP address of the MiruSuite instance. If localhost, use 127.0.0.1.',
			regex: Regex.IP,
			default: '127.0.0.1',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Server Port',
			tooltip: 'The port for HTTP communication to MiruSuite. Default: 8080',
			width: 4,
			min: 1,
			max: 65535,
			default: 8080,
		},
	]
}
