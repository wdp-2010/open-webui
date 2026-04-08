export type ToolIconKey =
	| 'globe'
	| 'link'
	| 'photo'
	| 'terminal'
	| 'database'
	| 'note'
	| 'chat'
	| 'channels'
	| 'book'
	| 'clock'
	| 'sparkles'
	| 'document';

export type ToolSemantic =
	| 'search_web'
	| 'fetch_url'
	| 'image'
	| 'code'
	| 'memory'
	| 'notes'
	| 'chats'
	| 'channels'
	| 'knowledge'
	| 'time'
	| 'skills'
	| 'generic';


export type ToolPresentation = {
	rawName: string;
	displayName: string;
	semantic: ToolSemantic;
	iconKey: ToolIconKey;
	runningLabel: string;
	doneLabel: string;
	inputLabel: string;
	outputLabel: string;
};

const EXACT_TOOL_MAP: Record<string, Omit<ToolPresentation, 'rawName' | 'displayName'>> = {
	get_current_timestamp: {
		semantic: 'time',
		iconKey: 'clock',
		runningLabel: 'Checking Time',
		doneLabel: 'Checked Time',
		inputLabel: 'Time Request',
		outputLabel: 'Timestamp',
	},
	calculate_timestamp: {
		semantic: 'time',
		iconKey: 'clock',
		runningLabel: 'Calculating Time',
		doneLabel: 'Calculated Time',
		inputLabel: 'Time Offsets',
		outputLabel: 'Calculated Timestamp',
	},
	search_web: {
		semantic: 'search_web',
		iconKey: 'globe',
		runningLabel: 'Searching the web',
		doneLabel: 'Searched the web',
		inputLabel: 'Search Query',
		outputLabel: 'Search Results',
	},
	fetch_url: {
		semantic: 'fetch_url',
		iconKey: 'link',
		runningLabel: 'Fetching Web Page',
		doneLabel: 'Fetched Web Page',
		inputLabel: 'URL',
		outputLabel: 'Page Content',
	},
	generate_image: {
		semantic: 'image',
		iconKey: 'photo',
		runningLabel: 'Generating Image',
		doneLabel: 'Generated Image',
		inputLabel: 'Image Prompt',
		outputLabel: 'Generated Asset',
	},
	edit_image: {
		semantic: 'image',
		iconKey: 'photo',
		runningLabel: 'Editing Image',
		doneLabel: 'Edited Image',
		inputLabel: 'Edit Request',
		outputLabel: 'Edited Asset',
	},
	execute_code: {
		semantic: 'code',
		iconKey: 'terminal',
		runningLabel: 'Executing code',
		doneLabel: 'Executed code',
		inputLabel: 'Code',
		outputLabel: 'Execution Result',
	},
	search_memories: {
		semantic: 'memory',
		iconKey: 'database',
		runningLabel: 'Searching memories',
		doneLabel: 'Searched memories',
		inputLabel: 'Memory Query',
		outputLabel: 'Memory Matches',
	},
	add_memory: {
		semantic: 'memory',
		iconKey: 'database',
		runningLabel: 'Saving memory',
		doneLabel: 'Saved memory',
		inputLabel: 'Memory to Save',
		outputLabel: 'Stored Memory',
	},
	replace_memory_content: {
		semantic: 'memory',
		iconKey: 'database',
		runningLabel: 'Updating memory',
		doneLabel: 'Updated memory',
		inputLabel: 'Memory Update',
		outputLabel: 'Memory Update Result',
	},
	delete_memory: {
		semantic: 'memory',
		iconKey: 'database',
		runningLabel: 'Deleting memory',
		doneLabel: 'Deleted memory',
		inputLabel: 'Memory Target',
		outputLabel: 'Delete Result',
	},
	list_memories: {
		semantic: 'memory',
		iconKey: 'database',
		runningLabel: 'Listing memories',
		doneLabel: 'Listed memories',
		inputLabel: 'List Filters',
		outputLabel: 'Memory List',
	},
	search_notes: {
		semantic: 'notes',
		iconKey: 'note',
		runningLabel: 'Searching notes',
		doneLabel: 'Searched notes',
		inputLabel: 'Note Query',
		outputLabel: 'Note Matches',
	},
	view_note: {
		semantic: 'notes',
		iconKey: 'note',
		runningLabel: 'Opening note',
		doneLabel: 'Opened note',
		inputLabel: 'Note Target',
		outputLabel: 'Note Content',
	},
	write_note: {
		semantic: 'notes',
		iconKey: 'note',
		runningLabel: 'Writing note',
		doneLabel: 'Wrote note',
		inputLabel: 'Note to Save',
		outputLabel: 'Saved Note',
	},
	replace_note_content: {
		semantic: 'notes',
		iconKey: 'note',
		runningLabel: 'Updating note',
		doneLabel: 'Updated note',
		inputLabel: 'Note Update',
		outputLabel: 'Note Update Result',
	},
	search_chats: {
		semantic: 'chats',
		iconKey: 'chat',
		runningLabel: 'Searching Chats',
		doneLabel: 'Searched Chats',
		inputLabel: 'Chat Query',
		outputLabel: 'Chat Matches',
	},
	view_chat: {
		semantic: 'chats',
		iconKey: 'chat',
		runningLabel: 'Opening Chat',
		doneLabel: 'Opened Chat',
		inputLabel: 'Chat Target',
		outputLabel: 'Chat Transcript',
	},
	search_channels: {
		semantic: 'channels',
		iconKey: 'channels',
		runningLabel: 'Searching Channels',
		doneLabel: 'Searched Channels',
		inputLabel: 'Channel Query',
		outputLabel: 'Channel Matches',
	},
	search_channel_messages: {
		semantic: 'channels',
		iconKey: 'channels',
		runningLabel: 'Searching Messages',
		doneLabel: 'Searched Messages',
		inputLabel: 'Message Query',
		outputLabel: 'Message Matches',
	},
	view_channel_message: {
		semantic: 'channels',
		iconKey: 'channels',
		runningLabel: 'Opening Message',
		doneLabel: 'Opened Message',
		inputLabel: 'Message Target',
		outputLabel: 'Message Detail',
	},
	view_channel_thread: {
		semantic: 'channels',
		iconKey: 'channels',
		runningLabel: 'Opening Thread',
		doneLabel: 'Opened Thread',
		inputLabel: 'Thread Target',
		outputLabel: 'Thread Detail',
	},
	list_knowledge_bases: {
		semantic: 'knowledge',
		iconKey: 'book',
		runningLabel: 'Listing Knowledge Bases',
		doneLabel: 'Listed Knowledge Bases',
		inputLabel: 'Knowledge Filter',
		outputLabel: 'Knowledge Bases',
	},
	search_knowledge_bases: {
		semantic: 'knowledge',
		iconKey: 'book',
		runningLabel: 'Searching Knowledge Bases',
		doneLabel: 'Searched Knowledge Bases',
		inputLabel: 'Knowledge Query',
		outputLabel: 'Knowledge Matches',
	},
	search_knowledge_files: {
		semantic: 'knowledge',
		iconKey: 'book',
		runningLabel: 'Searching Knowledge Files',
		doneLabel: 'Searched Knowledge Files',
		inputLabel: 'File Query',
		outputLabel: 'File Matches',
	},
	view_file: {
		semantic: 'knowledge',
		iconKey: 'document',
		runningLabel: 'Opening File',
		doneLabel: 'Opened File',
		inputLabel: 'File Target',
		outputLabel: 'File Content',
	},
	view_knowledge_file: {
		semantic: 'knowledge',
		iconKey: 'document',
		runningLabel: 'Opening Knowledge File',
		doneLabel: 'Opened Knowledge File',
		inputLabel: 'File Target',
		outputLabel: 'File Content',
	},
	list_knowledge: {
		semantic: 'knowledge',
		iconKey: 'book',
		runningLabel: 'Listing Knowledge',
		doneLabel: 'Listed Knowledge',
		inputLabel: 'Knowledge Filter',
		outputLabel: 'Knowledge List',
	},
	query_knowledge_files: {
		semantic: 'knowledge',
		iconKey: 'book',
		runningLabel: 'Querying Knowledge Files',
		doneLabel: 'Queried Knowledge Files',
		inputLabel: 'Knowledge Query',
		outputLabel: 'Knowledge Answer',
	},
	query_knowledge_bases: {
		semantic: 'knowledge',
		iconKey: 'book',
		runningLabel: 'Querying Knowledge Bases',
		doneLabel: 'Queried Knowledge Bases',
		inputLabel: 'Knowledge Query',
		outputLabel: 'Knowledge Answer',
	},
	view_skill: {
		semantic: 'skills',
		iconKey: 'sparkles',
		runningLabel: 'Loading Skill',
		doneLabel: 'Loaded Skill',
		inputLabel: 'Skill Target',
		outputLabel: 'Skill Content',
	}
};

