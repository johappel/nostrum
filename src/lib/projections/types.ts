export type RawNostrTag = string[];

export interface RawNostrEvent {
	id?: string;
	kind?: number;
	pubkey?: string;
	created_at?: number;
	createdAt?: number;
	content?: string;
	tags?: RawNostrTag[];
}

