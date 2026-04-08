<script lang="ts">
	import { decode } from 'html-entities';

	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	const i18n = getContext<Readable<{ t: (key: string, params?: Record<string, unknown>) => string }>>('i18n');
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import ChevronUp from '../icons/ChevronUp.svelte';
	import ChevronDown from '../icons/ChevronDown.svelte';
	import Spinner from './Spinner.svelte';
	import Markdown from '../chat/Messages/Markdown.svelte';
	import WrenchSolid from '../icons/WrenchSolid.svelte';
	import GlobeAlt from '../icons/GlobeAlt.svelte';
	import Link from '../icons/Link.svelte';
	import Photo from '../icons/Photo.svelte';
	import Terminal from '../icons/Terminal.svelte';
	import Database from '../icons/Database.svelte';
	import Note from '../icons/Note.svelte';
	import ChatBubble from '../icons/ChatBubble.svelte';
	import ChatBubbles from '../icons/ChatBubbles.svelte';
	import BookOpen from '../icons/BookOpen.svelte';
	import ClockRotateRight from '../icons/ClockRotateRight.svelte';
	import Document from '../icons/Document.svelte';
	import Sparkles from '../icons/Sparkles.svelte';
	import Image from './Image.svelte';
	import FullHeightIframe from './FullHeightIframe.svelte';
	import { settings } from '$lib/stores';
	import {
		INLINE_TOOL_CHEVRON_CLASS,
		INLINE_TOOL_ICON_CENTER_OFFSET_CLASS,
		INLINE_TOOL_ROW_CLASS,
		INLINE_TOOL_TITLE_CLASS,
		INLINE_TOOL_TRIGGER_CLASS
	} from '$lib/utils/toolCallInlineStyles';
	import {
		getToolPresentation,
		type ToolIconKey
	} from '$lib/utils/toolCallPresentation';

	export let id: string = '';
	export let attributes: {
		type?: string;
		id?: string;
		name?: string;
		arguments?: string;
		result?: string;
		files?: string;
		embeds?: string;
		done?: string;
	} = {};

	export let open = false;
	export let grouped = false;
	export let className = '';

	const RESULT_PREVIEW_LIMIT = 10000;
	const PRIMARY_MEMORY_KEYS = ['content', 'memory', 'value', 'text', 'entry'];
	const PRIMARY_NOTES_KEYS = ['content', 'note', 'text', 'body'];
	const PRIMARY_CODE_KEYS = ['code', 'script', 'command', 'python', 'source'];
	const FAILURE_TEXT_PATTERN = /error|failed|exception|traceback/i;
	const FAILURE_STATUS_PATTERN = /error|fail|failed|exception/;
	const SEARCH_NO_MATCH_PATTERN = /no matches? found|no results?|empty/i;
	const SEARCH_RESULT_COLLECTION_KEYS = ['results', 'items', 'matches', 'files', 'documents', 'data'];
	const KNOWLEDGE_COLLECTION_KEYS = [
		'items',
		'results',
		'files',
		'bases',
		'knowledge_bases',
		'knowledge_files',
		'documents',
		'data'
	];
	const MEMORY_COLLECTION_KEYS = ['memories', 'items', 'entries', 'results', 'data'];
	const CODE_OUTPUT_MAPPING: Array<[string, string, CodeOutputBlock['tone']]> = [
		['stdout', 'Stdout', 'success'],
		['output', 'Output', 'neutral'],
		['result', 'Result', 'neutral'],
		['stderr', 'Stderr', 'error'],
		['error', 'Error', 'error'],
		['traceback', 'Traceback', 'error']
	];

	let expandedResult = false;
	type ArgRow = { key: string; value: string };
	let argRows: ArgRow[] = [];
	let searchWebResults: SearchResultItem[] = [];

	$: if (!open) expandedResult = false;
	export let buttonClassName = 'w-full transition';

	const componentId = id || crypto.randomUUID();

	function parseJSONString(str: string): unknown {
		let parsed: unknown = str;

		for (let idx = 0; idx < 2; idx += 1) {
			if (typeof parsed !== 'string') {
				break;
			}

			try {
				parsed = JSON.parse(parsed);
			} catch {
				break;
			}
		}

		return parsed;
	}

	function formatJSONString(str: string) {
		try {
			const parsed = parseJSONString(str);
			if (typeof parsed === 'object') {
				return JSON.stringify(parsed, null, 2);
			} else {
				return String(parsed);
			}
		} catch {
			return str;
		}
	}

	function parseArguments(str: string): Record<string, unknown> | null {
		try {
			const parsed = parseJSONString(str);
			if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
			return null;
		} catch {
			return null;
		}
	}

	type SearchResultItem = {
		title?: string;
		link?: string;
		snippet?: string;
		name?: string;
		url?: string;
		source?: string;
		description?: string;
		content?: string;
	};

	type CodeOutputBlock = {
		label: string;
		value: string;
		tone: 'neutral' | 'error' | 'success';
	};
	type FailureInfo = {
		title: string;
		message: string;
		details?: string;
	};

	type KnowledgeItem = {
		title: string;
		subtitle?: string;
		content?: string;
	};

	type TimestampDiagram = {
		currentLabel: string;
		targetLabel: string;
		relativeLabel: string;
		isFuture: boolean;
	};

	type CurrentTimestampDisplay = {
		dateLabel: string;
		timeLabel: string;
	};

	function getToolIcon(iconKey: ToolIconKey): typeof GlobeAlt {
		const iconMap: Record<ToolIconKey, typeof GlobeAlt> = {
			globe: GlobeAlt,
			link: Link,
			photo: Photo,
			terminal: Terminal,
			database: Database,
			note: Note,
			chat: ChatBubble,
			channels: ChatBubbles,
			book: BookOpen,
			clock: ClockRotateRight,
			sparkles: Sparkles,
			document: Document
		};

		return iconMap[iconKey] ?? Sparkles;
	}

	function isSearchWebResult(value: unknown): value is SearchResultItem[] {
		return (
			Array.isArray(value) &&
			value.every(
				(item) =>
					typeof item === 'object' &&
					item !== null &&
					('title' in item ||
						'link' in item ||
						'snippet' in item ||
						'name' in item ||
						'url' in item ||
						'content' in item)
			)
		);
	}

	function extractSearchResults(value: unknown): SearchResultItem[] {
		if (isSearchWebResult(value)) {
			return value;
		}

		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return [];
		}

		const record = value as Record<string, unknown>;
		for (const key of SEARCH_RESULT_COLLECTION_KEYS) {
			const candidate = record[key];
			if (isSearchWebResult(candidate)) {
				return candidate;
			}
		}

		return [];
	}

	function getSearchResultTitle(item: unknown): string {
		if (item && typeof item === 'object' && 'title' in item) {
			return String((item as { title: unknown }).title ?? '');
		}

		if (item && typeof item === 'object' && 'name' in item) {
			return String((item as { name: unknown }).name ?? '');
		}

		if (item && typeof item === 'object' && 'source' in item) {
			return String((item as { source: unknown }).source ?? '');
		}

		return '';
	}

	function getSearchResultLink(item: unknown): string {
		if (item && typeof item === 'object' && 'link' in item) {
			return String((item as { link: unknown }).link ?? '');
		}

		if (item && typeof item === 'object' && 'url' in item) {
			return String((item as { url: unknown }).url ?? '');
		}

		return '';
	}

	function getSearchResultSnippet(item: unknown): string {
		if (item && typeof item === 'object' && 'snippet' in item) {
			return String((item as { snippet: unknown }).snippet ?? '');
		}

		if (item && typeof item === 'object' && 'description' in item) {
			return String((item as { description: unknown }).description ?? '');
		}

		if (item && typeof item === 'object' && 'content' in item) {
			return String((item as { content: unknown }).content ?? '');
		}

		return '';
	}

	function getSearchFallbackLine(item: unknown): string {
		if (typeof item === 'string') {
			return item.trim();
		}

		const record = asRecord(item);
		if (!record) {
			return toDisplayText(item).trim();
		}

		for (const key of ['path', 'file', 'filename', 'title', 'name', 'source', 'url', 'id']) {
			const text = toDisplayText(record[key]).trim();
			if (text) {
				return text;
			}
		}

		for (const key of ['snippet', 'description', 'content', 'text', 'message']) {
			const text = toDisplayText(record[key]).trim();
			if (text) {
				return text;
			}
		}

		return '';
	}

	function getSearchFallbackLines(value: unknown): string[] {
		if (!isSearchTool) {
			return [];
		}

		if (value === null || value === undefined) {
			return [];
		}

		if (typeof value === 'string') {
			const text = value.trim();
			return text ? [text] : [];
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				return ['No matches found.'];
			}

			const lines = value
				.map((entry) => getSearchFallbackLine(entry))
				.filter((line) => line.length > 0);

			return lines.length > 0 ? lines : ['No matches found.'];
		}

		const record = asRecord(value);
		if (!record) {
			return [];
		}

		for (const key of [...SEARCH_RESULT_COLLECTION_KEYS, 'json']) {
			const candidate = record[key];
			if (Array.isArray(candidate)) {
				if (candidate.length === 0) {
					return ['No matches found.'];
				}

				const lines = candidate
					.map((entry) => getSearchFallbackLine(entry))
					.filter((line) => line.length > 0);

				return lines.length > 0 ? lines : ['No matches found.'];
			}
		}

		const totalText = toDisplayText(record.total ?? record.count).trim();
		if (totalText === '0') {
			return ['No matches found.'];
		}

		for (const key of ['message', 'result', 'content', 'text']) {
			const text = toDisplayText(record[key]).trim();
			if (text) {
				return [text];
			}
		}

		return [];
	}

	function isImageFileObject(file: unknown): file is { type?: string; content_type?: string; url?: string } {
		if (!file || typeof file !== 'object') {
			return false;
		}

		const typedFile = file as { type?: string; content_type?: string; url?: string };
		return (
			(typedFile.type === 'image' || (typedFile.content_type ?? '').startsWith('image/')) &&
			Boolean(typedFile.url)
		);
	}

	function getArgRowKey(row: unknown): string {
		if (row && typeof row === 'object' && 'key' in row) {
			return String((row as { key: unknown }).key);
		}
		return '';
	}

	function getArgRowValue(row: unknown): string {
		if (row && typeof row === 'object' && 'value' in row) {
			return String((row as { value: unknown }).value);
		}
		return '';
	}

	$: args = decode(attributes?.arguments ?? '');
	$: result = decode(attributes?.result ?? '');
	$: files = parseJSONString(decode(attributes?.files ?? ''));
	$: embeds = parseJSONString(decode(attributes?.embeds ?? ''));
	$: isDone = attributes?.done === 'true';
	$: isExecuting = attributes?.done && attributes?.done !== 'true';

	$: parsedArgs = parseArguments(args);
	$: parsedResult = parseJSONString(result);
	$: hasFileOutput = Array.isArray(files) && files.length > 0;
	$: hasResultOutput = result.trim().length > 0 || hasFileOutput;
	$: toolPresentation = getToolPresentation(attributes?.name);
	$: toolName = toolPresentation.displayName;
	$: toolIcon = getToolIcon(toolPresentation.iconKey);
	$: isSearchTool =
		toolPresentation.rawName.startsWith('search_') ||
		toolPresentation.rawName.startsWith('query_');
	$: isMemoryTool = toolPresentation.semantic === 'memory';
	$: isNotesTool = toolPresentation.semantic === 'notes';
	$: isCodeTool = toolPresentation.semantic === 'code';
	$: isKnowledgeTool = toolPresentation.semantic === 'knowledge';
	$: isCurrentTimestampTool = toolPresentation.rawName === 'get_current_timestamp';
	$: isCalculateTimestampTool = toolPresentation.rawName === 'calculate_timestamp';
	$: isKnowledgeQueryTool = ['query_knowledge_files', 'query_knowledge_bases'].includes(
		toolPresentation.rawName
	);
	$: isKnowledgeViewTool = ['view_file', 'view_knowledge_file'].includes(toolPresentation.rawName);
	$: detailBlockClass = isSearchTool
		? 'bg-emerald-50/65 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/40'
		: isMemoryTool
			? 'bg-sky-50/65 dark:bg-sky-950/20 border border-sky-100/80 dark:border-sky-900/40'
			: isNotesTool
				? 'bg-amber-50/65 dark:bg-amber-950/20 border border-amber-100/80 dark:border-amber-900/40'
				: isCodeTool
					? 'bg-slate-50/80 dark:bg-slate-950/25 border border-slate-200/80 dark:border-slate-800/80'
					: isKnowledgeTool
						? 'bg-cyan-50/65 dark:bg-cyan-950/20 border border-cyan-100/80 dark:border-cyan-900/40'
					: 'bg-gray-50/70 dark:bg-gray-850/35';
	$: searchWebResults = extractSearchResults(parsedResult);
	$: searchFallbackLines = getSearchFallbackLines(parsedResult);
	$: hasSearchOutput = searchWebResults.length > 0 || searchFallbackLines.length > 0;
	$: isSearchNoMatch =
		isSearchTool &&
		searchWebResults.length === 0 &&
		searchFallbackLines.length > 0 &&
		searchFallbackLines.every((line) => SEARCH_NO_MATCH_PATTERN.test(line));
	$: argRows = parsedArgs
		? Object.entries(parsedArgs).map(([key, value]) => ({
				key,
				value: typeof value === 'object' ? JSON.stringify(value) : String(value)
			}))
		: [];
	$: inputCountLabel = `${argRows.length} input field${argRows.length === 1 ? '' : 's'}`;
	$: resultLength = typeof parsedResult === 'string' ? parsedResult.length : result.length;
	$: memoryItems = getMemoryItems(parsedResult);
	$: codeOutputBlocks = getCodeOutputBlocks(parsedResult);
	$: notePreview = getNotePreview(parsedResult);
	$: noteInputPreview = getNoteInputPreview(parsedArgs);
	$: codeInputSnippet = getCodeInputSnippet(parsedArgs);
	$: currentTimestampDisplay = getCurrentTimestampDisplay(parsedResult);
	$: calculateTimestampDiagram = getCalculateTimestampDiagram(parsedResult, parsedArgs);
	$: knowledgeItems = getKnowledgeItems(parsedResult);
	$: knowledgeAnswer = getKnowledgeAnswer(parsedResult);
	$: knowledgeDocument = getKnowledgeDocument(parsedResult);
	$: failureInfo = getFailureInfo(parsedResult);
	$: isFailed = failureInfo !== null;
	$: doneIconClass = isFailed
		? 'text-rose-500 dark:text-rose-400'
		: !hasResultOutput || isSearchNoMatch
		? 'text-gray-400 dark:text-gray-500'
		: 'text-emerald-500 dark:text-emerald-400';
	$: useCompactResult = shouldUseCompactResult(parsedResult);
	$: showResultCount = !(
		failureInfo !== null ||
		useCompactResult ||
		(isMemoryTool && memoryItems.length > 0) ||
		(isSearchTool && hasSearchOutput) ||
		(isCodeTool && codeOutputBlocks.length > 0) ||
		(isNotesTool && notePreview !== null) ||
		(isCurrentTimestampTool && currentTimestampDisplay !== null) ||
		(isCalculateTimestampTool && calculateTimestampDiagram !== null) ||
		(isKnowledgeTool &&
			(knowledgeItems.length > 0 || knowledgeAnswer !== null || knowledgeDocument !== null))
	);

	function toDate(value: unknown): Date | null {
		if (value instanceof Date && !Number.isNaN(value.getTime())) {
			return value;
		}

		if (typeof value === 'number' && Number.isFinite(value)) {
			const timestamp = value > 1_000_000_000_000 ? value : value * 1000;
			const date = new Date(timestamp);
			return Number.isNaN(date.getTime()) ? null : date;
		}

		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (!trimmed) {
				return null;
			}

			if (/^\d{10,13}$/.test(trimmed)) {
				const numeric = Number(trimmed);
				if (Number.isFinite(numeric)) {
					const timestamp = trimmed.length >= 13 ? numeric : numeric * 1000;
					const date = new Date(timestamp);
					if (!Number.isNaN(date.getTime())) {
						return date;
					}
				}
			}

			const parsed = new Date(trimmed);
			return Number.isNaN(parsed.getTime()) ? null : parsed;
		}

		return null;
	}

	function extractTimestampDate(value: unknown): Date | null {
		const direct = toDate(value);
		if (direct) {
			return direct;
		}

		const record = asRecord(value);
		if (!record) {
			return null;
		}

		for (const key of [
			'timestamp',
			'datetime',
			'date',
			'time',
			'current_timestamp',
			'current_iso',
			'calculated_timestamp',
			'calculated_iso',
			'current_time',
			'calculated_time',
			'result',
			'value'
		]) {
			const parsed = toDate(record[key]);
			if (parsed) {
				return parsed;
			}
		}

		return null;
	}

	function formatDateParts(value: Date): CurrentTimestampDisplay {
		return {
			dateLabel: value.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: '2-digit'
			}),
			timeLabel: value.toLocaleTimeString(undefined, {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			})
		};
	}

	function getCurrentTimestampDisplay(value: unknown): CurrentTimestampDisplay | null {
		if (!isCurrentTimestampTool) {
			return null;
		}

		const parsedDate = extractTimestampDate(value);
		if (parsedDate) {
			return formatDateParts(parsedDate);
		}

		if (typeof value === 'string' && value.trim()) {
			const fromString = toDate(value);
			return fromString ? formatDateParts(fromString) : null;
		}

		const record = asRecord(value);
		if (!record) {
			return null;
		}

		for (const key of [
			'current_iso',
			'current_timestamp',
			'time',
			'datetime',
			'timestamp',
			'result',
			'message'
		]) {
			const text = toDisplayText(record[key]).trim();
			if (text) {
				const fromRecord = toDate(text);
				if (fromRecord) {
					return formatDateParts(fromRecord);
				}
			}
		}

		return null;
	}

	function getRelativeDiffLabel(target: Date, current: Date): string {
		const diffMs = target.getTime() - current.getTime();
		const absMs = Math.abs(diffMs);

		if (absMs < 1_000) {
			return 'Now';
		}

		const units: Array<[string, number]> = [
			['year', 365 * 24 * 60 * 60 * 1000],
			['month', 30 * 24 * 60 * 60 * 1000],
			['week', 7 * 24 * 60 * 60 * 1000],
			['day', 24 * 60 * 60 * 1000],
			['hour', 60 * 60 * 1000],
			['minute', 60 * 1000],
			['second', 1000]
		];

		for (const [unit, ms] of units) {
			if (absMs >= ms) {
				const count = Math.round(absMs / ms);
				const label = `${count} ${unit}${count === 1 ? '' : 's'}`;
				return diffMs >= 0 ? `In ${label}` : `${label} ago`;
			}
		}

		return 'Now';
	}

	function getRelativeLabelFromArgs(
		target: Date,
		current: Date,
		argsValue: Record<string, unknown> | null
	): string {
		if (!argsValue) {
			return getRelativeDiffLabel(target, current);
		}

		for (const [key, raw] of Object.entries(argsValue)) {
			if (!key.endsWith('_ago') && !key.endsWith('_from_now')) {
				continue;
			}

			const amount = Number(raw);
			if (!Number.isFinite(amount)) {
				continue;
			}

			const baseUnit = key
				.replace(/_(ago|from_now)$/i, '')
				.replace(/_/g, ' ')
				.replace(/s$/, '');
			const absAmount = Math.abs(amount);
			const unit = `${baseUnit}${absAmount === 1 ? '' : 's'}`;
			const label = `${absAmount} ${unit}`;

			if (key.endsWith('_from_now')) {
				return `In ${label}`;
			}

			return `${label} ago`;
		}

		for (const key of ['relative', 'offset', 'duration', 'label', 'expression', 'query']) {
			const text = toDisplayText(argsValue[key]).trim();
			if (text) {
				return text;
			}
		}

		const amountRaw = argsValue.amount ?? argsValue.value;
		const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
		const unitRaw = toDisplayText(argsValue.unit ?? argsValue.interval).trim().toLowerCase();
		const direction = toDisplayText(argsValue.direction ?? argsValue.when).trim().toLowerCase();

		if (Number.isFinite(amount) && unitRaw) {
			const absAmount = Math.abs(amount);
			const normalizedUnit = unitRaw.endsWith('s') ? unitRaw : `${unitRaw}s`;
			const label = `${absAmount} ${normalizedUnit}`;

			if (direction.includes('future') || direction.includes('after') || direction.includes('from')) {
				return `In ${label}`;
			}

			if (direction.includes('past') || direction.includes('ago') || direction.includes('before')) {
				return `${label} ago`;
			}

			return target.getTime() >= current.getTime() ? `In ${label}` : `${label} ago`;
		}

		return getRelativeDiffLabel(target, current);
	}

	function getCalculateTimestampDiagram(
		value: unknown,
		argsValue: Record<string, unknown> | null
	): TimestampDiagram | null {
		if (!isCalculateTimestampTool) {
			return null;
		}

		const record = asRecord(value);
		const targetDate = record
			? extractTimestampDate(record.calculated_iso ?? record.calculated_timestamp ?? value)
			: extractTimestampDate(value);
		if (!targetDate) {
			return null;
		}

		const currentDate = record
			? extractTimestampDate(record.current_iso ?? record.current_timestamp ?? record.current_time) ||
				new Date()
			: new Date();
		return {
			currentLabel: currentDate.toLocaleString(),
			targetLabel: targetDate.toLocaleString(),
			relativeLabel: getRelativeLabelFromArgs(targetDate, currentDate, argsValue),
			isFuture: targetDate.getTime() > currentDate.getTime()
		};
	}

	function isPrimaryPayloadArg(key: string): boolean {
		const normalized = key.toLowerCase();

		if (isMemoryTool) {
			return PRIMARY_MEMORY_KEYS.includes(normalized);
		}

		if (isNotesTool) {
			return PRIMARY_NOTES_KEYS.includes(normalized);
		}

		if (isCodeTool) {
			return PRIMARY_CODE_KEYS.includes(normalized);
		}

		return false;
	}

	function isScalarValue(value: unknown): boolean {
		return ['string', 'number', 'boolean'].includes(typeof value) || value === null;
	}

	function shouldUseCompactResult(value: unknown): boolean {
		if (!(isMemoryTool || isNotesTool || isCodeTool)) {
			return false;
		}

		if (typeof value === 'string') {
			return value.trim().length > 0 && value.length <= 120;
		}

		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return false;
		}

		const record = value as Record<string, unknown>;
		const keys = Object.keys(record);
		if (keys.length === 0 || keys.length > 6) {
			return false;
		}

		const allowedKeys = new Set([
			'success',
			'ok',
			'status',
			'result',
			'message',
			'id',
			'memory_id',
			'note_id'
		]);

		const knownShape = keys.every((key) => allowedKeys.has(key.toLowerCase()));
		if (!knownShape) {
			return false;
		}

		return Object.values(record).every((entry) => {
			if (!isScalarValue(entry)) {
				return false;
			}

			return typeof entry === 'string' ? entry.length <= 140 : true;
		});
	}

	function getCompactResultText(value: unknown): string {
		if (typeof value === 'string') {
			return value.trim() || 'Success';
		}

		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return 'Success';
		}

		const record = value as Record<string, unknown>;
		if (typeof record.success === 'boolean') {
			return record.success ? 'Success' : 'Failed';
		}

		if (typeof record.ok === 'boolean') {
			return record.ok ? 'Success' : 'Failed';
		}

		for (const key of ['status', 'result', 'message']) {
			const raw = record[key];
			if (typeof raw === 'string' && raw.trim()) {
				const normalized = raw.trim();
				return normalized.charAt(0).toUpperCase() + normalized.slice(1);
			}
		}

		return 'Success';
	}

	function asRecord(value: unknown): Record<string, unknown> | null {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return null;
		}

		return value as Record<string, unknown>;
	}

	function toDisplayText(value: unknown): string {
		if (typeof value === 'string') {
			return value;
		}

		if (['number', 'boolean'].includes(typeof value)) {
			return String(value);
		}

		if (value === null || value === undefined) {
			return '';
		}

		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	function getMemoryItems(value: unknown): unknown[] {
		if (!isMemoryTool) {
			return [];
		}

		if (Array.isArray(value)) {
			return value;
		}

		const record = asRecord(value);
		if (!record) {
			return [];
		}

		for (const key of MEMORY_COLLECTION_KEYS) {
			const candidate = record[key];
			if (Array.isArray(candidate)) {
				return candidate;
			}
		}

		return [];
	}

	function getMemoryItemTitle(item: unknown, index: number): string {
		if (typeof item === 'string') {
			return `Memory ${index + 1}`;
		}

		const record = asRecord(item);
		if (!record) {
			return `Memory ${index + 1}`;
		}

		for (const key of ['title', 'name', 'id', 'memory_id']) {
			const value = record[key];
			if (typeof value === 'string' && value.trim()) {
				return value;
			}
		}

		return `Memory ${index + 1}`;
	}

	function getMemoryItemBody(item: unknown): string {
		if (typeof item === 'string') {
			return item;
		}

		const record = asRecord(item);
		if (!record) {
			return toDisplayText(item);
		}

		for (const key of ['content', 'text', 'memory', 'value', 'summary', 'message']) {
			const value = record[key];
			if (typeof value === 'string' && value.trim()) {
				return value;
			}
		}

		return toDisplayText(item);
	}

	function getCodeOutputBlocks(value: unknown): CodeOutputBlock[] {
		if (!isCodeTool) {
			return [];
		}

		const blocks: CodeOutputBlock[] = [];

		if (typeof value === 'string') {
			if (value.trim()) {
				blocks.push({ label: 'Output', value, tone: 'neutral' });
			}
			return blocks;
		}

		const record = asRecord(value);
		if (!record) {
			return blocks;
		}

		for (const [key, label, tone] of CODE_OUTPUT_MAPPING) {
			const raw = record[key];
			const text = toDisplayText(raw).trim();
			if (text) {
				blocks.push({ label, value: text, tone });
			}
		}

		return blocks;
	}

	function getNotePreview(value: unknown): { title: string; content: string } | null {
		if (!isNotesTool) {
			return null;
		}

		if (typeof value === 'string' && value.trim()) {
			return {
				title: 'Note',
				content: value
			};
		}

		const record = asRecord(value);
		if (!record) {
			return null;
		}

		const title = toDisplayText(record.title || record.name || 'Note').trim() || 'Note';
		const content = toDisplayText(
			record.content || record.text || record.note || record.body || record.message
		).trim();

		if (!content) {
			return null;
		}

		return { title, content };
	}

	function getKnowledgeItems(value: unknown): KnowledgeItem[] {
		if (!isKnowledgeTool) {
			return [];
		}

		const toItem = (entry: unknown, index: number): KnowledgeItem => {
			if (typeof entry === 'string') {
				return {
					title: `Knowledge ${index + 1}`,
					content: entry
				};
			}

			const record = asRecord(entry);
			if (!record) {
				return {
					title: `Knowledge ${index + 1}`,
					content: toDisplayText(entry)
				};
			}

			const title =
				toDisplayText(record.name || record.title || record.file_name || record.basename || record.id)
					.trim() || `Knowledge ${index + 1}`;

			const subtitle = toDisplayText(record.type || record.kind || record.collection || '').trim();
			const content = toDisplayText(
				record.description || record.summary || record.content || record.snippet || record.text || ''
			).trim();

			return {
				title,
				subtitle: subtitle || undefined,
				content: content || undefined
			};
		};

		if (Array.isArray(value)) {
			return value.map((entry, index) => toItem(entry, index));
		}

		const record = asRecord(value);
		if (!record) {
			return [];
		}

		for (const key of KNOWLEDGE_COLLECTION_KEYS) {
			const candidate = record[key];
			if (Array.isArray(candidate)) {
				return candidate.map((entry, index) => toItem(entry, index));
			}
		}

		return [];
	}

	function getKnowledgeAnswer(value: unknown): string | null {
		if (!isKnowledgeTool || !isKnowledgeQueryTool) {
			return null;
		}

		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}

		const record = asRecord(value);
		if (!record) {
			return null;
		}

		for (const key of ['answer', 'response', 'result', 'content', 'text', 'message']) {
			const text = toDisplayText(record[key]).trim();
			if (text) {
				return text;
			}
		}

		return null;
	}

	function getKnowledgeDocument(value: unknown): string | null {
		if (!isKnowledgeTool || !isKnowledgeViewTool) {
			return null;
		}

		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}

		const record = asRecord(value);
		if (!record) {
			return null;
		}

		for (const key of ['content', 'text', 'body', 'result', 'data']) {
			const text = toDisplayText(record[key]).trim();
			if (text) {
				return text;
			}
		}

		return null;
	}
	function getNoteInputPreview(
		value: Record<string, unknown> | null
	): { title: string; content: string } | null {
		if (!isNotesTool || !value) {
			return null;
		}

		const title = toDisplayText(value.title || value.name || 'Note').trim() || 'Note';
		const content = toDisplayText(
			value.content || value.text || value.note || value.body || value.value || ''
		).trim();

		if (!content) {
			return null;
		}

		return { title, content };
	}

	function getCodeInputSnippet(value: Record<string, unknown> | null): string | null {
		if (!isCodeTool || !value) {
			return null;
		}

		for (const key of PRIMARY_CODE_KEYS) {
			const snippet = toDisplayText(value[key]).trim();
			if (snippet) {
				return snippet;
			}
		}

		return null;
	}

	function getFailureInfo(value: unknown): FailureInfo | null {
		if (value === null || value === undefined) {
			return null;
		}

		if (typeof value === 'string') {
			const text = value.trim();
			if (!text) {
				return null;
			}

			if (FAILURE_TEXT_PATTERN.test(text)) {
				return {
					title: 'Tool Failed',
					message: text
				};
			}

			return null;
		}

		const record = asRecord(value);
		if (!record) {
			return null;
		}

		const success = record.success;
		const ok = record.ok;
		const status = toDisplayText(record.status).toLowerCase();
		const hasFailureStatus = FAILURE_STATUS_PATTERN.test(status);

		const rawError = record.error;
		const hasExplicitErrorField =
			rawError !== undefined && rawError !== null && toDisplayText(rawError).trim().length > 0;
		const errorText =
			typeof rawError === 'string'
				? rawError
				: rawError && typeof rawError === 'object' && 'message' in rawError
					? toDisplayText((rawError as Record<string, unknown>).message)
					: '';

		const message =
			errorText ||
			toDisplayText(record.message) ||
			toDisplayText(record.result) ||
			toDisplayText(record.detail);

		const details =
			toDisplayText(record.stderr) ||
			toDisplayText(record.traceback) ||
			toDisplayText(record.stack) ||
			'';

		if (success === false || ok === false || hasFailureStatus || hasExplicitErrorField || message) {
			if (
				success === false ||
				ok === false ||
				hasExplicitErrorField ||
				hasFailureStatus ||
				FAILURE_TEXT_PATTERN.test(message)
			) {
				return {
					title: 'Tool Failed',
					message: message || 'The tool reported a failure.',
					details: details || undefined
				};
			}
		}

		return null;
	}
