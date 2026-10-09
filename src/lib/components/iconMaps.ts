import type { Action, CategoryId } from '../domain';
import {
	BookOpenIcon,
	FilePenLineIcon,
	MessageCircleWarningIcon,
	PencilRulerIcon,
	TriangleAlertIcon,
	Volume2Icon
} from './icons';

export const categoryIcons: Record<CategoryId, typeof BookOpenIcon> = {
	behaviour: MessageCircleWarningIcon,
	homework: BookOpenIcon,
	materials: PencilRulerIcon
};

export const actionIcons: Record<Action, typeof BookOpenIcon> = {
	verbal: Volume2Icon,
	register: FilePenLineIcon,
	note: TriangleAlertIcon
};
