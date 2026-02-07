export interface MockWpUser {
	id: number;
	display_name: string;
	nostr_pubkey_hex: string;
}

export const mockWpUsers: MockWpUser[] = [
	{
		id: 1,
		display_name: 'Admin_Wolfgang',
		nostr_pubkey_hex: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'
	},
	{
		id: 42,
		display_name: 'Foren_Eule',
		nostr_pubkey_hex: '82341f882b6eabcd2baed11a430da23554a938a9a1306eef3d9fd9c5c68e2123'
	},
	{
		id: 105,
		display_name: 'Klaus_Religion',
		nostr_pubkey_hex: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
	},
	{
		id: 210,
		display_name: 'Susi_Sonne',
		nostr_pubkey_hex: 'fa32450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e24532e182'
	},
	{
		id: 312,
		display_name: 'Tech_Tiger',
		nostr_pubkey_hex: 'abc1234567890defabc1234567890defabc1234567890defabc1234567890def'
	}
];