</script>

<div {id} class={className}>
	{#if !grouped && embeds && Array.isArray(embeds) && embeds.length > 0}
		<!-- Embed Mode: Show iframes without collapsible behavior -->
		<div class="py-1 w-full cursor-pointer">
			<div class="w-full text-xs text-gray-500">
				{toolName}
			</div>
			{#each embeds as embed, idx}
				<div class="my-2" id={`${componentId}-tool-call-embed-${idx}`}>
					<FullHeightIframe
						src={embed}
						{args}
						allowScripts={true}
						allowForms={$settings?.iframeSandboxAllowForms ?? false}
						allowSameOrigin={$settings?.iframeSandboxAllowSameOrigin ?? false}
						allowPopups={true}
					/>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Tool call display -->
		{#if grouped}
			<div
				class="w-full max-w-full rounded-[20px] border border-gray-100 dark:border-gray-850/60 bg-white/70 dark:bg-gray-900/40 transition {isExecuting
					? 'tool-call-running-border'
					: ''}"
			>
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="{buttonClassName} tool-call-trigger cursor-pointer px-3 py-3 hover:bg-white dark:hover:bg-gray-900/70 transition {open ? 'rounded-t-[20px]' : 'rounded-[20px]'}"
					on:pointerup={() => {
						open = !open;
					}}
				>
					<div class="w-full flex items-start gap-2.5">
						<div class="size-7 rounded-[8px] shrink-0 bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-300 flex items-center justify-center">
							{#if isExecuting}
								<Spinner className="size-4" />
							{:else if isDone}
								<div class={doneIconClass}>
									<svelte:component this={toolIcon} className="size-4" strokeWidth="2" />
								</div>
							{:else}
								<div class="text-gray-500 dark:text-gray-400">
									<WrenchSolid className="size-3.5" />
								</div>
							{/if}
						</div>

						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 min-w-0">
								<div class="line-clamp-1 text-sm font-medium text-gray-900 dark:text-gray-100">
									{toolName}
								</div>
							</div>

							<div class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1 {isExecuting ? 'shimmer' : ''}">
								{#if isExecuting}
									{toolPresentation.runningLabel} · {inputCountLabel}
								{:else if isDone}
									{toolPresentation.doneLabel} · {inputCountLabel}
								{:else}
									{$i18n.t('Ready to run')} · {toolName}
								{/if}
							</div>
						</div>

						<div class="flex shrink-0 self-center translate-y-px">
							{#if open}
								<ChevronUp strokeWidth="3.5" className="size-3.5" />
							{:else}
								<ChevronDown strokeWidth="3.5" className="size-3.5" />
							{/if}
						</div>
					</div>
				</div>

				{#if open}
					<div transition:slide={{ duration: 200, easing: quintOut, axis: 'y' }}>
						<div class="tool-call-expand p-2 border-t border-gray-100 dark:border-gray-850/60 bg-white/70 dark:bg-gray-900/40 rounded-b-[20px] space-y-2">
							<!-- Input -->
							{#if args}
								<div
									class="rounded-xl px-2.5 py-2 {detailBlockClass}"
								>
									<div
										class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
									>
										{toolPresentation.inputLabel}
									</div>

									{#if parsedArgs}
										{#if isNotesTool && noteInputPreview}
											<div class="rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2.5">
												<div class="text-[11px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300 mb-1">
													{noteInputPreview.title}
												</div>
												<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word leading-relaxed">
													{noteInputPreview.content}
												</div>
											</div>
										{:else if isCodeTool && codeInputSnippet}
											<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/40 overflow-hidden">
												<div class="px-2.5 py-1 border-b border-gray-100 dark:border-gray-800 text-[11px] uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
													Code
												</div>
												<pre class="px-2.5 py-2 text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono">{codeInputSnippet}</pre>
											</div>
										{:else}
											<div class="space-y-1">
												{#each argRows as row}
													{#if isPrimaryPayloadArg(getArgRowKey(row))}
														<div class="text-xs py-0.5 text-gray-700 dark:text-gray-200 break-all leading-relaxed">
															{getArgRowValue(row)}
														</div>
													{:else}
														<div class="flex gap-2 text-xs py-0.5 items-start">
															<span class="font-medium text-gray-600 dark:text-gray-300 shrink-0 px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
																>{getArgRowKey(row)}</span
															>
															<span class="text-gray-700 dark:text-gray-200 break-all pt-0.5"
																>{getArgRowValue(row)}</span
															>
														</div>
													{/if}
												{/each}
											</div>
										{/if}
									{:else}
										<div class="tool-call-body w-full max-w-none! rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
											<Markdown
												id={`${componentId}-tool-call-args`}
												content={`\`\`\`json\n${formatJSONString(args)}\n\`\`\``}
											/>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Output -->
							{#if isDone && result}
								<div
									class="rounded-xl px-2.5 py-2 {detailBlockClass}"
								>
									<div class="flex items-center justify-between gap-2 mb-1.5">
										<div class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
											{toolPresentation.outputLabel}
										</div>
										{#if showResultCount}
											<div class="text-[10px] text-gray-400 dark:text-gray-500">
												{$i18n.t('{{COUNT}} chars', { COUNT: resultLength.toLocaleString() })}
											</div>
										{/if}
									</div>
									<div class="w-full max-w-none! rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60">
										{#if failureInfo}
											<div class="px-3 py-2.5">
												<div class="flex flex-wrap items-center gap-2">
													<div class="inline-flex items-center rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/30 px-2 py-1 text-xs font-medium text-rose-700 dark:text-rose-300">
														{failureInfo.title}
													</div>
													<div class="text-xs text-rose-800 dark:text-rose-200 whitespace-pre-wrap wrap-break-word">
														{failureInfo.message}
													</div>
												</div>
												{#if failureInfo.details}
													<pre class="mt-2 text-[11px] text-rose-700 dark:text-rose-300 whitespace-pre-wrap wrap-break-word font-mono">{failureInfo.details}</pre>
												{/if}
											</div>
										{:else if isCurrentTimestampTool && currentTimestampDisplay}
											<div class="px-3 py-3">
												<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
													<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Current Time</div>
													<div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{currentTimestampDisplay.dateLabel}</div>
													<div class="text-xs text-gray-600 dark:text-gray-300 mt-0.5 font-mono">{currentTimestampDisplay.timeLabel}</div>
												</div>
											</div>
										{:else if isCalculateTimestampTool && calculateTimestampDiagram}
											<div class="px-3 py-2.5 overflow-x-auto">
												<div class="min-w-[560px] flex items-center gap-2">
												{#if calculateTimestampDiagram.isFuture}
													<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
														<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Result</div>
														<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.targetLabel}</div>
													</div>
													<div class="flex-1 min-w-[180px] px-1">
														<div class="text-[11px] text-center font-medium text-gray-600 dark:text-gray-300 mb-1">{calculateTimestampDiagram.relativeLabel}</div>
														<div class="h-px w-full bg-gray-300 dark:bg-gray-700"></div>
													</div>
													<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
														<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Current Date</div>
														<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.currentLabel}</div>
													</div>
												{:else}
													<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
														<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Current Date</div>
														<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.currentLabel}</div>
													</div>
													<div class="flex-1 min-w-[180px] px-1">
														<div class="text-[11px] text-center font-medium text-gray-600 dark:text-gray-300 mb-1">{calculateTimestampDiagram.relativeLabel}</div>
														<div class="h-px w-full bg-gray-300 dark:bg-gray-700"></div>
													</div>
													<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
														<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Result</div>
														<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.targetLabel}</div>
													</div>
												{/if}
												</div>
											</div>
										{:else if isSearchTool && hasSearchOutput}
											{#if searchWebResults.length > 0}
												<div class="divide-y divide-gray-100 dark:divide-gray-800">
													{#each searchWebResults as item, idx}
														{@const resultLink = getSearchResultLink(item)}
														{@const resultTitle = getSearchResultTitle(item)}
														{@const resultSnippet = getSearchResultSnippet(item)}
														<div class="px-3 py-2.5">
															<div class="text-[11px] uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
																Result {idx + 1}
															</div>
															{#if resultLink}
																<a
																	href={resultLink}
																	target="_blank"
																	rel="noopener noreferrer"
																	class="block text-xs text-emerald-700 dark:text-emerald-300 truncate"
																>
																	{resultLink}
																</a>
															{/if}
															{#if resultTitle}
																<div class="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
																	{resultTitle}
																</div>
															{/if}
															{#if resultSnippet}
																<div class="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap wrap-break-word">
																	{resultSnippet}
																</div>
															{/if}
														</div>
													{/each}
												</div>
											{:else}
												<div class="divide-y divide-gray-100 dark:divide-gray-800">
													{#each searchFallbackLines as line, idx}
														<div class="px-3 py-2.5">
															{#if line === 'No matches found.'}
																<div class="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
																	{line}
																</div>
															{:else}
																<div class="text-[11px] uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
																	Result {idx + 1}
																</div>
																<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
																	{line}
																</div>
															{/if}
														</div>
													{/each}
												</div>
											{/if}
										{:else if isMemoryTool && memoryItems.length > 0}
											<div class="divide-y divide-gray-100 dark:divide-gray-800">
												{#each memoryItems as memoryItem, idx}
													<div class="px-3 py-2.5">
														<div class="text-[11px] uppercase tracking-wide font-semibold text-sky-700 dark:text-sky-300 mb-1">
															{getMemoryItemTitle(memoryItem, idx)}
														</div>
														<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
															{getMemoryItemBody(memoryItem)}
														</div>
													</div>
												{/each}
											</div>
										{:else if isCodeTool && codeOutputBlocks.length > 0}
											<div class="divide-y divide-gray-100 dark:divide-gray-800">
												{#each codeOutputBlocks as block}
													<div class="px-3 py-2.5">
														<div class="text-[11px] uppercase tracking-wide font-semibold mb-1 {block.tone === 'error'
															? 'text-rose-700 dark:text-rose-300'
															: block.tone === 'success'
																? 'text-emerald-700 dark:text-emerald-300'
																: 'text-slate-700 dark:text-slate-300'}">
															{block.label}
														</div>
														<pre class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono">{block.value}</pre>
													</div>
												{/each}
											</div>
										{:else if isNotesTool && notePreview}
											<div class="px-3 py-2.5">
												<div class="text-[11px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300 mb-1">
													{notePreview.title}
												</div>
												<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
													{notePreview.content}
												</div>
											</div>
										{:else if isKnowledgeTool && knowledgeItems.length > 0}
											<div class="divide-y divide-gray-100 dark:divide-gray-800">
												{#each knowledgeItems as item}
													<div class="px-3 py-2.5">
														<div class="text-[11px] uppercase tracking-wide font-semibold text-cyan-700 dark:text-cyan-300 mb-1">
															{item.title}
														</div>
														{#if item.subtitle}
															<div class="text-[11px] text-cyan-600/90 dark:text-cyan-400/90 mb-1">
																{item.subtitle}
															</div>
														{/if}
														{#if item.content}
															<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
																{item.content}
															</div>
														{/if}
													</div>
												{/each}
											</div>
										{:else if isKnowledgeTool && knowledgeAnswer}
											<div class="px-3 py-2.5">
												<div class="text-[11px] uppercase tracking-wide font-semibold text-cyan-700 dark:text-cyan-300 mb-1">
													Answer
												</div>
												<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
													{knowledgeAnswer}
												</div>
											</div>
										{:else if isKnowledgeTool && knowledgeDocument}
											<div class="px-3 py-2.5">
												<div class="text-[11px] uppercase tracking-wide font-semibold text-cyan-700 dark:text-cyan-300 mb-1">
													Document
												</div>
												<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
													{knowledgeDocument}
												</div>
											</div>
										{:else if useCompactResult}
											<div class="px-3 py-2.5">
												<div class="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-emerald-950/30 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
													{getCompactResultText(parsedResult)}
												</div>
											</div>
										{:else if typeof parsedResult === 'object' && parsedResult !== null}
											<pre class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono p-2.5">{JSON.stringify(parsedResult, null, 2)}</pre>
										{:else}
											{@const resultStr = String(parsedResult)}
											{@const isTruncated = resultStr.length > RESULT_PREVIEW_LIMIT && !expandedResult}
											<pre class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono p-2.5">{isTruncated
												? resultStr.slice(0, RESULT_PREVIEW_LIMIT)
												: resultStr}</pre>
											{#if isTruncated}
												<button
													class="m-2 mt-0 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
													on:click|stopPropagation={() => {
														expandedResult = true;
													}}
												>
													{$i18n.t('Show all ({{COUNT}} characters)', {
														COUNT: resultStr.length.toLocaleString()
													})}
												</button>
											{/if}
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="w-full">
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="{buttonClassName} tool-call-trigger {INLINE_TOOL_TRIGGER_CLASS}"
					on:pointerup={() => {
						open = !open;
					}}
				>
					<div class="{INLINE_TOOL_ROW_CLASS} {isExecuting ? 'shimmer' : ''}">
						<div class="shrink-0 size-4 flex items-center justify-center">
						{#if isExecuting}
							<Spinner className="size-4" />
						{:else if isDone}
							<div class={doneIconClass}>
								<svelte:component this={toolIcon} className="size-4" strokeWidth="2" />
							</div>
						{:else}
							<div class="text-gray-400 dark:text-gray-500">
								<WrenchSolid className="size-3.5" />
							</div>
						{/if}
						</div>

						<div class={INLINE_TOOL_TITLE_CLASS}>
							{toolName}
						</div>

						<div class={INLINE_TOOL_CHEVRON_CLASS}>
							{#if open}
								<ChevronUp strokeWidth="3.5" className="size-3.5" />
							{:else}
								<ChevronDown strokeWidth="3.5" className="size-3.5" />
							{/if}
						</div>
					</div>
				</div>

				{#if open}
					<div transition:slide={{ duration: 160, easing: quintOut, axis: 'y' }} class="{INLINE_TOOL_ICON_CENTER_OFFSET_CLASS} mt-[-6px] h-3 -mb-[4px] w-px bg-gray-200 dark:bg-gray-800"></div>
				{/if}
				</div>

			{#if open}
				<div transition:slide={{ duration: 200, easing: quintOut, axis: 'y' }}>
					<div class="tool-call-expand rounded-[20px] border border-gray-100 dark:border-gray-850/60 bg-white/70 dark:bg-gray-900/40 p-2 space-y-2">
						<!-- Input -->
						{#if args}
							<div
								class="rounded-xl px-2.5 py-2 {detailBlockClass}"
							>
								<div
									class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
								>
									{toolPresentation.inputLabel}
								</div>

								{#if parsedArgs}
									{#if isNotesTool && noteInputPreview}
										<div class="rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2.5">
											<div class="text-[11px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300 mb-1">
												{noteInputPreview.title}
											</div>
											<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word leading-relaxed">
												{noteInputPreview.content}
											</div>
										</div>
									{:else if isCodeTool && codeInputSnippet}
										<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/40 overflow-hidden">
											<div class="px-2.5 py-1 border-b border-gray-100 dark:border-gray-800 text-[11px] uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
												Code
											</div>
											<pre class="px-2.5 py-2 text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono">{codeInputSnippet}</pre>
										</div>
									{:else}
										<div class="space-y-1">
											{#each argRows as row}
												{#if isPrimaryPayloadArg(getArgRowKey(row))}
													<div class="text-xs py-0.5 text-gray-700 dark:text-gray-200 break-all leading-relaxed">
														{getArgRowValue(row)}
													</div>
												{:else}
													<div class="flex gap-2 text-xs py-0.5 items-start">
														<span class="font-medium text-gray-600 dark:text-gray-300 shrink-0 px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
															>{getArgRowKey(row)}</span
														>
														<span class="text-gray-700 dark:text-gray-200 break-all pt-0.5"
															>{getArgRowValue(row)}</span
														>
													</div>
												{/if}
											{/each}
										</div>
									{/if}
								{:else}
									<div class="tool-call-body w-full max-w-none! rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
										<Markdown
											id={`${componentId}-tool-call-args`}
											content={`\`\`\`json\n${formatJSONString(args)}\n\`\`\``}
										/>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Output -->
						{#if isDone && result}
							<div
								class="rounded-xl px-2.5 py-2 {detailBlockClass}"
							>
								<div class="flex items-center justify-between gap-2 mb-1.5">
									<div class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
										{toolPresentation.outputLabel}
									</div>
									{#if showResultCount}
										<div class="text-[10px] text-gray-400 dark:text-gray-500">
											{$i18n.t('{{COUNT}} chars', { COUNT: resultLength.toLocaleString() })}
										</div>
									{/if}
								</div>
								<div class="w-full max-w-none! rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60">
									{#if failureInfo}
										<div class="px-3 py-2.5">
											<div class="flex flex-wrap items-center gap-2">
												<div class="inline-flex items-center rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/30 px-2 py-1 text-xs font-medium text-rose-700 dark:text-rose-300">
													{failureInfo.title}
												</div>
												<div class="text-xs text-rose-800 dark:text-rose-200 whitespace-pre-wrap wrap-break-word">
													{failureInfo.message}
												</div>
											</div>
											{#if failureInfo.details}
												<pre class="mt-2 text-[11px] text-rose-700 dark:text-rose-300 whitespace-pre-wrap wrap-break-word font-mono">{failureInfo.details}</pre>
											{/if}
										</div>
									{:else if isCurrentTimestampTool && currentTimestampDisplay}
										<div class="px-3 py-3">
											<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
												<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Current Time</div>
												<div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{currentTimestampDisplay.dateLabel}</div>
												<div class="text-xs text-gray-600 dark:text-gray-300 mt-0.5 font-mono">{currentTimestampDisplay.timeLabel}</div>
											</div>
										</div>
									{:else if isCalculateTimestampTool && calculateTimestampDiagram}
										<div class="px-3 py-2.5 overflow-x-auto">
											<div class="min-w-[560px] flex items-center gap-2">
											{#if calculateTimestampDiagram.isFuture}
												<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
													<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Result</div>
													<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.targetLabel}</div>
												</div>
												<div class="flex-1 min-w-[180px] px-1">
													<div class="text-[11px] text-center font-medium text-gray-600 dark:text-gray-300 mb-1">{calculateTimestampDiagram.relativeLabel}</div>
													<div class="h-px w-full bg-gray-300 dark:bg-gray-700"></div>
												</div>
												<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
													<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Current Date</div>
													<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.currentLabel}</div>
												</div>
											{:else}
												<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
													<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Current Date</div>
													<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.currentLabel}</div>
												</div>
												<div class="flex-1 min-w-[180px] px-1">
													<div class="text-[11px] text-center font-medium text-gray-600 dark:text-gray-300 mb-1">{calculateTimestampDiagram.relativeLabel}</div>
													<div class="h-px w-full bg-gray-300 dark:bg-gray-700"></div>
												</div>
												<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-2.5 py-2">
													<div class="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Result</div>
													<div class="text-sm text-gray-800 dark:text-gray-100 wrap-break-word">{calculateTimestampDiagram.targetLabel}</div>
												</div>
											{/if}
											</div>
										</div>
									{:else if isSearchTool && hasSearchOutput}
										{#if searchWebResults.length > 0}
											<div class="divide-y divide-gray-100 dark:divide-gray-800">
												{#each searchWebResults as item, idx}
													{@const resultLink = getSearchResultLink(item)}
													{@const resultTitle = getSearchResultTitle(item)}
													{@const resultSnippet = getSearchResultSnippet(item)}
													<div class="px-3 py-2.5">
														<div class="text-[11px] uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
															Result {idx + 1}
														</div>
														{#if resultLink}
															<a
																href={resultLink}
																target="_blank"
																rel="noopener noreferrer"
																class="block text-xs text-emerald-700 dark:text-emerald-300 truncate"
															>
																{resultLink}
															</a>
														{/if}
														{#if resultTitle}
															<div class="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
																{resultTitle}
															</div>
														{/if}
														{#if resultSnippet}
															<div class="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap wrap-break-word">
																{resultSnippet}
															</div>
														{/if}
													</div>
												{/each}
											</div>
										{:else}
											<div class="divide-y divide-gray-100 dark:divide-gray-800">
												{#each searchFallbackLines as line, idx}
													<div class="px-3 py-2.5">
														{#if line === 'No matches found.'}
															<div class="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
																{line}
															</div>
														{:else}
															<div class="text-[11px] uppercase tracking-wide font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
																Result {idx + 1}
															</div>
															<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
																{line}
															</div>
														{/if}
													</div>
												{/each}
											</div>
										{/if}
									{:else if isMemoryTool && memoryItems.length > 0}
										<div class="divide-y divide-gray-100 dark:divide-gray-800">
											{#each memoryItems as memoryItem, idx}
												<div class="px-3 py-2.5">
													<div class="text-[11px] uppercase tracking-wide font-semibold text-sky-700 dark:text-sky-300 mb-1">
														{getMemoryItemTitle(memoryItem, idx)}
													</div>
													<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
														{getMemoryItemBody(memoryItem)}
													</div>
												</div>
											{/each}
										</div>
									{:else if isCodeTool && codeOutputBlocks.length > 0}
										<div class="divide-y divide-gray-100 dark:divide-gray-800">
											{#each codeOutputBlocks as block}
												<div class="px-3 py-2.5">
													<div class="text-[11px] uppercase tracking-wide font-semibold mb-1 {block.tone === 'error'
														? 'text-rose-700 dark:text-rose-300'
														: block.tone === 'success'
															? 'text-emerald-700 dark:text-emerald-300'
															: 'text-slate-700 dark:text-slate-300'}">
														{block.label}
													</div>
													<pre class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono">{block.value}</pre>
												</div>
											{/each}
										</div>
									{:else if isNotesTool && notePreview}
										<div class="px-3 py-2.5">
											<div class="text-[11px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-300 mb-1">
												{notePreview.title}
											</div>
											<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
												{notePreview.content}
											</div>
										</div>
									{:else if isKnowledgeTool && knowledgeItems.length > 0}
										<div class="divide-y divide-gray-100 dark:divide-gray-800">
											{#each knowledgeItems as item}
												<div class="px-3 py-2.5">
													<div class="text-[11px] uppercase tracking-wide font-semibold text-cyan-700 dark:text-cyan-300 mb-1">
														{item.title}
													</div>
													{#if item.subtitle}
														<div class="text-[11px] text-cyan-600/90 dark:text-cyan-400/90 mb-1">
															{item.subtitle}
														</div>
													{/if}
													{#if item.content}
														<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
															{item.content}
														</div>
													{/if}
												</div>
											{/each}
										</div>
									{:else if isKnowledgeTool && knowledgeAnswer}
										<div class="px-3 py-2.5">
											<div class="text-[11px] uppercase tracking-wide font-semibold text-cyan-700 dark:text-cyan-300 mb-1">
												Answer
											</div>
											<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
												{knowledgeAnswer}
											</div>
										</div>
									{:else if isKnowledgeTool && knowledgeDocument}
										<div class="px-3 py-2.5">
											<div class="text-[11px] uppercase tracking-wide font-semibold text-cyan-700 dark:text-cyan-300 mb-1">
												Document
											</div>
											<div class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
												{knowledgeDocument}
											</div>
										</div>
									{:else if useCompactResult}
										<div class="px-3 py-2.5">
											<div class="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-emerald-950/30 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
												{getCompactResultText(parsedResult)}
											</div>
										</div>
									{:else if typeof parsedResult === 'object' && parsedResult !== null}
										<pre class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono p-2.5">{JSON.stringify(parsedResult, null, 2)}</pre>
									{:else}
										{@const resultStr = String(parsedResult)}
										{@const isTruncated = resultStr.length > RESULT_PREVIEW_LIMIT && !expandedResult}
										<pre class="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap wrap-break-word font-mono p-2.5">{isTruncated
											? resultStr.slice(0, RESULT_PREVIEW_LIMIT)
											: resultStr}</pre>
										{#if isTruncated}
											<button
												class="m-2 mt-0 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
												on:click|stopPropagation={() => {
													expandedResult = true;
												}}
											>
												{$i18n.t('Show all ({{COUNT}} characters)', {
													COUNT: resultStr.length.toLocaleString()
												})}
											</button>
										{/if}
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- Files display (images etc.) when done -->
	{#if isDone}
		{#if Array.isArray(files)}
			{#each files as file}
				{#if typeof file === 'string'}
					{#if file.startsWith('data:image/')}
						<Image src={file} alt="Image" />
					{/if}
				{:else if isImageFileObject(file)}
					{#if file.url}
						<Image src={file.url} alt="Image" />
					{/if}
				{/if}
			{/each}
		{/if}
	{/if}
</div>

<style>
	:global(.tool-call-body pre) {
		margin: 0;
	}

	.tool-call-running-border {
		box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.18);
	}

	:global(.dark) .tool-call-running-border {
		box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.22);
	}

	.tool-call-expand {
		animation: tool-call-expand-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes tool-call-expand-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
