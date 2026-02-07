import { describe, expect, it } from 'vitest';
import { mapWriteStatusToToastPayload } from '../src/lib/components/ui';

describe('toast mapping contract', () => {
	it('maps pending writes to info toast', () => {
		expect(mapWriteStatusToToastPayload('thread', 'pending')).toEqual({
			title: 'Thread wird gesendet',
			variant: 'info'
		});
	});

	it('maps confirmed writes to success toast', () => {
		expect(mapWriteStatusToToastPayload('reaction', 'confirmed')).toEqual({
			title: 'Reaktion bestaetigt',
			variant: 'success'
		});
	});

	it('maps failed writes to error toast with retry hint', () => {
		expect(mapWriteStatusToToastPayload('report', 'failed')).toEqual({
			title: 'Report nicht gesendet',
			description: 'Lokal gespeichert. Retry ist moeglich.',
			variant: 'error'
		});
	});
});
