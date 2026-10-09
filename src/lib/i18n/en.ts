// English strings: the source of truth. `Messages` (the shape of every locale) is derived from
// this object, and `it.ts` is typed against it. Named placeholders look like {student}.
// A plural leaf is { one, other } and always takes a `count` parameter.
export const en = {
	app: {
		name: 'class-tally'
	},
	common: {
		back: 'Back',
		cancel: 'Cancel',
		close: 'Close',
		save: 'Save',
		add: 'Add',
		edit: 'Edit',
		done: 'Done',
		remove: 'Remove',
		loading: 'Loading…',
		undo: 'Undo',
		days: { one: '{count} day', other: '{count} days' },
		students: { one: '{count} student', other: '{count} students' },
		events: { one: '{count} event', other: '{count} events' }
	},
	nav: {
		label: 'Main navigation',
		classView: 'Class',
		toTranscribe: 'To transcribe',
		history: 'History',
		settings: 'Settings',
		badge: { one: '{count} item to transcribe', other: '{count} items to transcribe' }
	},
	categories: {
		behaviour: 'Behaviour',
		homework: 'Homework',
		materials: 'Materials'
	},
	actions: {
		verbal: 'Verbal warning',
		register: 'Register entry',
		note: 'Disciplinary note'
	},
	levels: {
		verbal: 'V',
		register: 'R',
		note: 'N'
	},
	quickNotes: {
		behaviour: {
			talking: 'Talking',
			phone: 'Phone',
			outOfSeat: 'Out of seat',
			disrespect: 'Disrespect'
		},
		homework: {
			notDone: 'Not done',
			incomplete: 'Incomplete',
			forgotAtHome: 'Forgot at home'
		},
		materials: {
			noTextbook: 'No textbook',
			noCalculator: 'No calculator',
			noNotebook: 'No notebook',
			noPen: 'No pen'
		}
	},
	home: {
		switchClass: 'Switch class',
		manageClasses: 'Manage classes',
		noClasses: {
			title: 'No classes yet',
			body: 'Import a roster or create a class to get started.'
		},
		noStudents: 'No students in this class yet.',
		importRoster: 'Import roster',
		newClass: 'New class',
		badgeAria: '{category}: {count}, next: {action}'
	},
	sheet: {
		title: 'Log for {student}',
		next: '{category} – next: {action}',
		nextOnly: 'Next: {action}',
		inWindow: '{count} in the last {window}'
	},
	toast: {
		logged: '{student} – {category} #{count} – {action}',
		undo: 'Undo',
		addNote: 'Add note',
		saveFailed: 'Could not save. Please try again.',
		dismiss: 'Dismiss'
	},
	note: {
		title: 'Note for {student}',
		placeholder: 'Short note (optional)',
		counter: '{count} / {max}',
		quick: 'Quick notes',
		saved: 'Note saved'
	},
	classes: {
		title: 'Classes',
		newClass: 'New class',
		className: 'Class name',
		rename: 'Rename',
		archive: 'Archive',
		restore: 'Restore',
		archived: 'Archived',
		students: 'Students',
		addStudent: 'Add student',
		studentName: 'Name',
		studentSurname: 'Surname',
		sortKey: 'Sort key (optional)',
		hideStudent: 'Hide from grid',
		showStudent: 'Show in grid',
		hidden: 'Hidden',
		empty: 'No classes yet.',
		nameRequired: 'Enter a class name.',
		studentRequired: 'Enter a name or a surname.',
		openClass: 'Open class'
	},
	import: {
		title: 'Import roster',
		hint: 'Paste the roster (JSON, or one "Surname Name" per line) or choose a file. Nothing leaves this device.',
		pasteLabel: 'Roster text',
		chooseFile: 'Choose file',
		preview: 'Preview',
		classNameLabel: 'Class name',
		target: 'Import into',
		newClass: 'New class',
		surname: 'Surname',
		name: 'Name',
		label: 'Label',
		swap: 'Swap name and surname',
		removeRow: 'Remove this student',
		alreadyThere: 'Already in the class',
		confirm: { one: 'Import {count} student', other: 'Import {count} students' },
		done: { one: 'Imported {count} student', other: 'Imported {count} students' },
		nothingNew: 'Nothing new to import.',
		errors: {
			empty: 'Nothing to import.',
			invalidJson: 'This is not valid JSON.',
			noStudents: 'No students found in this text.',
			isBackup: 'This is a backup file. Use Settings, Import backup.',
			classNameMissing: 'Give every class a name.',
			failed: 'Import failed.'
		}
	},
	transcribe: {
		title: 'To transcribe',
		pending: { one: '{count} event to transcribe', other: '{count} events to transcribe' },
		empty: 'Nothing to transcribe. Well done!',
		checkRegister: 'Check register',
		checkRegisterHint:
			'The action of this entry changed after an event was voided. Check the register.',
		checked: 'Checked',
		markTranscribed: 'Mark transcribed',
		markAll: 'Mark all transcribed',
		marked: {
			one: '{count} event marked as transcribed',
			other: '{count} events marked as transcribed'
		},
		item: '{student} – {category} – {action}',
		today: 'Today',
		yesterday: 'Yesterday'
	},
	history: {
		title: 'History',
		byStudent: 'By student',
		byClass: 'By class',
		student: 'Student',
		class: 'Class',
		from: 'From',
		to: 'To',
		last7: 'Last 7 days',
		last30: 'Last 30 days',
		empty: 'No events in this period.',
		allCategories: 'All categories',
		category: 'Category',
		transcribed: 'Transcribed',
		toTranscribe: 'To transcribe',
		voided: 'Voided',
		editNote: 'Edit note',
		noNote: 'No note',
		count: 'No. {count}',
		pickStudent: 'Choose a student.'
	},
	void: {
		action: 'Void event',
		title: 'Void this event?',
		body: 'It stays in the history, struck through, and no longer counts.',
		transcribedWarning: 'It is already on the official register. Remove it there too.',
		confirm: 'Void',
		done: 'Event voided',
		recomputed: { one: '{count} later event updated', other: '{count} later events updated' }
	},
	settings: {
		title: 'Settings',
		language: 'Language',
		languages: {
			en: 'English',
			it: 'Italiano'
		},
		about: 'All data stays on this device.'
	},
	errors: {
		generic: 'Something went wrong.',
		storage: 'Storage is not available in this browser. Data cannot be saved.'
	}
} as const;

/** Shape shared by every locale: same nested keys, every leaf a string or a plural pair. */
type Widen<T> = T extends string
	? string
	: T extends { readonly one: string; readonly other: string }
		? { readonly one: string; readonly other: string }
		: { readonly [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof en>;
