import {
	previewNext,
	type CategoryId,
	type CategorySettings,
	type Student,
	type TallyEvent
} from '../domain';
import { Undo2Icon, MessageSquarePlusIcon } from '../components/icons';
import { tap } from '../haptics';
import { actionLabel, categoryLabel, t } from '../i18n';
import { logEvent, setEventNote, undoLog } from '../services';
import { app } from './app.svelte';
import { toast } from './toast.svelte';

interface NoteTarget {
	pending: Promise<TallyEvent>;
	student: Student;
	category: CategorySettings;
}

/** The three-tap logging flow: toast with undo and note, optimistic and non-blocking. */
class LoggingState {
	noteFor = $state.raw<NoteTarget | null>(null);

	log(student: Student, categoryId: CategoryId): void {
		const repo = app.repo;
		if (!repo) return;
		const cat = app.category(categoryId);
		const now = new Date();
		const preview = previewNext(app.studentEvents(student.id), student.id, cat, now.getTime());
		const describe = (count: number, action: typeof preview.action) =>
			t('toast.logged', {
				student: student.label,
				category: categoryLabel(cat, t),
				count,
				action: actionLabel(action, t)
			});
		tap();

		const pending = logEvent(
			repo,
			{ classId: student.classId, studentId: student.id, category: categoryId },
			now
		);
		let toastId = 0;
		toastId = toast.show({
			text: describe(preview.count, preview.action),
			actions: [
				{
					key: 'undo',
					label: t('toast.undo'),
					icon: Undo2Icon,
					run: async () => {
						try {
							const event = await pending;
							await undoLog(repo, event.id);
							toast.dismiss(toastId);
						} catch (error) {
							console.error(error);
							toast.show({ text: t('toast.saveFailed'), tone: 'error' });
						}
					}
				},
				{
					key: 'note',
					label: t('toast.addNote'),
					icon: MessageSquarePlusIcon,
					run: () => {
						this.noteFor = { pending, student, category: cat };
						toast.pause();
					}
				}
			]
		});
		pending.then(
			(event) => {
				// The stored snapshot is authoritative; correct the message if the cache was stale.
				if (event.countAtCreation !== preview.count || event.action !== preview.action) {
					toast.updateText(toastId, describe(event.countAtCreation, event.action));
				}
			},
			(error) => {
				console.error(error);
				toast.show({ text: t('toast.saveFailed'), tone: 'error' });
			}
		);
	}

	async saveNote(text: string): Promise<void> {
		const target = this.noteFor;
		const repo = app.repo;
		if (!target || !repo) return;
		this.noteFor = null;
		try {
			const event = await target.pending;
			await setEventNote(repo, event.id, text);
			toast.show({ text: t('note.saved'), durationMs: 2000 });
		} catch (error) {
			console.error(error);
			toast.show({ text: t('toast.saveFailed'), tone: 'error' });
		}
	}

	closeNote(): void {
		if (!this.noteFor) return;
		this.noteFor = null;
		toast.resume(3000);
	}
}

export const logging = new LoggingState();
