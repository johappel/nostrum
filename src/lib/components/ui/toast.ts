import { toast } from 'svelte-sonner';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';
export type WriteToastStatus = 'pending' | 'confirmed' | 'failed';
export type WriteToastAction = 'thread' | 'reaction' | 'report';

export interface ToastPayload {
	title: string;
	description?: string;
	variant: ToastVariant;
}

export function mapWriteStatusToToastPayload(
	action: WriteToastAction,
	status: WriteToastStatus
): ToastPayload {
	const actionLabel =
		action === 'thread'
			? 'Thread'
			: action === 'reaction'
				? 'Reaktion'
				: 'Report';

	if (status === 'confirmed') {
		return {
			title: `${actionLabel} bestaetigt`,
			variant: 'success'
		};
	}

	if (status === 'failed') {
		return {
			title: `${actionLabel} nicht gesendet`,
			description: 'Lokal gespeichert. Retry ist moeglich.',
			variant: 'error'
		};
	}

	return {
		title: `${actionLabel} wird gesendet`,
		variant: 'info'
	};
}

export function emitToast(payload: ToastPayload): void {
	if (payload.variant === 'success') {
		toast.success(payload.title, { description: payload.description });
		return;
	}
	if (payload.variant === 'warning') {
		toast.warning(payload.title, { description: payload.description });
		return;
	}
	if (payload.variant === 'error') {
		toast.error(payload.title, { description: payload.description });
		return;
	}
	toast.info(payload.title, { description: payload.description });
}

export function notifyWriteStatus(action: WriteToastAction, status: WriteToastStatus): void {
	emitToast(mapWriteStatusToToastPayload(action, status));
}

export function notifyError(title: string, description?: string): void {
	emitToast({ title, description, variant: 'error' });
}

export function notifyInfo(title: string, description?: string): void {
	emitToast({ title, description, variant: 'info' });
}

export function notifySuccess(title: string, description?: string): void {
	emitToast({ title, description, variant: 'success' });
}
