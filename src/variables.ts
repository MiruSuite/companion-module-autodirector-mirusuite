import type { MiruSuiteModuleInstance } from './main.js'

export function UpdateVariableDefinitions(self: MiruSuiteModuleInstance): void {
	self.setVariableDefinitions([
		{ variableId: 'offlineMode', name: 'Offline mode' },
		{ variableId: 'autoConfiguredButtons', name: 'Auto configured buttons' },
		{ variableId: 'learningMode', name: 'Learning mode' },
	])
}