function toTitleCaseWords(value: string): string {
	return value
		.replace(/[_.-]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ')
		.trim();
}

function inferFallback(rawName: string): Omit<ToolPresentation, 'rawName' | 'displayName'> {
	const normalized = rawName.toLowerCase();

	if (/search/.test(normalized) && /web|url|http|browse/.test(normalized)) {
		return {
			semantic: 'search_web',
			iconKey: 'globe',
			runningLabel: 'Searching the web',
			doneLabel: 'Searched the web',
			inputLabel: 'Search Query',
			outputLabel: 'Search Results',
		};
	}

	if (/fetch|url|http|crawl/.test(normalized)) {
		return {
			semantic: 'fetch_url',
			iconKey: 'link',
			runningLabel: 'Fetching Content',
			doneLabel: 'Fetched Content',
			inputLabel: 'URL',
			outputLabel: 'Content',
		};
	}

	if (/code|python|terminal|exec|command|script/.test(normalized)) {
		return {
			semantic: 'code',
			iconKey: 'terminal',
			runningLabel: 'Executing code',
			doneLabel: 'Executed code',
			inputLabel: 'Code',
			outputLabel: 'Execution Result',
		};
	}

	if (/memories|memory/.test(normalized)) {
		if (/search|find|query/.test(normalized)) {
			return {
				semantic: 'memory',
				iconKey: 'database',
				runningLabel: 'Searching memories',
				doneLabel: 'Searched memories',
				inputLabel: 'Memory Query',
				outputLabel: 'Memory Matches',
			};
		}

		if (/list/.test(normalized)) {
			return {
				semantic: 'memory',
				iconKey: 'database',
				runningLabel: 'Listing memories',
				doneLabel: 'Listed memories',
				inputLabel: 'List Filters',
				outputLabel: 'Memory List',
			};
		}

		if (/delete|remove/.test(normalized)) {
			return {
				semantic: 'memory',
				iconKey: 'database',
				runningLabel: 'Deleting memory',
				doneLabel: 'Deleted memory',
				inputLabel: 'Memory Target',
				outputLabel: 'Delete Result',
			};
		}

		if (/replace|update|edit/.test(normalized)) {
			return {
				semantic: 'memory',
				iconKey: 'database',
				runningLabel: 'Updating memory',
				doneLabel: 'Updated memory',
				inputLabel: 'Memory Update',
				outputLabel: 'Memory Update Result',
			};
		}

		return {
			semantic: 'memory',
			iconKey: 'database',
			runningLabel: 'Saving memory',
			doneLabel: 'Saved memory',
			inputLabel: 'Memory Content',
			outputLabel: 'Stored Memory',
		};
	}

	if (/notes|note/.test(normalized)) {
		if (/search|find|query/.test(normalized)) {
			return {
				semantic: 'notes',
				iconKey: 'note',
				runningLabel: 'Searching notes',
				doneLabel: 'Searched notes',
				inputLabel: 'Note Query',
				outputLabel: 'Note Matches',
			};
		}

		if (/view|read|open/.test(normalized)) {
			return {
				semantic: 'notes',
				iconKey: 'note',
				runningLabel: 'Opening note',
				doneLabel: 'Opened note',
				inputLabel: 'Note Target',
				outputLabel: 'Note Content',
			};
		}

		if (/replace|update|edit/.test(normalized)) {
			return {
				semantic: 'notes',
				iconKey: 'note',
				runningLabel: 'Updating note',
				doneLabel: 'Updated note',
				inputLabel: 'Note Update',
				outputLabel: 'Note Update Result',
			};
		}

		if (/delete|remove/.test(normalized)) {
			return {
				semantic: 'notes',
				iconKey: 'note',
				runningLabel: 'Deleting note',
				doneLabel: 'Deleted note',
				inputLabel: 'Note Target',
				outputLabel: 'Delete Result',
			};
		}

		return {
			semantic: 'notes',
			iconKey: 'note',
			runningLabel: 'Writing note',
			doneLabel: 'Wrote note',
			inputLabel: 'Note Draft',
			outputLabel: 'Saved Note',
		};
	}

	if (/knowledge|note|memory|chat|channel|file|document/.test(normalized)) {
		return {
			semantic: 'generic',
			iconKey: 'document',
			runningLabel: 'Running Tool',
			doneLabel: 'Completed Tool',
			inputLabel: 'Input',
			outputLabel: 'Output',
		};
	}

	return {
		semantic: 'generic',
		iconKey: 'sparkles',
		runningLabel: 'Running Tool',
		doneLabel: 'Completed Tool',
		inputLabel: 'Input',
		outputLabel: 'Output',
	};
}

export function getToolPresentation(name: string | undefined): ToolPresentation {
	const rawName = (name ?? 'tool').trim() || 'tool';
	const displayName = toTitleCaseWords(rawName);
	const fromMap = EXACT_TOOL_MAP[rawName];
	const inferred = fromMap ?? inferFallback(rawName);

	return {
		rawName,
		displayName,
		...inferred
	};
}

export type ToolCombination = {
	iconKey: ToolIconKey;
	prefix: string;
	showDetailList: boolean;
	matchedRuleId: string;
};

export type ToolCombinationMatch = {
	allOf?: string[];
	anyOf?: string[];
	noneOf?: string[];
	onlyOf?: string[];
};

export type ToolCombinationRule = {
	id: string;
	order: number;
	iconKey: ToolIconKey;
	pendingPrefix: string;
	donePrefix: string;
	match: ToolCombinationMatch;
	showDetailList?: boolean;
};

// Rules are evaluated by ascending order. Lower order wins.
export const TOOL_COMBINATION_RULES: ToolCombinationRule[] = [
	{
		id: 'web.search_and_fetch',
		order: 100,
		iconKey: 'globe',
		pendingPrefix: 'Searching the Web',
		donePrefix: 'Searched the Web',
		match: { allOf: ['search_web', 'fetch_url'] }
	},
	{
		id: 'web.search_and_execute_code',
		order: 150,
		iconKey: 'terminal',
		pendingPrefix: 'Researching and Executing',
		donePrefix: 'Researched and Executed',
		match: {
			allOf: ['search_web', 'execute_code'],
			noneOf: ['view_note'],
			onlyOf: ['search_web', 'fetch_url', 'execute_code']
		}
	},
	{
		id: 'knowledge.research',
		order: 200,
		iconKey: 'book',
		pendingPrefix: 'Researching Knowledge',
		donePrefix: 'Researched Knowledge',
		match: {
			anyOf: ['search_knowledge_bases', 'search_knowledge_files'],
			allOf: ['query_knowledge_bases']
		}
	},
	{
		id: 'knowledge.search_and_view',
		order: 210,
		iconKey: 'book',
		pendingPrefix: 'Researching Knowledge',
		donePrefix: 'Researched Knowledge',
		match: {
			anyOf: ['search_knowledge_bases', 'search_knowledge_files'],
			allOf: ['view_file']
		}
	},
	{
		id: 'knowledge.search_and_view_knowledge_file',
		order: 220,
		iconKey: 'book',
		pendingPrefix: 'Researching Knowledge',
		donePrefix: 'Researched Knowledge',
		match: {
			anyOf: ['search_knowledge_bases', 'search_knowledge_files'],
			allOf: ['view_knowledge_file']
		}
	},
	{
		id: 'notes.review',
		order: 300,
		iconKey: 'note',
		pendingPrefix: 'Reviewing Notes',
		donePrefix: 'Reviewed Notes',
		match: {
			allOf: ['search_notes'],
			anyOf: ['view_note', 'write_note', 'replace_note_content']
		}
	},
	{
		id: 'chats.review',
		order: 400,
		iconKey: 'chat',
		pendingPrefix: 'Reviewing Chats',
		donePrefix: 'Reviewed Chats',
		match: { allOf: ['search_chats', 'view_chat'] }
	},
	{
		id: 'channels.explore',
		order: 500,
		iconKey: 'channels',
		pendingPrefix: 'Exploring Channels',
		donePrefix: 'Explored Channels',
		match: {
			allOf: ['search_channels'],
			anyOf: ['search_channel_messages', 'view_channel_message', 'view_channel_thread']
		}
	},
	{
		id: 'images.create_or_edit',
		order: 600,
		iconKey: 'photo',
		pendingPrefix: 'Creating Images',
		donePrefix: 'Created Images',
		match: { anyOf: ['generate_image', 'edit_image'] }
	},
	{
		id: 'code.execute',
		order: 700,
		iconKey: 'terminal',
		pendingPrefix: 'Executing Code',
		donePrefix: 'Executed Code',
		match: { onlyOf: ['execute_code'] }
	},
	{
		id: 'memory.manage',
		order: 800,
		iconKey: 'database',
		pendingPrefix: 'Managing Memory',
		donePrefix: 'Managed Memory',
		match: {
			onlyOf: [
				'search_memories',
				'list_memories',
				'add_memory',
				'replace_memory_content',
				'delete_memory'
			]
		}
	},
	{
		id: 'notes.manage',
		order: 900,
		iconKey: 'note',
		pendingPrefix: 'Managing Notes',
		donePrefix: 'Managed Notes',
		match: {
			onlyOf: ['search_notes', 'view_note', 'write_note', 'replace_note_content']
		}
	},
	{
		id: 'remember_and_write_note',
		order: 1000,
		iconKey: 'note',
		pendingPrefix: 'Remembering and Writing Note',
		donePrefix: 'Remembered and Wrote Note',
		match: {
			onlyOf: ['add_memory', 'write_note']
		}
	}
];

function normalizeToolName(name: string): string {
	return name.trim().toLowerCase();
}

function hasAll(set: Set<string>, items: string[]): boolean {
	return items.every((item) => set.has(normalizeToolName(item)));
}

function hasAny(set: Set<string>, items: string[]): boolean {
	return items.some((item) => set.has(normalizeToolName(item)));
}

function hasNone(set: Set<string>, items: string[]): boolean {
	return items.every((item) => !set.has(normalizeToolName(item)));
}

function hasOnly(set: Set<string>, items: string[]): boolean {
	if (items.length === 0) {
		return set.size === 0;
	}

	const allowed = new Set(items.map((item) => normalizeToolName(item)));
	for (const value of set) {
		if (!allowed.has(value)) {
			return false;
		}
	}

	return true;
}

function matchesCombinationRule(rule: ToolCombinationRule, set: Set<string>): boolean {
	const { allOf, anyOf, noneOf, onlyOf } = rule.match;

	if (allOf && allOf.length > 0 && !hasAll(set, allOf)) {
		return false;
	}

	if (anyOf && anyOf.length > 0 && !hasAny(set, anyOf)) {
		return false;
	}

	if (noneOf && noneOf.length > 0 && !hasNone(set, noneOf)) {
		return false;
	}

	if (onlyOf && !hasOnly(set, onlyOf)) {
		return false;
	}

	return true;
}

export function getToolCombinationSummary(names: string[], pending: boolean): ToolCombination | null {
	const set = new Set(names.map((name) => normalizeToolName(name)));
	const orderedRules = [...TOOL_COMBINATION_RULES].sort((a, b) => a.order - b.order);

	for (const rule of orderedRules) {
		if (!matchesCombinationRule(rule, set)) {
			continue;
		}

		return {
			iconKey: rule.iconKey,
			prefix: pending ? rule.pendingPrefix : rule.donePrefix,
			showDetailList: rule.showDetailList ?? false,
			matchedRuleId: rule.id
		};
	}

	return null;
}
